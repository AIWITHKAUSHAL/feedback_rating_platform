locals {
  # Every resource name starts with this, so the whole stack is easy to spot
  # in the console and easy to scope a destroy to.
  name_prefix = "${var.project_name}-${var.environment}"

  # Two AZs: required by both the ALB and the RDS subnet group, even though the
  # database itself is single-AZ.
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)

  container_name = "${local.name_prefix}-backend"
  container_port = 8000

  # Path patterns CloudFront must send to the ALB rather than to S3.
  api_path_patterns = ["/api/*", "/health", "/health/*", "/docs", "/openapi.json", "/redoc"]
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
