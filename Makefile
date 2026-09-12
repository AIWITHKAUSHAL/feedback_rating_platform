# CoursePulse - developer and deployment commands.
#
# Run `make help` to see everything. Commands are intentionally small wrappers
# around the real tools, so you can always see (and run) the underlying command.

SHELL := /bin/bash
.DEFAULT_GOAL := help

BACKEND      := backend
FRONTEND     := frontend
TERRAFORM_DIR := terraform
VENV         := $(BACKEND)/.venv
PY           := $(VENV)/bin/python
PIP          := $(VENV)/bin/pip
TEST_DB_CONTAINER := coursepulse-test-db
TEST_DB_PORT      := 5433
TEST_DATABASE_URL ?= postgresql+psycopg://coursepulse:coursepulse@localhost:$(TEST_DB_PORT)/coursepulse_pytest

.PHONY: help
help: ## Show this help
	@echo "CoursePulse - available commands:"
	@echo
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1;36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "First time:  cp .env.example .env && make install && make local"

# ---------------------------------------------------------------- local setup
.PHONY: install
install: ## Install backend (venv) and frontend (npm) dependencies
	python3 -m venv $(VENV)
	$(PIP) install --quiet --upgrade pip
	$(PIP) install --quiet -r $(BACKEND)/requirements-dev.txt
	cd $(FRONTEND) && npm ci
	@echo "Dependencies installed."

.PHONY: local
local: ## Start the full stack with Docker Compose (postgres + api + react)
	docker compose up --build

.PHONY: local-down
local-down: ## Stop the local stack (keeps the database volume)
	docker compose down

.PHONY: local-reset
local-reset: ## Stop the local stack AND delete the database volume
	docker compose down -v

.PHONY: logs
logs: ## Tail local backend logs (use SERVICE=frontend for the UI)
	docker compose logs -f $(or $(SERVICE),backend)

# ------------------------------------------------------------------- database
.PHONY: migrate
migrate: ## Apply Alembic migrations to the local database
	docker compose exec backend alembic upgrade head

.PHONY: migration
migration: ## Create a new migration: make migration NAME="add something"
	@test -n "$(NAME)" || (echo "Usage: make migration NAME=\"add something\""; exit 1)
	docker compose exec backend alembic revision --autogenerate -m "$(NAME)"

.PHONY: seed
seed: ## Load demo courses and reviews (idempotent - safe to re-run)
	docker compose exec backend python -m app.scripts.seed

.PHONY: create-admin
create-admin: ## Create/reset the admin account from ADMIN_EMAIL and ADMIN_PASSWORD in .env
	@test -f .env || (echo "No .env file. Run: cp .env.example .env"; exit 1)
	@set -a; . ./.env; set +a; \
		docker compose exec -T \
			-e ADMIN_EMAIL="$$ADMIN_EMAIL" -e ADMIN_PASSWORD="$$ADMIN_PASSWORD" \
			backend python -m app.scripts.create_admin

.PHONY: psql
psql: ## Open a psql shell on the local database
	docker compose exec postgres psql -U coursepulse -d coursepulse

# ---------------------------------------------------------------------- tests
.PHONY: test-db
test-db: ## Start the throwaway PostgreSQL used by backend tests
	@docker start $(TEST_DB_CONTAINER) >/dev/null 2>&1 || \
		docker run -d --name $(TEST_DB_CONTAINER) \
			-e POSTGRES_USER=coursepulse -e POSTGRES_PASSWORD=coursepulse \
			-e POSTGRES_DB=coursepulse_test -p $(TEST_DB_PORT):5432 postgres:16-alpine >/dev/null
	@until docker exec $(TEST_DB_CONTAINER) pg_isready -U coursepulse >/dev/null 2>&1; do sleep 1; done
	@docker exec $(TEST_DB_CONTAINER) psql -U coursepulse -d postgres \
		-c "CREATE DATABASE coursepulse_pytest" >/dev/null 2>&1 || true
	@echo "Test database ready on port $(TEST_DB_PORT)."

.PHONY: test
test: test-backend test-frontend ## Run every test suite

.PHONY: test-backend
test-backend: test-db ## Run backend tests (pytest, against real PostgreSQL)
	cd $(BACKEND) && TEST_DATABASE_URL="$(TEST_DATABASE_URL)" .venv/bin/python -m pytest

.PHONY: test-frontend
test-frontend: ## Run frontend tests (Vitest + React Testing Library)
	cd $(FRONTEND) && npm test

.PHONY: coverage
coverage: test-db ## Backend tests with a coverage report
	cd $(BACKEND) && TEST_DATABASE_URL="$(TEST_DATABASE_URL)" \
		.venv/bin/python -m pytest --cov --cov-report=term-missing

# ----------------------------------------------------------------------- lint
.PHONY: lint
lint: ## Lint and type-check backend and frontend
	cd $(BACKEND) && .venv/bin/ruff check . && .venv/bin/ruff format --check .
	cd $(FRONTEND) && npm run lint && npm run typecheck

.PHONY: format
format: ## Auto-format the backend code
	cd $(BACKEND) && .venv/bin/ruff format . && .venv/bin/ruff check --fix .

# ---------------------------------------------------------------------- build
.PHONY: build
build: ## Build the frontend bundle and the backend Docker image
	cd $(FRONTEND) && npm run build
	docker build -t coursepulse-backend:local $(BACKEND)

# ------------------------------------------------------------------ terraform
.PHONY: infra-init
infra-init: ## terraform init
	terraform -chdir=$(TERRAFORM_DIR) init

.PHONY: infra-validate
infra-validate: ## terraform fmt -check + validate
	terraform -chdir=$(TERRAFORM_DIR) fmt -check -recursive
	terraform -chdir=$(TERRAFORM_DIR) validate

.PHONY: infra-plan
infra-plan: ## terraform plan (requires AWS credentials)
	terraform -chdir=$(TERRAFORM_DIR) plan

.PHONY: infra-apply
infra-apply: ## terraform apply (creates AWS resources - costs money)
	terraform -chdir=$(TERRAFORM_DIR) apply

.PHONY: outputs
outputs: ## Show Terraform outputs (application URL, bucket, cluster, ...)
	terraform -chdir=$(TERRAFORM_DIR) output

.PHONY: url
url: ## Print the deployed application URL
	@terraform -chdir=$(TERRAFORM_DIR) output -raw application_url && echo

# --------------------------------------------------------------------- deploy
.PHONY: deploy
deploy: ## Full AWS deployment (infra, image, migration, frontend, verify)
	./scripts/deploy.sh

.PHONY: deploy-migrate
deploy-migrate: ## Run `alembic upgrade head` against RDS as a one-off ECS task
	./scripts/ecs_task.sh alembic upgrade head

.PHONY: deploy-seed
deploy-seed: ## Run the idempotent seed against RDS as a one-off ECS task
	./scripts/ecs_task.sh python -m app.scripts.seed

.PHONY: deploy-create-admin
deploy-create-admin: ## Create the AWS admin account (prompts for the password)
	./scripts/create_admin_aws.sh

.PHONY: verify
verify: ## Smoke-test the deployed application
	./scripts/verify.sh

.PHONY: aws-logs
aws-logs: ## Tail the ECS application logs from CloudWatch
	aws logs tail "$$(terraform -chdir=$(TERRAFORM_DIR) output -raw cloudwatch_log_group)" \
		--follow --format short

.PHONY: destroy
destroy: ## Destroy CoursePulse AWS resources and verify deletion twice
	./scripts/destroy.sh
