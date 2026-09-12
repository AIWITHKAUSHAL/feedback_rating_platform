# CoursePulse

**Course Feedback & Rating Platform** - React + TypeScript · FastAPI · PostgreSQL · Docker · Terraform · AWS

> Students discover courses and leave one honest review each. Administrators
> moderate that feedback and watch the numbers move. Built as a
> production-style, teachable reference implementation.

| | |
| --- | --- |
| **Live application** | `<!-- LIVE PROJECT LINK - paste the CloudFront URL after running `make deploy` -->` |
| **GitHub repository** | `<!-- GITHUB LINK - paste after pushing -->` |
| **Video walkthrough** | `<!-- YOUTUBE LINK - paste after recording (see docs/VIDEO_DEMO.md) -->` |
| **API documentation** | `<application-url>/docs` (locally: <http://localhost:8000/docs>) |

---

## 1. Product specification (one page)

**Problem.** An educational institute has no trustworthy view of how its
courses are actually received. Feedback is scattered across forms and inboxes,
nobody can compare courses, and there is no way to remove abusive submissions
without deleting genuine ones.

**Users.**

| User | Needs |
| --- | --- |
| **Student** (anonymous, no account) | Find a relevant course quickly; judge it from real ratings and comments; leave feedback in under a minute. |
| **Administrator** (authenticated) | Keep the catalogue current; remove inappropriate reviews without losing the record; see how the platform is doing. |

**Scope.**

*Students can:* browse the catalogue; search by title, mentor or topic; filter
by category and by minimum rating; sort by rating, popularity, recency or
title; open a course to see mentor, duration, full description, average
rating, published review count, a 5→1 star distribution and recent feedback;
submit a review with name, email, 1-5 stars and written comments; and receive
clear, field-level validation messages. **Each email address may review a given
course once.**

*Administrators can:* sign in; create and edit courses; browse every submitted
review with partially masked emails; hide and unhide reviews; and see total
courses, total reviews, the visible/hidden split, the platform average rating
and the highest-rated course.

**Out of scope (deliberately).** Student accounts, enrolment, payments,
comment threads, review editing by students, notifications, and any
role hierarchy beyond a single admin role. The admin area is a small control
plane, not a user-management system.

**Rules that define the product.**

1. A review is one per `(course, normalised email)` - enforced by a PostgreSQL
   unique constraint, so two simultaneous submissions cannot both succeed.
2. Public averages, review counts and distributions are computed from
   **visible** reviews only. Hiding a review changes what students see
   immediately.
3. Ratings are integers 1-5, enforced by a database `CHECK` constraint as well
   as by validation.
4. Aggregates are always computed from stored rows in SQL; the client never
   supplies them.
5. A reviewer's email address is never returned by a public endpoint.

**Success criteria.** A student can go from landing page to submitted review
in under a minute; an admin can hide an abusive review and see the course
average correct itself on the next page load; the whole system deploys from a
clean AWS account with one command and tears down with one more.

**Non-functional targets.** Filtering and pagination happen in PostgreSQL, not
in the browser. Every screen has loading, empty and error states. Forms are
keyboard-accessible. No secret is ever committed. The demo environment costs
roughly US$40/month and is designed to be destroyed after the demonstration.

---

## 2. Assignment requirements

| Area | Required | Used here |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, React Router, Axios, modern responsive CSS | React 19, TypeScript 6, Vite 8, React Router 7, Axios 1.20, Tailwind CSS 4 |
| Backend | Python, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, Uvicorn, psycopg | FastAPI 0.141, Pydantic 2.13, SQLAlchemy 2.0, Alembic 1.20, Uvicorn 0.52, psycopg 3.3 |
| Database | PostgreSQL | PostgreSQL 16 |
| Infrastructure | Terraform | Terraform ≥ 1.9, AWS provider 6.x |
| AWS | S3, CloudFront, ECR, ECS/Fargate, ALB, RDS PostgreSQL, IAM, CloudWatch | all of them, plus Secrets Manager |
| CI/CD | Git, GitHub, GitHub Actions, OIDC | `ci.yml` and `deploy.yml`, keyless OIDC |
| Containers | Docker, Docker Compose | multi-stage images, one-command local stack |

No substitutions: no Kubernetes, no MongoDB, no Lambda replacing the container
architecture, no GraphQL, no message queues, no microservices.

---

## 3. Features

### Student

- Browse a paginated catalogue of courses
- Search across title, mentor, category and description (debounced)
- Filter by category and by minimum average rating
- Sort by highest rated, most reviewed, newest or title
- See mentor, duration, category, average rating and review count on every card
- Open a course for the full description and published feedback
- See a 5→1 star distribution with counts and percentages
- Submit name, email, a 1-5 star rating and written feedback
- Get inline, field-level validation and a clear success state
- Be told plainly when that email has already reviewed the course

### Administrator

- Sign in with email and password (JWT bearer token)
- See total courses, total reviews, visible/hidden split, platform average and
  the top-rated course
- Create courses (slug generated server-side)
- Edit courses without touching their reviews
- Browse every review with partially masked email addresses
- Hide and unhide reviews, with the public aggregates updating accordingly
- Filter the moderation queue by visibility, course or free text

### Platform

- Layered backend (route → service → repository → SQLAlchemy → PostgreSQL)
- Consistent JSON error envelope with a stable machine-readable `code`
- Request-ID middleware and one structured JSON log line per request
- Liveness and readiness probes
- Response security headers and a request body size limit
- 97 backend tests against real PostgreSQL, 45 frontend tests
- One-command local stack, one-command AWS deploy, one-command destroy

---

## 4. Technology stack

```
React 19 · TypeScript 6 · Vite 8 · React Router 7 · Axios · Tailwind CSS 4 · Vitest
FastAPI · Pydantic v2 · SQLAlchemy 2 · Alembic · Uvicorn · psycopg 3 · pytest · ruff
PostgreSQL 16
Docker · Docker Compose · Terraform · GitHub Actions (OIDC)
AWS: S3 · CloudFront · ECR · ECS/Fargate · ALB · RDS PostgreSQL · IAM · Secrets Manager · CloudWatch
```

---

## 5. Repository structure

```
feedback_rating_platform/
├── backend/
│   ├── app/
│   │   ├── main.py                 FastAPI factory: middleware, handlers, routers
│   │   ├── api/                    HTTP layer (courses, reviews, admin, auth, health, stats)
│   │   ├── core/                   config, logging, exceptions, middleware, security, text
│   │   ├── db/                     declarative base, engine/session, Alembic metadata
│   │   ├── models/                 Course, Review, AdminUser
│   │   ├── schemas/                Pydantic request/response models
│   │   ├── repositories/           all SQLAlchemy queries
│   │   ├── services/               business logic and transactions
│   │   └── scripts/                idempotent seed, admin bootstrap
│   ├── alembic/                    migration environment and versions
│   ├── tests/                      97 pytest tests (real PostgreSQL)
│   ├── Dockerfile                  non-root, multi-layer, healthcheck
│   └── requirements*.txt, pyproject.toml, alembic.ini
├── frontend/
│   ├── src/
│   │   ├── api/                    Axios client + typed endpoint modules
│   │   ├── components/             cards, filters, stars, forms, dialogs, UI primitives
│   │   ├── hooks/                  useApiResource, useDebouncedValue, auth context
│   │   ├── layouts/                public and admin shells
│   │   ├── pages/                  home, course detail, 404, admin/*
│   │   ├── types/                  API types mirroring the Pydantic schemas
│   │   ├── utils/                  formatting and client-side validation
│   │   └── test/                   45 Vitest tests + helpers
│   ├── Dockerfile                  development (Vite) and production (nginx) targets
│   └── vite.config.ts, eslint.config.js, tsconfig*.json
├── terraform/                      one file per AWS service (see terraform/main.tf)
├── scripts/                        deploy.sh, destroy.sh, ecs_task.sh, verify.sh, ...
├── docs/                           ACCEPTANCE_CHECKLIST.md, VIDEO_DEMO.md
├── load-test/                      small k6 read-path test
├── .github/workflows/              ci.yml, deploy.yml
├── docker-compose.yml              postgres + backend + frontend
├── Makefile                        every command you need
├── CLAUDE.md · RESTRICTIONS.md · rules/project-rules.md
└── .env.example
```

---

## 6. Application architecture

Requests take one of two paths, but only ever hit one public hostname:

```mermaid
flowchart TD
    U["Student / Admin browser"] --> CF["CloudFront distribution"]
    CF -->|"/*"| S3["Private S3 bucket<br/>React build (OAC only)"]
    CF -->|"/api/*, /health, /docs"| ALB["Application Load Balancer"]
    ALB --> ECS["ECS Fargate task<br/>FastAPI + Uvicorn"]
    ECS --> SVC["Service layer<br/>business rules"]
    SVC --> REPO["Repository layer<br/>SQLAlchemy queries"]
    REPO --> DB[("RDS PostgreSQL<br/>private, single-AZ")]
    ECS -.->|"JSON logs"| CW["CloudWatch Logs"]
    ECS -.->|"DATABASE_URL, JWT_SECRET"| SM["Secrets Manager"]
```

Locally the same application runs without the AWS layer:

```mermaid
flowchart LR
    B["Browser :5173"] --> V["Vite dev server<br/>proxies /api"]
    V --> F["FastAPI :8000"]
    F --> P[("PostgreSQL :5432")]
```

### Request flow through the backend

```mermaid
sequenceDiagram
    participant C as React client
    participant R as Route (api/reviews.py)
    participant S as Service (services/reviews.py)
    participant P as Repository (repositories/reviews.py)
    participant D as PostgreSQL

    C->>R: POST /api/courses/7/reviews
    R->>R: Pydantic validation (422 on failure)
    R->>S: submit_review(course_id, payload)
    S->>P: course exists? (404 if not)
    S->>S: normalise email
    S->>P: existing review for this email? (409 if yes)
    S->>P: INSERT review
    P->>D: flush - unique constraint decides
    D-->>P: IntegrityError on a concurrent duplicate
    P-->>S: -> DuplicateReviewError (409)
    S->>D: COMMIT
    S-->>R: ReviewPublic (no email)
    R-->>C: 201 Created
```

### Backend layering

| Layer | Directory | Responsibility | Never does |
| --- | --- | --- | --- |
| **Route** | `app/api/` | HTTP: paths, status codes, request/response models, auth dependency | Build SQL, hold business rules |
| **Service** | `app/services/` | Business rules, transactions, translating database errors into domain errors | Touch `Request`/`Response`, write raw SQL |
| **Repository** | `app/repositories/` | Every SQLAlchemy query, all aggregation | Raise HTTP errors, commit |
| **Model** | `app/models/` | Tables, constraints, indexes, relationships | Contain logic |

The rule that keeps this honest: **a route may not import `select`, and a
repository may not import `fastapi`.**

---

## 7. Database schema

```mermaid
erDiagram
    COURSES ||--o{ REVIEWS : "has"

    COURSES {
        int id PK
        varchar(200) title
        varchar(220) slug UK "unique"
        varchar(120) mentor
        varchar(80) category "indexed"
        varchar(60) duration
        text description
        timestamptz created_at "indexed"
        timestamptz updated_at
    }

    REVIEWS {
        int id PK
        int course_id FK "ON DELETE CASCADE, indexed"
        varchar(120) name
        varchar(254) email
        varchar(254) normalized_email "part of the unique key"
        smallint rating "CHECK 1..5"
        text review_text
        boolean is_visible "default true, indexed"
        timestamptz created_at "indexed"
        timestamptz updated_at
    }

    ADMIN_USERS {
        int id PK
        varchar(254) email UK
        varchar(255) password_hash "bcrypt"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
```

**Constraints**

| Name | Table | Purpose |
| --- | --- | --- |
| `uq_courses_slug` | courses | Stable, shareable URLs |
| `fk_reviews_course_id_courses` | reviews | Referential integrity, `ON DELETE CASCADE` |
| `ck_reviews_rating_range` | reviews | `rating BETWEEN 1 AND 5`, whatever the caller sends |
| `uq_reviews_course_id_normalized_email` | reviews | **One review per email per course** |
| `uq_admin_users_email` | admin_users | One account per address |

**Indexes**

`ix_courses_category`, `ix_courses_created_at`, `ix_reviews_course_id`,
`ix_reviews_created_at`, `ix_reviews_is_visible`, and the composite
`ix_reviews_course_id_is_visible_created_at` which covers the hottest query -
visible reviews for one course, newest first.

Connection pooling is configured in `app/db/session.py`
(`pool_size`, `max_overflow`, `pool_pre_ping`, `pool_recycle`) so the API
survives idle timeouts and RDS failovers.

---

## 8. Duplicate-review logic

Three layers, and only one of them is a guarantee.

```mermaid
flowchart TD
    A["Student submits a review"] --> B{"Client-side validation<br/>src/utils/validation.ts"}
    B -->|invalid| B1["Inline field errors - no request sent"]
    B -->|valid| C{"Pydantic validation<br/>422 on failure"}
    C -->|valid| D{"Course exists?"}
    D -->|no| D1["404 COURSE_NOT_FOUND"]
    D -->|yes| E["Normalise email: trim + lowercase"]
    E --> F{"Existing review for<br/>(course, normalised email)?"}
    F -->|yes| F1["409 DUPLICATE_REVIEW - friendly message"]
    F -->|no| G["INSERT"]
    G --> H{"uq_reviews_course_id_normalized_email"}
    H -->|violated by a concurrent request| F1
    H -->|ok| I["201 Created - aggregates recomputed on read"]
```

* **Layer 1 - browser.** Instant feedback. Trivially bypassed; not security.
* **Layer 2 - service.** A `SELECT` before the insert, purely so the user gets
  "You have already reviewed this course" rather than a raw conflict.
* **Layer 3 - PostgreSQL.** `UNIQUE (course_id, normalized_email)`. Two
  requests arriving in the same millisecond both pass layer 2; only one
  survives the constraint, and the loser's `IntegrityError` is translated into
  the same clean 409.

`normalize_email()` trims whitespace and lower-cases. It deliberately does
**not** collapse Gmail-style dots or `+tags`: that would surprise users of
other providers, and the goal is to stop accidental double submission, not to
win an arms race.

This is covered by
`tests/test_reviews.py::test_concurrent_duplicate_submissions_create_only_one_review`,
which fires two simultaneous requests and asserts exactly one stored row, one
201 and one 409.

---

## 9. Rating calculation

* **Average rating** = `AVG(rating)` over reviews where `is_visible = true`,
  rounded to two decimals. A course with no visible reviews reports `0` and
  the UI shows "New" rather than "0.0 stars".
* **Review count** = `COUNT(*)` over the same population.
* **Distribution** = `COUNT(*) GROUP BY rating`, always returned as five
  buckets (5→1) with percentages of the visible total, so the chart never has
  holes and never divides by zero.
* **Platform average** (admin dashboard) = the mean of every visible review,
  so the admin number and the public numbers always agree.
* **Top-rated course** = the highest average among courses with at least
  `min_reviews_for_top_rated` (default **3**) visible reviews. Without that
  threshold a single five-star review would win. When nothing qualifies the
  API returns `null` and the dashboard explains why.

Aggregates are computed in SQL per request with a `LEFT JOIN` onto a grouped
subquery - one statement for a whole page of courses, no N+1 loop over
reviews, and no counter column that could drift from reality.

**Hidden reviews are excluded from every public number.** They remain in the
database and are counted separately in the admin statistics.

---

## 10. Admin moderation

Moderation is a single boolean, `reviews.is_visible`:

* Hiding removes the review from the course page, the average, the review
  count and the distribution - on the next read, because nothing is cached.
* Unhiding restores all of it. Nothing is deleted, so a mistake is reversible.
* The moderation list shows partially masked emails
  (`st*********@example.com`) - enough to recognise a repeat reviewer, not
  enough to harvest addresses.
* Hidden reviews still count towards `total_reviews` and `hidden_reviews` in
  the admin statistics, so the moderation backlog stays visible.

---

## 11. Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Docker + Docker Compose | 24+ / v2 | The local stack (the easiest path) |
| Python | 3.12+ | Running the backend or its tests directly |
| Node.js | 20+ (22 recommended) | Running the frontend or its tests directly |
| Terraform | 1.9+ | AWS infrastructure |
| AWS CLI | v2 | Deployment |
| `jq` | any | Deployment scripts |
| `git`, `make` | any | Everything |

---

## 12. Local development

### Option A - Docker Compose (recommended)

```bash
git clone <your-repository-url>
cd feedback_rating_platform

cp .env.example .env          # then edit ADMIN_PASSWORD and JWT_SECRET
docker compose up --build     # or: make local
```

Then, in a second terminal:

```bash
make seed            # 17 courses, ~100 reviews (idempotent)
make create-admin    # uses ADMIN_EMAIL / ADMIN_PASSWORD from .env
```

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| Backend | <http://localhost:8000> |
| Swagger | <http://localhost:8000/docs> |
| ReDoc | <http://localhost:8000/redoc> |
| Health | <http://localhost:8000/health> |
| Readiness | <http://localhost:8000/health/ready> |
| PostgreSQL | `localhost:5432` (user/db `coursepulse`) |

Compose runs `alembic upgrade head` before starting Uvicorn, mounts the source
for hot reload on both sides, and keeps data in the named volume
`coursepulse_postgres_data`. `make local-reset` throws that volume away.

### Option B - run the pieces directly

```bash
# PostgreSQL only
docker compose up -d postgres

# Backend
make install
cd backend
DATABASE_URL="postgresql+psycopg://coursepulse:coursepulse@localhost:5432/coursepulse" \
  .venv/bin/alembic upgrade head
DATABASE_URL="..." .venv/bin/uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend && npm ci && npm run dev
```

`vite.config.ts` proxies `/api` and `/health` to `http://localhost:8000`, so
no CORS configuration or hard-coded host is needed in development.

---

## 13. Environment variables

Copy `.env.example` to `.env`; it is gitignored. Nothing sensitive is ever
committed.

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | backend | `postgresql+psycopg://user:pass@host:5432/db` |
| `TEST_DATABASE_URL` | tests | Defaults to the throwaway database on port 5433 |
| `ENVIRONMENT` | backend | `local` / `test` / `production` |
| `LOG_LEVEL` | backend | `INFO` by default |
| `CORS_ORIGINS` | backend | Comma-separated list; never `*` |
| `JWT_SECRET` | backend | Generate per environment; from Secrets Manager on AWS |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | Admin token lifetime (60) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `create_admin` script only | Never stored in code or state |
| `POSTGRES_USER/PASSWORD/DB/PORT` | compose | Local database container |
| `VITE_API_BASE_URL` | frontend build | Empty = same origin (`/api`) |
| `AWS_REGION` | scripts, Terraform | `us-east-1` |

Generate a signing key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## 14. Database migrations

The application **never** creates tables at start-up. Alembic owns the schema.

```bash
make migrate                                    # alembic upgrade head (local)
make migration NAME="add course image url"      # autogenerate a revision
docker compose exec backend alembic current     # where are we?
docker compose exec backend alembic history     # what exists?
docker compose exec backend alembic downgrade -1
docker compose exec backend alembic check       # do the models match the migrations?
```

`alembic check` runs in CI, so a model change without a migration fails the
build.

**Against RDS**, migrations run as a one-off ECS task inside the VPC, because
the database has no public endpoint:

```bash
make deploy-migrate      # scripts/ecs_task.sh alembic upgrade head
```

`scripts/deploy.sh` and `deploy.yml` both run this automatically, after the
new image is live and before anything else. Migrations are forward-only; a
deployment never drops or recreates the database.

---

## 15. Seed data

```bash
make seed          # local
make deploy-seed   # against RDS
```

Loads 17 courses across 9 categories (Artificial Intelligence, Cloud
Computing, Cybersecurity, Data Engineering, Database, DevOps, Machine
Learning, Python, Web Development) with ~100 reviews, including a few hidden
ones so moderation can be demonstrated straight away.

**It is idempotent.** Courses are matched by slug and reviews by
`(course, normalised email)`, and the generated data is deterministic
(seeded from the course slug), so a second run reports
`17 courses present (0 created), 0 reviews created`.

---

## 16. Testing

```bash
make test              # backend + frontend
make test-backend      # 97 pytest tests against real PostgreSQL
make test-frontend     # 45 Vitest tests
make coverage          # backend coverage report
make lint              # ruff + ruff format --check + eslint + tsc
```

**Backend tests run against a real PostgreSQL instance** started by
`make test-db` on port 5433, with the schema created by the actual Alembic
migrations. That is what makes it possible to test the unique constraint, the
check constraint and a genuine race between two concurrent submissions.
`conftest.py` refuses to run against any URL containing `amazonaws.com`, so a
misconfigured environment cannot point the suite at a cloud database.

Coverage includes: health and readiness, the error envelope, listing,
search, category and rating filters, pagination, every sort option, course
detail, distribution accuracy, hidden-review exclusion, review submission,
duplicate rejection (including a concurrency test), email/rating/name/length
validation, unknown courses, oversized bodies, login success and failure,
expired and malformed tokens, protected endpoints, course creation and
editing, slug collisions, hide/unhide and their effect on public aggregates,
email masking, and every statistic including the top-rated threshold and the
empty-platform case.

Frontend tests cover catalogue rendering, loading/empty/error/retry states,
category and rating filtering, search debouncing, URL-driven filters,
pagination, course detail and distribution, the review form (validation,
success, duplicate 409, server field errors, double-submit prevention), the
admin dashboard, moderation hide/unhide, and login success and failure.

---

## 17. API summary

Base URL: `<application-url>` (locally `http://localhost:8000`).
Every route is also available under `/api/v1/...`.

### Public

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness. Used by the ALB target group. |
| `GET` | `/health/ready` | Readiness - checks PostgreSQL connectivity. |
| `GET` | `/api/stats` | Total courses, visible reviews, average rating, categories. |
| `GET` | `/api/courses` | Paginated catalogue. Query: `page`, `page_size`, `search`, `category`, `min_rating`, `sort`. |
| `GET` | `/api/courses/categories` | Categories with course counts. |
| `GET` | `/api/courses/{id}` | Detail: description, aggregates, distribution, recent reviews. |
| `POST` | `/api/courses/{id}/reviews` | Submit a review. `201` / `404` / `409` / `422`. |

### Admin (JWT bearer token required, except login)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | Exchange credentials for an access token. |
| `GET` | `/api/admin/auth/me` | Current admin profile (validates a stored token). |
| `GET` | `/api/admin/stats` | Platform statistics. |
| `GET` | `/api/admin/courses` | Course table with hidden-review counts. |
| `GET` | `/api/admin/courses/{id}` | One course, for the edit form. |
| `POST` | `/api/admin/courses` | Create a course. |
| `PUT` | `/api/admin/courses/{id}` | Edit a course. |
| `GET` | `/api/admin/reviews` | Moderation queue. Filters: `course_id`, `is_visible`, `search`. |
| `GET` | `/api/admin/reviews/{id}` | One review. |
| `PATCH` | `/api/admin/reviews/{id}/visibility` | Hide or unhide. |

### Examples

```bash
# Catalogue: DevOps courses rated 4+ , most reviewed first
curl "http://localhost:8000/api/courses?category=DevOps&min_rating=4&sort=most_reviewed"

# Submit a review
curl -X POST http://localhost:8000/api/courses/1/reviews \
  -H 'Content-Type: application/json' \
  -d '{"name":"Aditi Sharma","email":"aditi@example.com","rating":5,
       "review_text":"Clear explanations and genuinely useful labs."}'

# Sign in and read the statistics
TOKEN=$(curl -s -X POST http://localhost:8000/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@coursepulse.dev","password":"<your password>"}' | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/admin/stats
```

### Response shapes

Paginated list:

```json
{ "items": [], "page": 1, "page_size": 12, "total": 17, "pages": 2 }
```

Every error, without exception:

```json
{
  "success": false,
  "error": { "code": "DUPLICATE_REVIEW", "message": "You have already reviewed this course." },
  "request_id": "6f1c0f8e-6f7f-4a1c-9a9a-2f0d1b8f9c31"
}
```

Validation failures add `error.details`, a list of `{field, message}`, which
the review and course forms map straight back onto their inputs.

| Code | Status | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | One or more fields were rejected |
| `COURSE_NOT_FOUND` | 404 | Unknown course id |
| `REVIEW_NOT_FOUND` | 404 | Unknown review id |
| `DUPLICATE_REVIEW` | 409 | This email already reviewed this course |
| `AUTHENTICATION_FAILED` | 401 | Wrong email or password |
| `INVALID_TOKEN` | 401 | Missing, malformed or expired token |
| `PAYLOAD_TOO_LARGE` | 413 | Request body over 64 KB |
| `DATABASE_UNAVAILABLE` | 503 | The database could not be reached |
| `INTERNAL_ERROR` | 500 | Unexpected - details are logged, never returned |

**Swagger:** `<application-url>/docs` · locally <http://localhost:8000/docs>

---

## 18. AWS architecture

```mermaid
flowchart TB
    subgraph Internet
        U["Browser"]
        GH["GitHub Actions"]
    end

    U --> CF["CloudFront<br/>PriceClass_100, TLS 1.2+"]

    subgraph AWS["AWS us-east-1"]
        CF -->|"/*"| S3["S3 (private)<br/>React build · OAC only"]
        CF -->|"/api/*"| ALB["ALB<br/>SG: CloudFront prefix list only"]

        subgraph VPC["VPC 10.20.0.0/16"]
            subgraph Public["Public subnets (2 AZs)"]
                ALB --> ECS["ECS Fargate<br/>0.25 vCPU / 512 MiB<br/>SG: inbound from ALB only"]
            end
            subgraph Private["Private subnets (2 AZs) - no internet route"]
                RDS[("RDS PostgreSQL 16<br/>db.t4g.micro, single-AZ<br/>encrypted, private")]
            end
            ECS --> RDS
        end

        ECR["ECR<br/>images tagged by commit SHA"] -.->|"pull"| ECS
        SM["Secrets Manager<br/>DATABASE_URL · JWT_SECRET"] -.->|"injected at start"| ECS
        ECS -.->|"structured JSON logs"| CW["CloudWatch<br/>logs · dashboard · 5XX alarm"]
    end

    GH -->|"OIDC - no stored keys"| IAM["IAM deploy role"]
    IAM --> ECR
    IAM --> ECS
    IAM --> S3
    IAM --> CF
```

### CI/CD

```mermaid
flowchart LR
    D["Developer"] -->|"push / PR"| GH["GitHub"]
    GH --> CI["ci.yml<br/>ruff · pytest · eslint · tsc · vitest<br/>terraform validate · docker build"]
    CI -->|"green, on main"| DEP["deploy.yml"]
    DEP -->|"OIDC"| AWS["Temporary AWS credentials"]
    DEP --> IMG["Build image → ECR (:sha)"]
    IMG --> TD["Register task definition"]
    TD --> SVC["Update ECS service → wait stable"]
    SVC --> MIG["alembic upgrade head<br/>(one-off ECS task)"]
    MIG --> FE["npm run build → S3 sync"]
    FE --> INV["CloudFront invalidation"]
    INV --> VER["verify.sh against the live URL"]
```

### AWS resources created

| Service | Resource | Configuration |
| --- | --- | --- |
| VPC | 1 VPC, 2 public + 2 private subnets, IGW, 2 route tables | `10.20.0.0/16`, **no NAT Gateway** |
| EC2 | 3 security groups | CloudFront → ALB → ECS → RDS, each hop only |
| ALB | 1 load balancer, target group, HTTP listener | Health check `GET /health`, IP targets |
| ECS | Cluster, task definition, service | Fargate, 0.25 vCPU / 512 MiB, 1 task, circuit breaker + rollback |
| Auto Scaling | Target + CPU policy | 1-3 tasks, 60% average CPU |
| ECR | 1 repository | Scan on push, keep the last 10 images |
| RDS | 1 PostgreSQL 16 instance, subnet group | `db.t4g.micro`, 20 GiB gp3, encrypted, single-AZ, private |
| S3 | 1 bucket | Private, versioned, encrypted, OAC-only read |
| CloudFront | 1 distribution + OAC | `/*` → S3, `/api/*` + `/health` + `/docs` → ALB, caching disabled for the API |
| Secrets Manager | 2 secrets | Generated `DATABASE_URL` and `JWT_SECRET` |
| IAM | Execution role, task role, GitHub OIDC role | Least privilege, scoped to specific ARNs |
| CloudWatch | Log group, dashboard, alarm | 7-day retention, ALB/ECS/RDS widgets, 5XX alarm |

Everything is tagged `Project=coursepulse`, `Environment=dev`,
`ManagedBy=Terraform`, `Owner=CourseFeedbackAssignment`.

### Networking trade-off (read this)

ECS tasks run in **public subnets with a public IP**, purely so they can reach
ECR, CloudWatch and Secrets Manager on the way out. A NAT Gateway would cost
roughly as much as the rest of this stack combined, and VPC endpoints for
three services add their own hourly charges.

The tasks are still not exposed: their security group accepts inbound traffic
**only** from the ALB security group, and the ALB in turn accepts traffic only
from CloudFront's managed prefix list. Nothing on the internet can open a
connection to the container or to the database.

For production you would move the tasks into the private subnets and add
either a NAT Gateway or interface endpoints for ECR, S3, Logs and Secrets
Manager.

---

## 19. Deploying to AWS

> Creating these resources costs money. Read §23 first, and run
> `make destroy` when you are finished.

### One command

```bash
aws configure                     # or: aws sso login
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
make infra-init
make deploy
```

`scripts/deploy.sh` runs the twelve steps listed in its header: prerequisites,
Terraform validation, ECR first, tests, image build and push (tagged with the
commit SHA), full apply, ECS rollout, `alembic upgrade head`, optional seed,
React build, S3 sync, CloudFront invalidation and verification. It fails fast
and hides nothing.

First deployment:

```bash
SEED=1 make deploy          # also loads the demo courses
make deploy-create-admin    # prompts for a password; never touches disk
make url                    # print the application URL
make verify                 # smoke-test the deployment
```

### Step by step, if you prefer

```bash
terraform -chdir=terraform init
terraform -chdir=terraform apply -target=aws_ecr_repository.backend

ECR=$(terraform -chdir=terraform output -raw ecr_repository_url)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${ECR%%/*}"
docker build --platform linux/amd64 -t "$ECR:$(git rev-parse --short=12 HEAD)" backend
docker push "$ECR:$(git rev-parse --short=12 HEAD)"

terraform -chdir=terraform apply -var "container_image_tag=$(git rev-parse --short=12 HEAD)"

./scripts/ecs_task.sh alembic upgrade head
./scripts/ecs_task.sh python -m app.scripts.seed

(cd frontend && VITE_API_BASE_URL="" npm run build)
aws s3 sync frontend/dist "s3://$(terraform -chdir=terraform output -raw frontend_bucket_name)" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform -chdir=terraform output -raw cloudfront_distribution_id)" --paths "/*"
```

### Terraform outputs

```bash
make outputs
```

| Output | What it is |
| --- | --- |
| `application_url` | **The live application** |
| `cloudfront_url`, `cloudfront_distribution_id` | CDN URL and id (for invalidations) |
| `swagger_url` | Interactive API documentation |
| `alb_dns_name` | Load balancer hostname (reachable only from CloudFront) |
| `frontend_bucket_name` | Private S3 bucket |
| `ecr_repository_url` | Image repository |
| `ecs_cluster_name`, `ecs_service_name`, `ecs_task_definition_family` | ECS identifiers |
| `ecs_task_subnets`, `ecs_task_security_group` | Used when running one-off tasks |
| `rds_endpoint` *(sensitive)* | Database endpoint |
| `database_url_secret_arn`, `jwt_secret_arn` *(sensitive)* | Secrets Manager ARNs |
| `cloudwatch_log_group`, `cloudwatch_dashboard_name` | Where the logs and dashboard live |
| `github_actions_role_arn` | Role for the GitHub OIDC trust |

### Terraform state

Local state is fine for this training deployment, and it is gitignored
(it can contain the generated database password). For a team, uncomment the
S3 backend block in `terraform/versions.tf`, create a versioned, encrypted
bucket, and run `terraform init -migrate-state`.

---

## 20. GitHub OIDC setup

No AWS access keys are stored in GitHub. The workflow presents a short-lived
GitHub identity token and AWS exchanges it for temporary credentials, trusted
only for your repository.

1. Set the repository in `terraform/terraform.tfvars`:

   ```hcl
   github_repository = "your-username/coursepulse"
   ```

   (Set `create_github_oidc_provider = false` if the account already has
   `token.actions.githubusercontent.com` registered - AWS allows only one.)

   If your GitHub organisation uses **immutable OIDC subjects**, the deploy
   fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity`,
   because GitHub sends `repo:owner@<id>/repo@<id>:...`. Copy the
   `sub_claim_prefix` from
   `gh api repos/OWNER/REPO/actions/oidc/customization/sub` into
   `terraform.tfvars`:

   ```hcl
   github_oidc_subject_prefix = "repo:owner@123456/repo@789012"
   ```

2. `make infra-apply`, then take the role ARN:

   ```bash
   terraform -chdir=terraform output -raw github_actions_role_arn
   ```

3. In **Settings → Secrets and variables → Actions**, add:

   **Secret**

   | Name | Value |
   | --- | --- |
   | `AWS_DEPLOY_ROLE_ARN` | the role ARN from step 2 |

   **Variables** (each is a `terraform output`)

   | Name | Output |
   | --- | --- |
   | `AWS_REGION` | `aws_region` |
   | `ECR_REPOSITORY_URL` | `ecr_repository_url` |
   | `ECS_CLUSTER_NAME` | `ecs_cluster_name` |
   | `ECS_SERVICE_NAME` | `ecs_service_name` |
   | `ECS_TASK_DEFINITION_FAMILY` | `ecs_task_definition_family` |
   | `ECS_TASK_SUBNETS` | `ecs_task_subnets` (comma-separated) |
   | `ECS_TASK_SECURITY_GROUP` | `ecs_task_security_group` |
   | `FRONTEND_BUCKET_NAME` | `frontend_bucket_name` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id` |
   | `APPLICATION_URL` | `application_url` |
   | `CLOUDWATCH_LOG_GROUP` | `cloudwatch_log_group` |

4. Push to `main`. `ci.yml` gates the change and `deploy.yml` ships it.

The trust policy restricts `token.actions.githubusercontent.com:sub` to
`repo:<owner>/<repo>:*`, so no other repository can assume the role, and the
attached policy grants only what deployment needs (push to this one ECR
repository, roll this service, write to this bucket, invalidate this
distribution).

---

## 21. CI/CD

**`ci.yml`** - on every push and pull request to `main`:

| Job | Steps |
| --- | --- |
| `backend` | `ruff check`, `ruff format --check`, `pytest` against a PostgreSQL service container, then `alembic check` for model/migration drift |
| `frontend` | `npm ci`, `eslint`, `tsc`, `vitest`, production build |
| `terraform` | `fmt -check -recursive`, `init -backend=false`, `validate` |
| `docker` | Build both images, validate `docker-compose.yml` |

Any failure fails the build. Nothing is `continue-on-error`.

**`deploy.yml`** - on push to `main` (or manual dispatch, with an optional
seed): re-runs the tests, assumes the OIDC role, builds and pushes the image
tagged with the commit SHA, registers a new task definition revision, updates
the ECS service and waits for stability, runs the migration as a one-off task,
builds and uploads the React app, invalidates CloudFront, runs `verify.sh`
against the live URL and writes a summary.

Caching rules on upload matter: hashed assets get
`public,max-age=31536000,immutable`, while `index.html` gets
`no-cache,no-store,must-revalidate` - otherwise browsers would keep loading
the previous build's HTML.

---

## 22. CloudWatch and observability

Every request produces one JSON line:

```json
{"timestamp":"2026-09-12T13:16:49.286486+00:00","level":"INFO","logger":"app.request",
 "message":"request_completed","request_id":"7d1eb835-f95b-4ee6-acc8-3499cb05581b",
 "method":"GET","path":"/api/courses","status_code":200,"duration_ms":2.76}
```

The same `request_id` is returned in the `X-Request-ID` response header and
included in every error body, so a user can quote it and you can find the
exact request.

```bash
make aws-logs                            # tail the ECS logs
aws logs tail /ecs/coursepulse-dev-backend --follow --format short
```

Console: **CloudWatch → Log groups → `/ecs/coursepulse-dev-backend`**, or the
dashboard **`coursepulse-dev-overview`** (ALB requests/5XX/latency/healthy
hosts, ECS CPU and memory, RDS CPU/connections/free storage, and a live panel
of recent 5XX requests).

Logs Insights examples:

```
fields @timestamp, request_id, method, path, status_code, duration_ms
| filter status_code >= 500 | sort @timestamp desc | limit 20

fields @timestamp, path, duration_ms
| filter duration_ms > 500 | sort duration_ms desc | limit 20

filter message = "admin_login_failed" | stats count() by bin(1h)
```

**Never logged:** passwords, tokens, `Authorization` headers, database URLs.
Failed logins record only the email domain.

One alarm exists: `coursepulse-dev-backend-5xx` fires when the ALB sees five
or more target 5XX responses in five minutes.

---

## 23. Cost

Rough us-east-1 estimate for the demo configuration, running continuously:

| Resource | Configuration | ~US$/month |
| --- | --- | --- |
| ECS Fargate | 1 × 0.25 vCPU / 512 MiB | ~9 |
| Application Load Balancer | 1 ALB, minimal LCUs | ~17 |
| RDS PostgreSQL | `db.t4g.micro`, 20 GiB gp3, single-AZ | ~13 |
| Secrets Manager | 2 secrets | ~1 |
| S3 + CloudFront | A few MB, demo traffic | < 1 |
| ECR | Up to 10 small images | < 1 |
| CloudWatch | 7-day retention, one dashboard | < 1 |
| **Total** | | **≈ US$40/month** |

> ⚠️ **These resources bill by the hour whether anyone uses them or not.**
> The ALB and RDS instance are the bulk of it. Run `make destroy` as soon as
> the demonstration is over. Free-tier coverage may reduce this on a new
> account, but do not rely on it.

Cost decisions taken deliberately: no NAT Gateway, no Multi-AZ, no read
replica, no WAF or Shield Advanced, no OpenSearch, no Container Insights, no
Performance Insights, CloudFront PriceClass_100, 7-day logs, 1-day backups.

**Production hardening** (each adds cost): Multi-AZ RDS, tasks in private
subnets with NAT or VPC endpoints, a custom domain with ACM and HTTPS to the
origin, AWS WAF in front of CloudFront, higher desired count across AZs,
longer log retention, Performance Insights, and a read replica or Redis cache
if the read path ever needs one. Redis is **not** needed at this scale -
PostgreSQL with the right indexes is comfortably sufficient.

---

## 24. Security notes

| Control | Implementation |
| --- | --- |
| Server-side validation | Pydantic v2 on every request body, path and query parameter |
| Duplicate protection | PostgreSQL unique constraint, not just application logic |
| Rating integrity | `CHECK (rating BETWEEN 1 AND 5)` in the database |
| Password storage | bcrypt, with a 72-byte guard; plaintext never stored or logged |
| Admin authentication | JWT (HS256) with an expiry; the same generic error for unknown email and wrong password |
| Protected endpoints | The auth dependency is declared on the admin router, so a new route cannot be public by accident |
| Secret management | Generated by Terraform into Secrets Manager, injected by ECS; `.env` locally, never committed |
| CORS | Explicit origins from configuration, never `*`; no credentialed CORS |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Resource-Policy`, HSTS in production |
| Request size | Bodies over 64 KB rejected with 413 before reaching a handler |
| Review length | 10-2000 characters, names 2-120, enforced server-side |
| Email normalisation | Trimmed and lower-cased before storage and comparison |
| SQL injection | SQLAlchemy expressions with bound parameters only - no string-built SQL anywhere |
| Error responses | Stack traces, SQL and connection details are logged, never returned |
| Data exposure | Public endpoints never return reviewer emails; admin views mask them |
| Network | RDS private and never publicly accessible; ECS inbound only from the ALB; ALB inbound only from CloudFront |
| Storage | S3 fully blocked from public access, read only via OAC; RDS storage encrypted |
| IAM | Task role has no AWS permissions; execution role reads exactly two secret ARNs; the CI role is scoped to this repository |
| Supply chain | Pinned Python dependencies, `npm ci` from a lockfile, ECR scan on push |

Not implemented, and deliberately so for a teaching project: WAF, rate
limiting, MFA, refresh-token rotation, audit trails. Each is listed here so
the omission is a decision rather than an oversight.

---

## 25. Troubleshooting

**`docker compose up` - the backend restarts in a loop.**
`docker compose logs backend`. Usually the database is not ready yet (Compose
waits for the healthcheck, so this should be rare) or a variable in `.env` is
malformed. Note that `CORS_ORIGINS` must be a plain comma-separated string.

**`connection refused` from the backend.**
The database container is still starting: `docker compose ps` should show
`postgres` as `healthy`. `make local-reset` gives you a clean volume.

**Port already in use (5432, 5173 or 8000).**
Change `POSTGRES_PORT` in `.env`, or stop whatever holds the port
(`lsof -i :5432`).

**Frontend loads but every request fails.**
Check `VITE_API_BASE_URL`. Empty is correct for both Compose and production;
the Vite proxy handles `/api` locally. Vite only reads env values at start-up,
so restart the dev server after changing it.

**`pytest` cannot connect.**
Run `make test-db` first - the suite uses the throwaway database on port 5433,
not your development database.

**`alembic check` fails in CI.**
A model changed without a migration. Run
`make migration NAME="describe the change"`, review the generated file, and
commit it.

**Duplicate review returns 500 instead of 409.**
The unique constraint name has drifted from `UNIQUE_REVIEW_CONSTRAINT` in
`app/models/review.py`; the service matches on that name to translate the
error. Keep the model and the migration in sync.

**`terraform plan` fails with `InvalidClientTokenId`.**
Your AWS credentials are missing or expired: `aws sts get-caller-identity`,
then `aws configure` or `aws sso login`.

**ECS tasks start and immediately stop.**
`make aws-logs`. Common causes: the image was built for arm64 (build with
`--platform linux/amd64`), or the execution role cannot read a secret.

**ALB target group is unhealthy.**
The container must answer `GET /health` with 200 within the grace period.
Check the security group chain and the log group for start-up errors.

**CloudFront still serves the old build.**
The invalidation is still propagating (usually under a minute), or
`index.html` was uploaded with a caching header - it must be `no-cache`.

**`terraform destroy` fails on the S3 bucket.**
`scripts/destroy.sh` empties it first. If you ran `terraform destroy` directly,
empty the bucket and re-run.

---

## 26. Screenshots

Add images to `docs/screenshots/` and the placeholders below will render.

| View | Screenshot |
| --- | --- |
| Home - hero and catalogue | `<!-- ![Home](docs/screenshots/home.png) -->` |
| Filters in use | `<!-- ![Filters](docs/screenshots/filters.png) -->` |
| Course detail with rating distribution | `<!-- ![Course detail](docs/screenshots/course-detail.png) -->` |
| Review form and success state | `<!-- ![Review form](docs/screenshots/review-form.png) -->` |
| Duplicate-review rejection | `<!-- ![Duplicate](docs/screenshots/duplicate-review.png) -->` |
| Admin login | `<!-- ![Admin login](docs/screenshots/admin-login.png) -->` |
| Admin dashboard | `<!-- ![Dashboard](docs/screenshots/admin-dashboard.png) -->` |
| Course management | `<!-- ![Courses](docs/screenshots/admin-courses.png) -->` |
| Review moderation | `<!-- ![Moderation](docs/screenshots/admin-reviews.png) -->` |
| Swagger UI | `<!-- ![Swagger](docs/screenshots/swagger.png) -->` |
| Mobile layout (375 px) | `<!-- ![Mobile](docs/screenshots/mobile.png) -->` |
| CloudWatch dashboard | `<!-- ![CloudWatch](docs/screenshots/cloudwatch.png) -->` |
| GitHub Actions run | `<!-- ![CI](docs/screenshots/github-actions.png) -->` |

---

## 27. Destroying the environment

```bash
make destroy
```

The script asks you to type `destroy`, empties **this project's** S3 bucket
(a versioned bucket cannot be deleted while it holds objects), then runs
`terraform destroy`. It also deletes historical revisions of this project's
ECS task-definition family, which Terraform only deregisters.

Deletion is considered successful only after **two consecutive clean checks**.
Each check confirms that Terraform state is empty, queries the project and
environment tags, and directly checks named/known resources such as RDS, ALB,
ECS, ECR, S3, CloudFront, Secrets Manager, IAM and CloudWatch. The command exits
non-zero and does not print a success message if a resource remains or an AWS
verification API call fails. Only exact project names, captured IDs and tags
are used; there are no account-wide delete commands.

**This permanently deletes the RDS instance and every stored review.**

For an additional manual tag check:

```bash
aws resourcegroupstaggingapi get-resources --region us-east-1 \
  --tag-filters Key=Project,Values=coursepulse Key=Environment,Values=dev
```

---

## 28. Command reference

```bash
make help              # every command, with descriptions

make install           # backend venv + npm install
make local             # docker compose up --build
make local-down        # stop (keeps data)
make local-reset       # stop and delete the database volume
make logs              # tail local logs

make migrate           # alembic upgrade head
make migration NAME=   # create a migration
make seed              # idempotent demo data
make create-admin      # create/reset the local admin
make psql              # database shell

make test              # backend + frontend tests
make test-backend      # pytest against real PostgreSQL
make test-frontend     # vitest
make coverage          # backend coverage
make lint              # ruff + eslint + tsc
make format            # auto-format the backend
make build             # frontend bundle + backend image

make infra-init        # terraform init
make infra-validate    # fmt -check + validate
make infra-plan        # terraform plan
make infra-apply       # terraform apply
make outputs           # show outputs
make url               # print the application URL

make deploy            # full AWS deployment
make deploy-migrate    # migrate RDS via a one-off ECS task
make deploy-seed       # seed RDS via a one-off ECS task
make deploy-create-admin
make verify            # smoke-test the deployment
make aws-logs          # tail CloudWatch logs
make destroy           # tear everything down
```

---

## 29. Further documentation

| Document | Contents |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Architecture, conventions and working rules for contributors |
| [RESTRICTIONS.md](RESTRICTIONS.md) | Hard prohibitions (secrets, public RDS/S3, stack substitutions) |
| [rules/project-rules.md](rules/project-rules.md) | Naming, layering, accessibility and testing conventions |
| [docs/ACCEPTANCE_CHECKLIST.md](docs/ACCEPTANCE_CHECKLIST.md) | Assignment checklist with what was actually verified |
| [docs/VIDEO_DEMO.md](docs/VIDEO_DEMO.md) | Recommended demonstration sequence |
| [load-test/README.md](load-test/README.md) | k6 read-path load test and how to read the results |
| [terraform/main.tf](terraform/main.tf) | File-by-file map of the infrastructure |

---

## 30. Licence and attribution

Built as an educational assignment project. The seeded courses, mentors,
students and reviews are fictional sample data created for demonstration.

---

## 31. Quick start: run locally

A step-by-step summary of [section 12](#12-local-development) for getting the
app running on your machine.

### Option A - Docker Compose (recommended)

```bash
cd feedback_rating_platform

# 1. Create your local env file, then edit it: set JWT_SECRET and ADMIN_PASSWORD
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"   # paste as JWT_SECRET

# 2. Start PostgreSQL + FastAPI + React (Alembic migrations run automatically)
make local            # same as: docker compose up --build
```

Then, in a second terminal:

```bash
make seed             # 17 demo courses, ~100 reviews (idempotent - safe to re-run)
make create-admin     # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env
```

| What | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| API | <http://localhost:8000> |
| Swagger docs | <http://localhost:8000/docs> |
| Health | <http://localhost:8000/health> |

Sign in to the admin area with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your
`.env`.

Useful commands:

| Command | Effect |
| --- | --- |
| `make logs` | Follow backend logs (`SERVICE=frontend make logs` for the UI) |
| `make local-down` | Stop the stack, keep the data |
| `make local-reset` | Stop the stack **and delete** the database volume |
| `make psql` | Open a database shell |

### Option B - run the backend and frontend directly

```bash
docker compose up -d postgres
make install                                   # backend venv + npm ci
cd backend
export DATABASE_URL="postgresql+psycopg://coursepulse:<POSTGRES_PASSWORD>@localhost:5432/coursepulse"
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload

# new terminal
cd frontend && npm run dev
```

### Gotchas

- **Database password.** Once `.env` exists, PostgreSQL is initialised with
  `POSTGRES_PASSWORD` from it (`change-me-locally` by default), so
  `DATABASE_URL` in Option B must use that value, not `coursepulse`. The
  password is fixed when the volume is first created; after changing it, run
  `make local-reset` (this deletes local data).
- **Port 5432 already in use** (for example by a Homebrew PostgreSQL): set
  `POSTGRES_PORT=5434` (or any free port) in `.env` and use that port in
  `DATABASE_URL`.

---

## 32. Quick start: deploy to AWS

A step-by-step summary of [section 19](#19-deploying-to-aws) and
[section 20](#20-github-oidc-setup). The infrastructure is created **once**
from your laptop with Terraform; after that, GitHub Actions deploys every
push to `main`.

> Creating these resources costs money. Read [section 23](#23-cost) first and
> run `make destroy` when you are finished.

### Part 1 - one-time setup on your laptop

1. Install the tools from [section 11](#11-prerequisites): AWS CLI v2,
   Terraform 1.9+, Docker Desktop, `jq`, Node 20+, Python 3.12+, `git`, `make`.

2. Log in to AWS:

   ```bash
   aws configure
   aws sts get-caller-identity     # should print your account
   ```

3. Install the project dependencies (the deploy runs the test suites first):

   ```bash
   cd feedback_rating_platform
   make install
   ```

4. Create an **empty** repository on GitHub (for example `coursepulse`, no
   README).

5. Make this folder its own Git repository - do not push yet:

   ```bash
   git init -b main
   git add .
   git status        # .env, terraform.tfvars and *.tfstate must NOT be listed
   git commit -m "Initial commit"
   git remote add origin https://github.com/<owner>/coursepulse.git
   ```

6. Create the Terraform settings file:

   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   ```

   Then add your repository so GitHub is allowed to deploy:

   ```hcl
   github_repository = "<owner>/coursepulse"
   ```

   If the AWS account already has a GitHub OIDC provider, also set
   `create_github_oidc_provider = false`.

### Part 2 - create the infrastructure and deploy for the first time

7. Start Docker Desktop and wait until it is running.

8. Create everything and deploy, loading the demo courses (about 15-25
   minutes; RDS and CloudFront are the slow parts):

   ```bash
   make infra-init
   SEED=1 make deploy
   ```

9. Create the admin account (prompts for an email and a password of at least
   8 characters):

   ```bash
   make deploy-create-admin
   ```

10. Check the deployment:

    ```bash
    make url
    make verify
    ```

    Open the URL and sign in at `<url>/admin/login`. Paste the URL into the
    **Live application** row at the top of this README.

### Part 3 - connect GitHub Actions

11. Print the values GitHub needs:

    ```bash
    make outputs
    terraform -chdir=terraform output -raw github_actions_role_arn
    terraform -chdir=terraform output -json ecs_task_subnets | jq -r 'join(",")'
    ```

12. In GitHub, open **Settings → Secrets and variables → Actions** and add:

    **Secret**

    | Name | Value |
    | --- | --- |
    | `AWS_DEPLOY_ROLE_ARN` | `github_actions_role_arn` from step 11 |

    **Variables**

    | Name | Terraform output |
    | --- | --- |
    | `AWS_REGION` | `aws_region` |
    | `ECR_REPOSITORY_URL` | `ecr_repository_url` |
    | `ECS_CLUSTER_NAME` | `ecs_cluster_name` |
    | `ECS_SERVICE_NAME` | `ecs_service_name` |
    | `ECS_TASK_DEFINITION_FAMILY` | `ecs_task_definition_family` |
    | `ECS_TASK_SUBNETS` | the comma-separated line from step 11 |
    | `ECS_TASK_SECURITY_GROUP` | `ecs_task_security_group` |
    | `FRONTEND_BUCKET_NAME` | `frontend_bucket_name` |
    | `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id` |
    | `APPLICATION_URL` | `application_url` |
    | `CLOUDWATCH_LOG_GROUP` | `cloudwatch_log_group` |

    No AWS access keys are stored in GitHub - the workflow uses OIDC.

13. Push the code and watch the **Actions** tab - both **CI** and **Deploy**
    should go green:

    ```bash
    git push -u origin main
    ```

### Part 4 - day to day

14. **Deploy a code change:** commit and push to `main`. `deploy.yml` runs the
    tests, builds the image tagged with the commit SHA, rolls the ECS service,
    runs `alembic upgrade head`, uploads the React build to S3, invalidates
    CloudFront and verifies the site.

15. **Change infrastructure** (anything in `terraform/`): run
    `make infra-apply` from your laptop - the pipeline deploys code only. If an
    output value changes, update the matching GitHub variable.

16. **Finished with the demo:** remove every AWS resource:

    ```bash
    make destroy
    ```

### Gotchas

- **Push only after step 12.** Without the secret and variables, the first
  Deploy run fails at the AWS login step.
- **Workflows must be at the repository root.** GitHub only runs
  `.github/workflows/` from the top of the repository, which is why this
  folder needs its own repository (step 5).
- **Terraform state lives on your laptop** (`terraform/terraform.tfstate`,
  gitignored). Keep it - `make infra-apply` and `make destroy` depend on it.
