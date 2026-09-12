# ---------------------------------------------------------------------------
# IAM roles for ECS, kept to least privilege.
#
#   execution role - used by the ECS agent: pull the image, write logs, read
#                    the two secrets this task actually needs.
#   task role      - used by the application itself. CoursePulse talks only to
#                    PostgreSQL, so it needs no AWS permissions at all.
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json

  tags = { Name = "${local.name_prefix}-ecs-execution" }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Scoped to the exact secret ARNs - not secretsmanager:* on all resources.
data "aws_iam_policy_document" "ecs_read_secrets" {
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.database_url.arn,
      aws_secretsmanager_secret.jwt.arn,
    ]
  }
}

resource "aws_iam_role_policy" "ecs_read_secrets" {
  name   = "${local.name_prefix}-read-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_read_secrets.json
}

resource "aws_iam_role" "ecs_task" {
  name               = "${local.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json

  tags = { Name = "${local.name_prefix}-ecs-task" }
}
