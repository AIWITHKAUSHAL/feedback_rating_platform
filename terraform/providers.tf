# AWS provider. Credentials come from the environment, an AWS profile or the
# GitHub Actions OIDC role - never from this repository.
provider "aws" {
  region = var.aws_region

  # Every taggable resource inherits these, which is what makes the scoped
  # destroy in scripts/destroy.sh safe.
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner_tag
    }
  }
}
