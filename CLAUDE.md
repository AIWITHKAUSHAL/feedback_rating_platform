# CLAUDE.md - working rules for this repository

Guidance for Claude Code (and any other contributor) working on CoursePulse.
Read this before changing anything. Hard prohibitions live in
[RESTRICTIONS.md](RESTRICTIONS.md); day-to-day conventions live in
[rules/project-rules.md](rules/project-rules.md).

---

## 1. Project objective

CoursePulse is a production-style **course feedback and rating platform** for
an educational institute.

* **Students** browse, search and filter courses, read published feedback and
  rating distributions, and submit one review per course (name, email, 1-5
  stars, written feedback).
* **Administrators** sign in, create and edit courses, hide and unhide
  reviews, and see platform statistics.

It is built to be taught from and assessed: readable, layered, tested and
honest about its trade-offs.

## 2. Assignment requirements (do not substitute)

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, Axios, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, Uvicorn, psycopg |
| Database | PostgreSQL |
| Infrastructure | Terraform |
| AWS | S3, CloudFront, ECR, ECS/Fargate, ALB, RDS PostgreSQL, IAM, CloudWatch, Secrets Manager |
| CI/CD | Git, GitHub, GitHub Actions with OIDC |
| Containers | Docker, Docker Compose |

Never swap these for alternatives. No Kubernetes, no MongoDB, no Lambda in
place of the container architecture, no GraphQL, no Kafka, no microservices.

## 3. Architecture

```
Browser
  └── CloudFront
        ├── /*      → private S3 bucket (React build)
        └── /api/*  → ALB → ECS/Fargate → FastAPI
                                            └── Route → Service → Repository
                                                  → SQLAlchemy → RDS PostgreSQL
```

Local development replaces CloudFront/ALB/ECS/RDS with Docker Compose:
React (Vite) → FastAPI → PostgreSQL.

## 4. Repository layout

```
backend/     FastAPI application, Alembic migrations, pytest suite
frontend/    React + TypeScript SPA, Vitest suite
terraform/   AWS infrastructure (flat files, one per service)
scripts/     deploy.sh, destroy.sh, ecs_task.sh, verify.sh, create_admin_aws.sh
docs/        acceptance checklist and video demo guide
load-test/   small k6 read-path test
.github/     CI and deployment workflows
```

## 5. Backend conventions

* **Layering is mandatory**: `api/` handles HTTP, `services/` holds business
  logic, `repositories/` holds SQLAlchemy queries. A route must never build a
  query; a repository must never raise an HTTP error.
* Type hints on everything public. Docstrings where the reasoning is not
  obvious from the code.
* Configuration comes from `app/core/config.py` only - never read `os.environ`
  elsewhere.
* Every error the client can trigger is an `AppError` subclass with a stable
  `code`. Handlers in `app/core/exceptions.py` render the standard envelope.
* Aggregates (average rating, review count, distribution) are computed in SQL,
  not in Python loops, and always over **visible** reviews.
* Keep queries bounded: paginate lists, cap "recent reviews".

## 6. Frontend conventions

* TypeScript everywhere; API response types live in `src/types/index.ts` and
  mirror the Pydantic schemas.
* All HTTP goes through `src/api/client.ts`. No component calls axios directly
  and no URL is hard-coded - the base URL comes from `VITE_API_BASE_URL`.
* Data loading uses `useApiResource`, which gives every screen loading, error,
  empty and success states. Never leave a blank page.
* Components stay small and reusable; `App.tsx` only declares routes.
* Forms are accessible: real `<label>`s, `aria-invalid`, `aria-describedby`,
  and status conveyed by text as well as colour.

## 7. Database rules

* Schema changes happen **only** through Alembic migrations. The application
  never calls `create_all`.
* `courses.slug` is unique. `reviews` has a foreign key to `courses` with
  `ON DELETE CASCADE`, a `CHECK (rating BETWEEN 1 AND 5)`, and the unique
  constraint `uq_reviews_course_id_normalized_email`.
* **Duplicate reviews are prevented in the database**, not just in the
  service. The service pre-check exists for a friendly message; the constraint
  is the guarantee. Never remove it to make something easier.
* Emails are normalised (trimmed, lower-cased) into `normalized_email` before
  persistence.
* Indexes exist for the query patterns actually used; add one when you add a
  new filter, and say why in the migration.
* Seeding is idempotent and separate from migrations.

## 8. API rules

