#!/usr/bin/env bash
#
# Destroy the CoursePulse AWS resources - and only those.
#
#   ./scripts/destroy.sh
#
# Terraform destroys the resources in its state. Afterwards this script also
# removes historical ECS task-definition revisions and requires two consecutive
# clean verification passes against both Terraform state and the AWS APIs.
#
# No broad "delete all resources of type X" commands are used anywhere here.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
source scripts/lib.sh

require_prerequisites aws terraform
require_aws_credentials

if ! terraform -chdir="$TERRAFORM_DIR" output application_url >/dev/null 2>&1; then
  warn "No Terraform state found - there may be nothing to destroy."
fi

BUCKET="$(terraform -chdir="$TERRAFORM_DIR" output -raw frontend_bucket_name 2>/dev/null || true)"
DISTRIBUTION_ID="$(terraform -chdir="$TERRAFORM_DIR" output -raw cloudfront_distribution_id 2>/dev/null || true)"
OIDC_PROVIDER_ARN="$(terraform -chdir="$TERRAFORM_DIR" output -raw github_oidc_provider_arn 2>/dev/null || true)"
AWS_REGION="$(terraform -chdir="$TERRAFORM_DIR" output -raw aws_region 2>/dev/null || printf '%s' "${TF_VAR_aws_region:-us-east-1}")"
AWS_ACCOUNT_ID="$(terraform -chdir="$TERRAFORM_DIR" output -raw aws_account_id 2>/dev/null || aws sts get-caller-identity --query Account --output text)"
PROJECT_NAME="$(terraform -chdir="$TERRAFORM_DIR" output -raw project_name 2>/dev/null || printf '%s' "${TF_VAR_project_name:-coursepulse}")"
ENVIRONMENT="$(terraform -chdir="$TERRAFORM_DIR" output -raw environment 2>/dev/null || printf '%s' "${TF_VAR_environment:-dev}")"
NAME_PREFIX="$(terraform -chdir="$TERRAFORM_DIR" output -raw name_prefix 2>/dev/null || printf '%s-%s' "$PROJECT_NAME" "$ENVIRONMENT")"
TASK_FAMILY="${NAME_PREFIX}-backend"

readonly BUCKET DISTRIBUTION_ID OIDC_PROVIDER_ARN AWS_REGION AWS_ACCOUNT_ID
readonly PROJECT_NAME ENVIRONMENT NAME_PREFIX TASK_FAMILY

readonly REQUIRED_CLEAN_PASSES=2
readonly MAX_VERIFY_ATTEMPTS="${DESTROY_MAX_VERIFY_ATTEMPTS:-6}"
readonly VERIFY_DELAY_SECONDS="${DESTROY_VERIFY_DELAY_SECONDS:-15}"
[[ "$MAX_VERIFY_ATTEMPTS" =~ ^[2-9][0-9]*$ ]] || fail "DESTROY_MAX_VERIFY_ATTEMPTS must be an integer of at least 2."
[[ "$VERIFY_DELAY_SECONDS" =~ ^[0-9]+$ ]] || fail "DESTROY_VERIFY_DELAY_SECONDS must be a non-negative integer."

cat <<WARNING

$(printf '\033[1;33mThis will permanently delete the CoursePulse dev environment:\033[0m')

  - ECS service, task definitions and cluster
  - Application Load Balancer and target group
  - CloudFront distribution
  - S3 frontend bucket${BUCKET:+ ($BUCKET)} and its contents
  - ECR repository and all images
  - RDS PostgreSQL instance AND ALL STORED COURSES AND REVIEWS
  - Secrets Manager entries, IAM roles, VPC, CloudWatch logs and dashboard

Only resources identified by this Terraform state or the exact CoursePulse
project identifiers above are touched. Nothing else in the account is affected.

WARNING

read -rp "Type 'destroy' to continue: " CONFIRMATION
[[ "$CONFIRMATION" == "destroy" ]] || { info "Cancelled - nothing was deleted."; exit 0; }

# Terraform cannot delete a bucket that still contains objects/versions.
# force_destroy = true handles this, but emptying first makes the failure mode
# obvious if that setting is ever changed.
if [[ -n "$BUCKET" ]] && aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  info "Emptying s3://$BUCKET (this project's bucket only)"
  aws s3 rm "s3://$BUCKET" --recursive >/dev/null || warn "could not empty the bucket"
  ok "bucket emptied"
fi

