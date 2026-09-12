# ---------------------------------------------------------------------------
# CoursePulse infrastructure - entry point and file map.
#
# The stack is deliberately written as flat, readable files rather than
# modules: for a teaching project, being able to open one file per AWS service
# is worth more than abstraction.
#
#   versions.tf        Terraform and provider constraints, state guidance
#   providers.tf       AWS provider and the default tags applied to everything
#   variables.tf       All inputs (see terraform.tfvars.example)
#   locals.tf          Naming prefix, AZ selection, shared values
#   network.tf         VPC, subnets, internet gateway, route tables
#   security_groups.tf CloudFront -> ALB -> ECS -> RDS chain
#   s3.tf              Private frontend bucket (+ OAC bucket policy)
#   cloudfront.tf      Single distribution: /* -> S3, /api/* -> ALB
#   alb.tf             Load balancer, target group, listener
#   ecr.tf             Backend image repository and lifecycle policy
#   ecs.tf             Cluster, task definition, service
#   autoscaling.tf     Optional ECS target tracking autoscaling
#   rds.tf             Private single-AZ PostgreSQL
#   secrets.tf         Generated DB password and JWT key in Secrets Manager
#   iam.tf             ECS execution and task roles
#   github_oidc.tf     Keyless GitHub Actions deployment role
#   cloudwatch.tf      Log group, dashboard, 5XX alarm
#   outputs.tf         Application URL and everything the scripts need
#
# Request flow:
#
#   Browser -> CloudFront -> S3            (React static files)
#   Browser -> CloudFront -> ALB -> ECS    (FastAPI) -> RDS PostgreSQL
#
# Cost shape (us-east-1, rough): Fargate 0.25 vCPU task ~$9/mo, ALB ~$16/mo,
# db.t4g.micro ~$12/mo, S3 + CloudFront pennies at demo traffic, Secrets
# Manager ~$0.80/mo. There is no NAT Gateway, no Multi-AZ and no WAF.
#
# ALWAYS run `terraform destroy` (or `make destroy`) when finished.
# ---------------------------------------------------------------------------
