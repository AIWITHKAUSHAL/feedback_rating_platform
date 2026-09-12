#!/usr/bin/env bash
#
# Create (or reset) the admin account in the deployed environment.
#
# The password is read interactively and passed to a one-off ECS task as an
# environment override, so it never lands in shell history, in the repository,
# or in a Terraform file.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
source scripts/lib.sh

require_prerequisites aws jq
require_aws_credentials

read -rp "Admin email: " ADMIN_EMAIL
[[ -n "$ADMIN_EMAIL" ]] || fail "An email address is required."
read -rsp "Admin password (min 8 characters, not echoed): " ADMIN_PASSWORD
echo
[[ ${#ADMIN_PASSWORD} -ge 8 ]] || fail "Password must be at least 8 characters."

CLUSTER="$(tf_output ecs_cluster_name)"
TASK_FAMILY="$(tf_output ecs_task_definition_family)"
SUBNET_IDS="$(terraform -chdir="$TERRAFORM_DIR" output -json ecs_task_subnets | jq -r 'join(",")')"
SECURITY_GROUP="$(tf_output ecs_task_security_group)"
CONTAINER_NAME="$(aws ecs describe-task-definition --task-definition "$TASK_FAMILY" \
  --query 'taskDefinition.containerDefinitions[0].name' --output text)"

OVERRIDES="$(jq -n \
  --arg name "$CONTAINER_NAME" \
  --arg email "$ADMIN_EMAIL" \
  --arg password "$ADMIN_PASSWORD" \
  '{containerOverrides:[{name:$name,
     command:["python","-m","app.scripts.create_admin"],
     environment:[{name:"ADMIN_EMAIL",value:$email},
                  {name:"ADMIN_PASSWORD",value:$password}]}]}')"

info "Creating the admin account on ECS..."
TASK_ARN="$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_FAMILY" \
  --launch-type FARGATE \
  --count 1 \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --overrides "$OVERRIDES" \
  --query 'tasks[0].taskArn' --output text)"
unset ADMIN_PASSWORD

aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$TASK_ARN"
EXIT_CODE="$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' --output text)"

[[ "$EXIT_CODE" == "0" ]] || fail "Admin creation task exited with code $EXIT_CODE"
ok "Admin account ready: $ADMIN_EMAIL"
info "Sign in at $(tf_output application_url)/admin/login"