info "Running terraform destroy"
terraform -chdir="$TERRAFORM_DIR" destroy -input=false -auto-approve

# Terraform deregisters its ECS task-definition revision, but older inactive
# revisions can outlive the state. Delete every revision in this exact family.
info "Removing historical ECS task-definition revisions for $TASK_FAMILY"
while IFS= read -r task_definition; do
  [[ -n "$task_definition" && "$task_definition" != "None" ]] || continue
  [[ "$task_definition" == */"$TASK_FAMILY":* ]] || continue
  aws ecs deregister-task-definition --region "$AWS_REGION" \
    --task-definition "$task_definition" >/dev/null
done < <(aws ecs list-task-definitions --region "$AWS_REGION" \
  --family-prefix "$TASK_FAMILY" --status ACTIVE \
  --query 'taskDefinitionArns[]' --output text | tr '\t' '\n')

while IFS= read -r task_definition; do
  [[ -n "$task_definition" && "$task_definition" != "None" ]] || continue
  [[ "$task_definition" == */"$TASK_FAMILY":* ]] || continue
  aws ecs delete-task-definitions --region "$AWS_REGION" \
    --task-definitions "$task_definition" >/dev/null
done < <(aws ecs list-task-definitions --region "$AWS_REGION" \
  --family-prefix "$TASK_FAMILY" --status INACTIVE \
  --query 'taskDefinitionArns[]' --output text | tr '\t' '\n')

declare -a REMAINING=()

check_output_empty() {
  local label="$1"
  shift
  local output
  if ! output="$("$@" 2>&1)"; then
    REMAINING+=("verification error for $label: $output")
    return
  fi
  output="${output//$'\t'/}"
  output="${output//$'\n'/}"
  [[ -z "$output" || "$output" == "None" ]] || REMAINING+=("$label: $output")
}

