# ---------------------------------------------------------------------------
# ECS on Fargate: one stateless FastAPI container behind the ALB.
# ---------------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name = "containerInsights"
    # Container Insights is billed per metric; the dashboard uses the free
    # CloudWatch metrics instead.
    value = "disabled"
  }

  tags = { Name = "${local.name_prefix}-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
  }
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    # The image is built for amd64 in CI; keep the platform explicit.
    cpu_architecture = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = local.container_name
      image     = "${aws_ecr_repository.backend.repository_url}:${var.container_image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = local.container_port
          protocol      = "tcp"
        }
      ]

      # Non-sensitive configuration.
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "LOG_LEVEL", value = var.app_log_level },
        {
          name  = "ACCESS_TOKEN_EXPIRE_MINUTES"
          value = tostring(var.access_token_expire_minutes)
        },
        # The SPA and the API share the CloudFront origin, so browser requests
        # are same-origin. This value only matters for direct/other callers.
        {
          name  = "CORS_ORIGINS"
          value = "https://${aws_cloudfront_distribution.main.domain_name}"
        },
      ]

      # Sensitive configuration is fetched from Secrets Manager by the ECS
      # agent and never appears in the task definition or in logs.
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt.arn
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "python -c \"import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 15
      }
    }
  ])

  tags = { Name = "${local.name_prefix}-backend-task" }
}

resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  # Rolling deployment with a circuit breaker: a broken image rolls back
  # automatically instead of leaving the service down.
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  health_check_grace_period_seconds  = 60
  wait_for_steady_state              = false

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets         = aws_subnet.public[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
    # Needed for outbound ECR / CloudWatch / Secrets Manager access without a
    # NAT Gateway. Inbound is still restricted to the ALB security group.
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = local.container_name
    container_port   = local.container_port
  }

  lifecycle {
    # CI deploys a new task definition revision directly; Terraform should not
    # fight it or reset the count chosen by autoscaling.
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]

  tags = { Name = "${local.name_prefix}-backend-service" }
}
