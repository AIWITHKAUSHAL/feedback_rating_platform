# ---------------------------------------------------------------------------
# Outputs. The one that matters most is application_url.
# ---------------------------------------------------------------------------

output "application_url" {
  description = "Public application URL (React app + /api through CloudFront)."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_url" {
  description = "CloudFront distribution URL."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "Distribution id, used for cache invalidation during deployment."
  value       = aws_cloudfront_distribution.main.id
}

output "swagger_url" {
  description = "Interactive API documentation."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}/docs"
}

output "alb_dns_name" {
  description = "ALB hostname. Reachable only from CloudFront by design."
  value       = aws_lb.main.dns_name
}

output "frontend_bucket_name" {
  description = "Private S3 bucket holding the React build."
  value       = aws_s3_bucket.frontend.bucket
}

output "ecr_repository_url" {
  description = "ECR repository for the backend image."
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.backend.name
}

output "ecs_task_definition_family" {
  description = "Task definition family, used when running migrations."
  value       = aws_ecs_task_definition.backend.family
}

output "ecs_task_subnets" {
  description = "Subnets used when running a one-off task (migrations, seeding)."
  value       = aws_subnet.public[*].id
}

output "ecs_task_security_group" {
  description = "Security group used when running a one-off task."
  value       = aws_security_group.ecs_tasks.id
}

output "rds_endpoint" {
  description = "RDS endpoint. Private - only reachable from the ECS security group."
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "database_url_secret_arn" {
  description = "Secrets Manager ARN holding the database connection URL."
  value       = aws_secretsmanager_secret.database_url.arn
  sensitive   = true
}

output "jwt_secret_arn" {
  description = "Secrets Manager ARN holding the JWT signing key."
  value       = aws_secretsmanager_secret.jwt.arn
  sensitive   = true
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group receiving container logs."
  value       = aws_cloudwatch_log_group.backend.name
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name."
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "github_actions_role_arn" {
  description = "Role ARN for the GitHub Actions OIDC trust (empty if not configured)."
  value       = local.github_enabled ? aws_iam_role.github_actions[0].arn : ""
}

output "aws_region" {
  description = "Region everything was created in."
  value       = var.aws_region
}

output "aws_account_id" {
  description = "AWS account containing this deployment (used by scoped destroy verification)."
  value       = data.aws_caller_identity.current.account_id
}

output "project_name" {
  description = "Project tag value used by scoped destroy verification."
  value       = var.project_name
}

output "environment" {
  description = "Environment tag value used by scoped destroy verification."
  value       = var.environment
}

output "name_prefix" {
  description = "Prefix shared by named resources (used by scoped destroy verification)."
  value       = local.name_prefix
}

output "github_oidc_provider_arn" {
  description = "OIDC provider created by this stack; empty when disabled or externally managed."
  value = local.github_enabled && var.create_github_oidc_provider ? (
    aws_iam_openid_connect_provider.github[0].arn
  ) : ""
}