verify_destroyed() {
  REMAINING=()

  check_output_empty "Terraform state" \
    terraform -chdir="$TERRAFORM_DIR" state list
  check_output_empty "tagged AWS resources" \
    aws resourcegroupstaggingapi get-resources --region "$AWS_REGION" \
      --tag-filters "Key=Project,Values=$PROJECT_NAME" "Key=Environment,Values=$ENVIRONMENT" \
      --query 'ResourceTagMappingList[].ResourceARN' --output text

  # Direct service checks cover untagged resource types and protect against a
  # missing/removed tag. Every query is exact-name or an ID captured from state.
  check_output_empty "VPCs" aws ec2 describe-vpcs --region "$AWS_REGION" \
    --filters "Name=tag:Name,Values=${NAME_PREFIX}-vpc" \
    --query 'Vpcs[].VpcId' --output text
  check_output_empty "load balancers" aws elbv2 describe-load-balancers --region "$AWS_REGION" \
    --query "LoadBalancers[?LoadBalancerName=='${NAME_PREFIX}-alb'].LoadBalancerArn" --output text
  check_output_empty "target groups" aws elbv2 describe-target-groups --region "$AWS_REGION" \
    --query "TargetGroups[?TargetGroupName=='${NAME_PREFIX}-tg'].TargetGroupArn" --output text
  check_output_empty "ECS clusters" aws ecs list-clusters --region "$AWS_REGION" \
    --query "clusterArns[?ends_with(@, ':cluster/${NAME_PREFIX}-cluster')]" --output text
  check_output_empty "active ECS task definitions" aws ecs list-task-definitions --region "$AWS_REGION" \
    --family-prefix "$TASK_FAMILY" --status ACTIVE \
    --query "taskDefinitionArns[?contains(@, ':task-definition/${TASK_FAMILY}:')]" --output text
  check_output_empty "inactive ECS task definitions" aws ecs list-task-definitions --region "$AWS_REGION" \
    --family-prefix "$TASK_FAMILY" --status INACTIVE \
    --query "taskDefinitionArns[?contains(@, ':task-definition/${TASK_FAMILY}:')]" --output text
  check_output_empty "ECS task-definition family (including deletion in progress)" \
    aws ecs list-task-definition-families --region "$AWS_REGION" \
      --family-prefix "$TASK_FAMILY" --query "families[?@=='${TASK_FAMILY}']" --output text
  check_output_empty "ECR repositories" aws ecr describe-repositories --region "$AWS_REGION" \
    --query "repositories[?repositoryName=='${NAME_PREFIX}-backend'].repositoryArn" --output text
  check_output_empty "RDS instances" aws rds describe-db-instances --region "$AWS_REGION" \
    --query "DBInstances[?DBInstanceIdentifier=='${NAME_PREFIX}-postgres'].DBInstanceArn" --output text
  check_output_empty "RDS snapshots" aws rds describe-db-snapshots --region "$AWS_REGION" \
    --query "DBSnapshots[?DBInstanceIdentifier=='${NAME_PREFIX}-postgres'].DBSnapshotArn" --output text
  check_output_empty "RDS retained automated backups" \
    aws rds describe-db-instance-automated-backups --region "$AWS_REGION" \
      --query "DBInstanceAutomatedBackups[?DBInstanceIdentifier=='${NAME_PREFIX}-postgres'].DBInstanceArn" \
      --output text
  check_output_empty "Secrets Manager secrets" aws secretsmanager list-secrets --region "$AWS_REGION" \
    --include-planned-deletion \
    --query "SecretList[?starts_with(Name, '${NAME_PREFIX}/')].ARN" --output text
  check_output_empty "CloudWatch log groups" aws logs describe-log-groups --region "$AWS_REGION" \
    --log-group-name-prefix "/ecs/${NAME_PREFIX}-backend" \
    --query "logGroups[?logGroupName=='/ecs/${NAME_PREFIX}-backend'].arn" --output text
  check_output_empty "CloudWatch dashboards" aws cloudwatch list-dashboards --region "$AWS_REGION" \
    --dashboard-name-prefix "${NAME_PREFIX}-overview" \
    --query "DashboardEntries[?DashboardName=='${NAME_PREFIX}-overview'].DashboardName" --output text
  check_output_empty "CloudWatch alarms" aws cloudwatch describe-alarms --region "$AWS_REGION" \
    --alarm-name-prefix "$NAME_PREFIX-" --query 'MetricAlarms[].AlarmArn' --output text
  check_output_empty "Application Auto Scaling targets" \
    aws application-autoscaling describe-scalable-targets --region "$AWS_REGION" \
      --service-namespace ecs \
      --query "ScalableTargets[?ResourceId=='service/${NAME_PREFIX}-cluster/${NAME_PREFIX}-backend'].ResourceId" \
      --output text
  check_output_empty "IAM roles" aws iam list-roles \
    --query "Roles[?RoleName=='${NAME_PREFIX}-ecs-execution' || RoleName=='${NAME_PREFIX}-ecs-task' || RoleName=='${NAME_PREFIX}-github-actions'].Arn" \
    --output text

  if [[ -n "$BUCKET" ]]; then
    check_output_empty "S3 frontend bucket" aws s3api list-buckets \
      --query "Buckets[?Name=='$BUCKET'].Name" --output text
  fi
  if [[ -n "$DISTRIBUTION_ID" ]]; then
    check_output_empty "CloudFront distribution" aws cloudfront list-distributions \
      --query "DistributionList.Items[?Id=='$DISTRIBUTION_ID'].Id" --output text
  fi
  if [[ -n "$OIDC_PROVIDER_ARN" ]]; then
    check_output_empty "managed GitHub OIDC provider" aws iam list-open-id-connect-providers \
      --query "OpenIDConnectProviderList[?Arn=='$OIDC_PROVIDER_ARN'].Arn" --output text
  fi
}

clean_passes=0
for ((attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++)); do
  info "AWS deletion verification pass $attempt/$MAX_VERIFY_ATTEMPTS"
  verify_destroyed
  if ((${#REMAINING[@]} == 0)); then
    ((clean_passes += 1))
    ok "Clean verification $clean_passes/$REQUIRED_CLEAN_PASSES: no CoursePulse resources found"
    ((clean_passes == REQUIRED_CLEAN_PASSES)) && break
  else
    clean_passes=0
    warn "Resources or verification errors remain:"
    printf '    - %s\n' "${REMAINING[@]}" >&2
  fi
  ((attempt < MAX_VERIFY_ATTEMPTS)) && sleep "$VERIFY_DELAY_SECONDS"
done

if ((clean_passes < REQUIRED_CLEAN_PASSES)); then
  fail "Destroy could not be confirmed twice. Review the items above; do not assume billing has stopped."
fi

ok "All CoursePulse resources are destroyed and AWS returned two consecutive clean checks."
info "Verified account $AWS_ACCOUNT_ID, region $AWS_REGION, project $PROJECT_NAME, environment $ENVIRONMENT."