* Assignment paths stay exactly as they are: `GET /health`,
  `GET /health/ready`, `GET /api/courses`, `GET /api/courses/{id}`,
  `POST /api/courses/{id}/reviews`, plus the `/api/admin/*` control plane.
  `/api/v1/*` aliases exist for forward compatibility.
* Status codes: 201 created, 404 unknown course/review, 409 duplicate review,
  422 validation error, 401 missing/invalid admin token.
* Every response body for an error uses `{success, error:{code,message}, request_id}`.
* Public payloads never include a reviewer's email address.

## 9. Security rules

* No secrets in the repository. Local values come from `.env` (gitignored);
  AWS values come from Secrets Manager via the ECS task definition.
* Admin passwords are bcrypt hashed. JWTs expire. Login returns the same
  generic error for unknown email and wrong password.
* Every `/api/admin/*` route except login requires a valid bearer token; the
  dependency is declared on the router so a new endpoint cannot be public by
  accident.
* CORS origins come from configuration - never `["*"]`.
* Never log passwords, tokens, authorization headers or connection strings.
* Stack traces and database messages never reach a client response.

## 10. Terraform rules

* Readable flat files, one per AWS service. Add a module only if it genuinely
  makes things clearer.
* Everything is tagged `Project`, `Environment`, `ManagedBy`, `Owner` through
  provider `default_tags` - this is what makes a scoped destroy safe.
* RDS is never publicly accessible. The frontend S3 bucket is never public.
* ECS accepts inbound traffic only from the ALB security group; the ALB
  accepts traffic only from CloudFront's managed prefix list.
* Run `terraform fmt -recursive`, `terraform validate` and (with credentials)
  `terraform plan` before considering a change done.
* `terraform destroy` must keep working. Do not add resources that block it
  without documenting the manual step.

## 11. AWS cost rules

One ECS task (0.25 vCPU / 512 MiB), single-AZ `db.t4g.micro` with 20 GiB,
7-day log retention, CloudFront PriceClass_100, **no NAT Gateway**, no
Multi-AZ, no EKS, no WAF, no OpenSearch, no paid observability.

Do not claim this demo can serve production-scale traffic. Document scaling
paths instead.

## 12. Testing rules

* Backend tests run against **real PostgreSQL** created by the migrations, so
  constraints are genuinely exercised (including a concurrency test proving the
  duplicate guard).
* Tests must never point at a managed/production database - `conftest.py`
  refuses URLs containing `amazonaws.com`.
* Frontend tests mock the `src/api/*` modules and assert on user-visible
  behaviour and accessibility roles.
* Never delete or weaken a test to make a build pass. Fix the code, or fix the
  test if the test was wrong - and say which.

## 13. CI/CD rules

* `ci.yml` runs backend lint/tests, frontend lint/typecheck/tests/build,
  Terraform fmt/validate and Docker builds on every push and PR. A failure
  fails the build.
* `deploy.yml` runs on push to `main` (and manual dispatch) and authenticates
  with **GitHub OIDC**. No long-lived AWS keys in GitHub secrets, ever.
* Images are tagged with the Git commit SHA.

## 14. Deployment process

`make deploy` (or `scripts/deploy.sh`):

1. check prerequisites and AWS credentials
2. `terraform fmt -check` + `validate`
3. create the ECR repository (targeted apply)
4. run backend and frontend tests
5. build and push the image tagged with the Git SHA
6. `terraform apply` the rest of the stack
7. roll the ECS service and wait for stability
8. `alembic upgrade head` as a one-off ECS task
9. optional idempotent seed (`SEED=1`)
10. build React and sync to S3
11. invalidate CloudFront
12. verify health and print the URL

Migrations are forward-only. **Never** drop and recreate the database during a
deployment - stored reviews are user data.

## 15. Destroy process

`make destroy` (or `scripts/destroy.sh`) asks for confirmation, empties this
project's own S3 bucket, then runs `terraform destroy`. It never issues broad
deletion commands against the account.

## 16. Working rules

* **Inspect before changing.** Read the file first; match the style around it.
* **Do not rewrite working code** to a different style for its own sake.
* Never hard-code credentials, endpoints or course data.
* Never leave a required feature as a TODO comment.
* Always run the relevant tests after a change, and say what actually ran.
* Update the README and `docs/ACCEPTANCE_CHECKLIST.md` when architecture or
  behaviour changes.
* Do not claim something works unless it was executed and observed.
