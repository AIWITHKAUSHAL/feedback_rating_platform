# ---------------------------------------------------------------------------
# Application Load Balancer: the only way into the ECS tasks.
# ---------------------------------------------------------------------------

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  # Keep destroy simple for a teaching environment.
  enable_deletion_protection = false
  idle_timeout               = 60
  drop_invalid_header_fields = true

  tags = { Name = "${local.name_prefix}-alb" }
}

resource "aws_lb_target_group" "backend" {
  name     = "${local.name_prefix}-tg"
  port     = local.container_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  # Fargate tasks with awsvpc networking register by IP.
  target_type = "ip"

  # /health is cheap and does not touch the database, so a brief RDS hiccup
  # cannot make the load balancer kill otherwise healthy tasks.
  health_check {
    enabled             = true
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # Give a stopping task time to finish in-flight requests.
  deregistration_delay = 15

  tags = { Name = "${local.name_prefix}-tg" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  tags = { Name = "${local.name_prefix}-listener" }
}
