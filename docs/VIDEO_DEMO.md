# Video demo guide

A recommended sequence for recording the CoursePulse walkthrough. Aim for
12-18 minutes. Everything below is real functionality in this repository -
demonstrate it live rather than describing it.

## Before you record

```bash
cp .env.example .env                 # set a real ADMIN_PASSWORD
docker compose up --build -d
make seed
make create-admin
./scripts/verify.sh http://localhost:5173
```

Have these tabs open: the app (`localhost:5173`), Swagger
(`localhost:8000/docs`), your editor, a terminal, and - if you deployed - the
CloudFront URL, the AWS console (ECS, RDS, CloudWatch) and GitHub Actions.

---

## 1. Introduction (1 min)

1. **Project objective** - a course feedback and rating platform: students
   browse courses and leave one honest review each; admins moderate and see
   platform statistics.
2. **Repository structure** - `backend/`, `frontend/`, `terraform/`,
   `scripts/`, `docs/`, `.github/workflows/`.

## 2. Code walkthrough (4-5 min)

3. **React architecture** - `src/api` (single Axios client), `src/hooks`
   (`useApiResource` giving every screen loading/error/empty/success),
   `src/components`, `src/pages`, `src/types` mirroring the backend schemas.
4. **FastAPI architecture** - open one route and follow it down:
   `api/reviews.py` → `services/reviews.py` → `repositories/reviews.py` →
   SQLAlchemy. Point out that routes never write queries.
5. **PostgreSQL models** - `models/review.py`: the foreign key, the
   `CHECK (rating BETWEEN 1 AND 5)`, and
   `uq_reviews_course_id_normalized_email`.
6. **Alembic migration** - show the initial migration, then run
   `docker compose exec backend alembic current` and mention that the schema is
   never created by the application at start-up.

## 3. Student experience (3-4 min)

7. **Course browsing** - the catalogue, cards, average ratings, review counts.
8. **Category and rating filtering** - filter by DevOps, then 4★ & up; point
   out that the URL changes and the API query changes with it (Network tab).
9. **Search** - type "terraform"; note the debounce (one request, not seven).
10. **Course detail** - description, rating breakdown bars, recent feedback.
11. **Review submission** - fill the form, pick stars, submit; watch the
    average, the count, the distribution and the feedback list update.
12. **Duplicate-review rejection** - submit again with the same email. Show
    the friendly 409 message in the UI, then show the same call in Swagger
    returning `409 DUPLICATE_REVIEW`.
13. **Explain the guarantee** - the friendly message comes from a service
    check, but the *guarantee* is the unique constraint. Show the pytest test
    `test_concurrent_duplicate_submissions_create_only_one_review`.
14. **Average rating and review count change** - reload the catalogue and
    point at the card for the course you just reviewed.

## 4. Admin experience (3 min)

15. **Admin login** - `/admin/login`; mention bcrypt hashing and JWT expiry,
    and that credentials come from the environment (`make create-admin`).
16. **Course create** - create a course; show it appear in the public
    catalogue immediately.
17. **Course edit** - change the duration; show existing reviews survive.
18. **Review hide** - hide a review, then reload the public course page: the
    average and the count both change.
19. **Review unhide** - restore it and show the numbers return.
20. **Dashboard statistics** - totals, visible/hidden split, platform average,
    top-rated course, and the minimum-review threshold that protects it.

## 5. Platform and infrastructure (4-5 min)

21. **Swagger API** - `/docs`: the versioned routes, the error envelope, the
    admin lock icons.
22. **PostgreSQL persistence** - `make psql`, then
    `SELECT title, count(*) FROM courses JOIN reviews ON ... GROUP BY 1;`
    Restart the backend and show the data is still there.
23. **Docker** - `docker compose ps`, the multi-stage Dockerfiles, the
    non-root backend user.
24. **Terraform** - walk `terraform/` file by file; run
    `make infra-validate`. Point out RDS `publicly_accessible = false` and the
    S3 public access block.
25. **AWS architecture** - the Mermaid diagram in the README:
    CloudFront → S3 for the SPA, CloudFront → ALB → ECS → RDS for the API.
    Mention the deliberate no-NAT-Gateway trade-off.
26. **GitHub Actions** - `ci.yml` gates every PR; `deploy.yml` authenticates
    with OIDC (no stored AWS keys), pushes an image tagged with the commit
    SHA, rolls ECS, runs `alembic upgrade head`, uploads the build to S3 and
    invalidates CloudFront.
27. **CloudWatch** - the log group with one JSON line per request
    (`request_id`, `path`, `status_code`, `duration_ms`) and the dashboard.
28. **Live CloudFront URL** - open the deployed application and run
    `./scripts/verify.sh "$(make url)"` on camera.

## 6. Reflection (2 min)

29. **AI usage** - be specific and honest: what you asked for, what you kept,
    what you rewrote, and how you checked it (tests, `verify.sh`, reading the
    SQL). Marks come from understanding, not from having generated code.

30. **One debugging challenge** - describe a real problem you hit and how you
    diagnosed it.

> **Fill this in yourself - do not invent one.** Two problems that genuinely
> occurred while this repository was being built, if you want examples of the
> right level of detail:
>
> * `CORS_ORIGINS` is a list, and pydantic-settings tried to JSON-decode the
>   comma-separated value coming from Docker Compose before the field
>   validator ran. The backend container restart-looped with
>   `SettingsError: error parsing value for field "cors_origins"`. Fixed by
>   annotating the field with `NoDecode` so the validator owns the parsing,
>   and locked in with a test.
> * Tailwind CSS v4 cannot `@apply` a class that is only defined in plain CSS.
>   `@apply btn` failed the production build with "Cannot apply unknown
>   utility class `btn`". Fixed by declaring `btn` and `badge` with `@utility`
>   so the variant classes can compose on top of them.

31. **What AI suggested vs what you changed** - name at least one place where
    you rejected or reworked a suggestion, and why.

---

## Recording tips

* Zoom the editor and the browser - small text is unreadable after
  compression.
* Show the Network tab when demonstrating filtering, so it is obvious the
  server does the work and not the browser.
* When something fails on camera, keep it and explain the fix. A real
  debugging moment is worth more than a flawless take.
* Close the session with `make destroy` if you deployed to AWS, so the demo
  does not keep costing money.
