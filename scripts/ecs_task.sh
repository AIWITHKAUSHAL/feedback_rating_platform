#!/usr/bin/env bash
#
# Run a one-off command inside the deployed backend image on ECS/Fargate.
#
# Used for database work that must happen from inside the VPC, because RDS has
# no public endpoint:
#
#   ./scripts/ecs_task.sh alembic upgrade head
#   ./scripts/ecs_task.sh python -m app.scripts.seed
#
# The task uses the same task definition as the service (same image, same
# secrets), so it connects to the database exactly as the API does.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
source scripts/lib.sh

[[ $# -gt 0 ]] || fail "Usage: $0 <command> [args...]   e.g. $0 alembic upgrade head"

require_prerequisites aws jq
require_aws_credentials

CLUSTER="$(tf_output ecs_cluster_name)"
TASK_FAMILY="$(tf_output ecs_task_definition_family)"
SUBNET_IDS="${ECS_TASK_SUBNETS:-$(terraform -chdir="$TERRAFORM_DIR" output -json ecs_task_subnets | jq -r 'join(",")')}"
SECURITY_GROUP="$(tf_output ecs_task_security_group)"
LOG_GROUP="$(tf_output cloudwatch_log_group)"
CONTAINER_NAME="$(aws ecs describe-task-definition --task-definition "$TASK_FAMILY" \
  --query 'taskDefinition.containerDefinitions[0].name' --output text)"

COMMAND_JSON="$(printf '%s\n' "$@" | jq -R . | jq -s .)"

info "Running on ECS: $*"
TASK_ARN="$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_FAMILY" \
  --launch-type FARGATE \
  --count 1 \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --overrides "{\"containerOverrides\":[{\"name\":\"$CONTAINER_NAME\",\"command\":$COMMAND_JSON}]}" \
  --query 'tasks[0].taskArn' --output text)"

[[ "$TASK_ARN" != "None" && -n "$TASK_ARN" ]] || fail "ECS did not start the task."
TASK_ID="${TASK_ARN##*/}"
ok "task started: $TASK_ID"

info "Waiting for the task to finish..."
aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$TASK_ARN"

EXIT_CODE="$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' --output text)"
STOP_REASON="$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].stoppedReason' --output text)"

info "Task output:"
aws logs get-log-events \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "backend/$CONTAINER_NAME/$TASK_ID" \
  --query 'events[].message' --output text 2>/dev/null | sed 's/^/    /' || warn "no log events yet"

if [[ "$EXIT_CODE" != "0" ]]; then
  fail "Task exited with code $EXIT_CODE (${STOP_REASON})"
fi
ok "Command completed successfully."
