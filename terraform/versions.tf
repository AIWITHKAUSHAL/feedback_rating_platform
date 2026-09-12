# Provider and Terraform version constraints.
terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Local state is acceptable for this training deployment. A real team should
  # move to a protected remote backend so state is shared, locked and
  # versioned - uncomment and create the bucket/table first:
  #
  # backend "s3" {
  #   bucket       = "coursepulse-tfstate-<account-id>"
  #   key          = "dev/terraform.tfstate"
  #   region       = "us-east-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}
