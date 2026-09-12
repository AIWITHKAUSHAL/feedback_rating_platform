# ---------------------------------------------------------------------------
# Input variables. Copy terraform.tfvars.example to terraform.tfvars to
# override any of these for your own deployment.
# ---------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for every resource."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name, used for resource names and tags."
  type        = string
  default     = "coursepulse"
}

variable "environment" {
  description = "Deployment environment (dev/staging/prod). Part of resource names."
  type        = string
  default     = "dev"
}

variable "owner_tag" {
  description = "Value of the Owner tag."
  type        = string
  default     = "CourseFeedbackAssignment"
}

# ------------------------------------------------------------------ network
variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDRs for the public subnets (ALB and ECS tasks)."
  type        = list(string)
  default     = ["10.20.1.0/24", "10.20.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDRs for the private subnets (RDS only, no internet route)."
  type        = list(string)
  default     = ["10.20.11.0/24", "10.20.12.0/24"]
}

# --------------------------------------------------------------------- ecs
variable "container_image_tag" {
  description = <<-EOT
    Image tag in ECR to deploy. CI sets this to the Git commit SHA;
    scripts/deploy.sh passes the SHA it just pushed.
  EOT
  type        = string
  default     = "latest"
}

variable "task_cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU). Smallest viable for FastAPI."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of ECS tasks to run. Keep at 1 for a low-cost demo."
  type        = number
  default     = 1
}

variable "enable_autoscaling" {
  description = "Whether to create the ECS Application Auto Scaling target and policy."
  type        = bool
  default     = true
}

variable "autoscaling_min_capacity" {
  description = "Minimum ECS task count when autoscaling is enabled."
  type        = number
  default     = 1
}

variable "autoscaling_max_capacity" {
  description = "Maximum ECS task count when autoscaling is enabled."
  type        = number
  default     = 3
}

variable "autoscaling_cpu_target" {
  description = "Average CPU percentage the scaling policy aims to hold."
  type        = number
  default     = 60
}

# --------------------------------------------------------------------- rds
variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro is the cheapest Graviton option."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GiB (20 is the minimum for gp3)."
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL major version."
  type        = string
  default     = "16"
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "coursepulse"
}

variable "db_username" {
  description = "Master username. The password is generated and stored in Secrets Manager."
  type        = string
  default     = "coursepulse"
}

variable "db_backup_retention_days" {
  description = "Automated backup retention. 1 day keeps the demo cheap; raise for production."
  type        = number
  default     = 1
}

variable "db_deletion_protection" {
  description = <<-EOT
    Protect the database from deletion. FALSE by default so `terraform destroy`
    works for this teaching project - set to true for anything real.
  EOT
  type        = bool
  default     = false
}

# ----------------------------------------------------------------- logging
variable "log_retention_days" {
  description = "CloudWatch log retention. Short by design to control cost."
  type        = number
  default     = 7
}

# ------------------------------------------------------------------- github
variable "github_repository" {
  description = <<-EOT
    GitHub repository allowed to assume the deployment role, as "owner/repo".
    Leave empty to skip creating the OIDC role entirely.
  EOT
  type        = string
  default     = ""
}

variable "create_github_oidc_provider" {
  description = <<-EOT
    Create the GitHub OIDC provider. Set to false if the account already has
    token.actions.githubusercontent.com registered (only one is allowed).
  EOT
  type        = bool
  default     = true
}

variable "github_oidc_subject_prefix" {
  description = <<-EOT
    Exact OIDC subject prefix GitHub sends, for organisations that use
    immutable subjects (e.g. "repo:owner@123/repo@456"). Leave empty to use
    "repo:<github_repository>". Find it with:
    gh api repos/OWNER/REPO/actions/oidc/customization/sub
  EOT
  type        = string
  default     = ""
}

variable "app_log_level" {
  description = "LOG_LEVEL passed to the container."
  type        = string
  default     = "INFO"
}

variable "access_token_expire_minutes" {
  description = "Admin JWT lifetime in minutes."
  type        = number
  default     = 60
}
