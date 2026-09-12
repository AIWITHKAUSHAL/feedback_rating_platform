#!/usr/bin/env bash
#
# Deploy CoursePulse to AWS.
#
#   ./scripts/deploy.sh            # full deployment
#   SKIP_TESTS=1 ./scripts/deploy.sh
#   SEED=1 ./scripts/deploy.sh     # also load demo data (idempotent)
#
# Steps:
#   1.  verify prerequisites and AWS credentials
#   2.  validate Terraform
#   3.  create the ECR repository first (the task definition needs an image)
#   4.  run backend and frontend tests
#   5.  build and push the backend image, tagged with the Git SHA
#   6.  apply the rest of the infrastructure with that tag
#   7.  wait for the ECS service to stabilise
#   8.  run `alembic upgrade head` as a one-off task
#   9.  optionally run the idempotent seed
#   10. build the React app and sync it to the private S3 bucket
#   11. invalidate the CloudFront cache
#   12. verify the deployment and print the application URL
#
# Fails fast: any step that errors stops the deployment.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
source scripts/lib.sh

SKIP_TESTS="${SKIP_TESTS:-0}"
SEED="${SEED:-0}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# --------------------------------------------------------- 1. prerequisites
info "Step 1/12 - checking prerequisites"
require_prerequisites aws terraform docker jq npm node python3 git
require_aws_credentials
docker info >/dev/null 2>&1 || fail "Docker is not running."
ok "all prerequisites present"

IMAGE_TAG="$(git_sha)"
info "Deploying commit $IMAGE_TAG to region $AWS_REGION"

# ------------------------------------------------------------ 2. terraform
info "Step 2/12 - validating Terraform"
terraform -chdir="$TERRAFORM_DIR" init -input=false >/dev/null
terraform -chdir="$TERRAFORM_DIR" fmt -check -recursive >/dev/null ||
  fail "Terraform files are not formatted. Run: terraform -chdir=terraform fmt -recursive"
terraform -chdir="$TERRAFORM_DIR" validate >/dev/null
ok "terraform fmt + validate passed"

# ----------------------------------------------------------------- 3. ecr
# The ECS task definition references an image in ECR, so the repository has to
# exist (and hold an image) before the full apply.
info "Step 3/12 - ensuring the ECR repository exists"
terraform -chdir="$TERRAFORM_DIR" apply -input=false -auto-approve \
  -target=aws_ecr_repository.backend >/dev/null
ECR_URL="$(tf_output ecr_repository_url)"
ok "ECR repository: $ECR_URL"

# --------------------------------------------------------------- 4. tests
if [[ "$SKIP_TESTS" == "1" ]]; then
  warn "Step 4/12 - tests skipped (SKIP_TESTS=1)"
else
  info "Step 4/12 - running tests"
  make test-backend
  make test-frontend
  ok "all tests passed"
fi

# --------------------------------------------------------- 5. build + push
info "Step 5/12 - building and pushing the backend image"
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "${ECR_URL%%/*}" >/dev/null
# linux/amd64 explicitly: the Fargate task definition declares X86_64, and a
# local arm64 build would not run there.
docker build --platform linux/amd64 -t "$ECR_URL:$IMAGE_TAG" -t "$ECR_URL:latest" backend
docker push --quiet "$ECR_URL:$IMAGE_TAG"
docker push --quiet "$ECR_URL:latest"
ok "pushed $ECR_URL:$IMAGE_TAG"

# ----------------------------------------------------------- 6. infra apply
info "Step 6/12 - applying the infrastructure"
terraform -chdir="$TERRAFORM_DIR" apply -input=false -auto-approve \
  -var "container_image_tag=$IMAGE_TAG"
ok "infrastructure up to date"

CLUSTER="$(tf_output ecs_cluster_name)"
SERVICE="$(tf_output ecs_service_name)"
BUCKET="$(tf_output frontend_bucket_name)"
DISTRIBUTION_ID="$(tf_output cloudfront_distribution_id)"
APP_URL="$(tf_output application_url)"

# ------------------------------------------------------- 7. deploy the image
# `ignore_changes = [task_definition]` on the service means Terraform does not
# roll the service, so the deployment does it explicitly here.
info "Step 7/12 - rolling the ECS service onto the new image"
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" \
  --task-definition "$(tf_output ecs_task_definition_family)" \
  --force-new-deployment >/dev/null
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE"
ok "ECS service is stable"

# ------------------------------------------------------------ 8. migrations
# Versioned and forward-only: existing courses and reviews are never dropped.
info "Step 8/12 - applying database migrations"
./scripts/ecs_task.sh alembic upgrade head
ok "database schema is current"

# ------------------------------------------------------------------ 9. seed
if [[ "$SEED" == "1" ]]; then
  info "Step 9/12 - seeding demo data (idempotent)"
  ./scripts/ecs_task.sh python -m app.scripts.seed
else
  info "Step 9/12 - seed skipped (run with SEED=1 on first deployment)"
fi

# -------------------------------------------------------- 10. frontend build
info "Step 10/12 - building and uploading the React application"
# Empty base URL: the SPA calls /api on its own CloudFront origin.
(cd frontend && VITE_API_BASE_URL="" npm run build)

# Hashed assets can be cached for a year; index.html must never be, or users
# would keep loading the previous build.
aws s3 sync frontend/dist "s3://$BUCKET" \
  --delete \
  --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp frontend/dist/index.html "s3://$BUCKET/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"
ok "frontend uploaded to s3://$BUCKET"

# -------------------------------------------------------- 11. invalidation
info "Step 11/12 - invalidating the CloudFront cache"
INVALIDATION_ID="$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" --paths "/*" \
  --query 'Invalidation.Id' --output text)"
aws cloudfront wait invalidation-completed \
  --distribution-id "$DISTRIBUTION_ID" --id "$INVALIDATION_ID" 2>/dev/null ||
  warn "invalidation still in progress (this is usually fine)"
ok "cache invalidated"

# ------------------------------------------------------------- 12. verify
info "Step 12/12 - verifying the deployment"
./scripts/verify.sh "$APP_URL"

cat <<SUMMARY

$(printf '\033[1;32m✓ Deployment complete\033[0m')

  Application   $APP_URL
  Swagger       $APP_URL/docs
  Admin         $APP_URL/admin/login
  Image tag     $IMAGE_TAG
  ECS service   $CLUSTER / $SERVICE
  Logs          make aws-logs
  Dashboard     $(tf_output cloudwatch_dashboard_name)

  First deployment? Create the admin account:  make deploy-create-admin
  Finished with the demo? Remove everything:   make destroy

SUMMARY
