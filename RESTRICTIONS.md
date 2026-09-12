# RESTRICTIONS.md

Hard rules for this repository. These are not preferences - breaking one is a
defect, even if the build passes.

## Never commit

1. **AWS credentials** - access keys, session tokens, `~/.aws` contents.
2. **PostgreSQL passwords** - local or RDS.
3. **JWT signing secrets.**
4. **Admin passwords** - not in code, seeds, tests, docs or Terraform.

Only `.env.example` and `terraform.tfvars.example` are committed, and they
contain placeholders. Terraform state is gitignored because it can contain
generated secrets and database endpoints.

## Never do to the infrastructure

5. **Never make RDS publicly accessible.** `publicly_accessible = false`
   stays. The database lives in private subnets with no internet route.
6. **Never make the frontend S3 bucket public.** All four public-access blocks
   stay on; CloudFront reads it through Origin Access Control only.
7. **Never add Kubernetes or EKS.** The assignment specifies ECS/Fargate.
8. **Never create Multi-AZ, production-sized infrastructure for this demo.**
   Single-AZ, one small task, smallest sensible instance.
9. **Never add a NAT Gateway without a clear, documented need.** It roughly
   doubles the monthly cost of this stack.
10. **Never destroy unrelated AWS resources.** Destroy is scoped to this
    Terraform state and this project's tags. No account-wide deletion commands.

## Never do to the stack

11. **Never add MongoDB** or any other primary datastore. PostgreSQL is the
    database.
12. **Never replace FastAPI** with another backend framework.
13. **Never replace React** with another frontend framework.
14. **Never replace Terraform with click-ops.** If it exists in AWS, it exists
    in `terraform/`.

## Never do to the application

15. **Never hard-code API endpoints** in components. The base URL comes from
    `VITE_API_BASE_URL`; production uses same-origin `/api`.
16. **Never remove the database-level duplicate-review protection.**
    `uq_reviews_course_id_normalized_email` is the guarantee that two
    simultaneous submissions cannot both succeed. Frontend and service checks
    are conveniences on top of it, never a replacement.
17. **Never trust client-submitted aggregates.** Average rating, review count
    and the distribution are always computed in SQL from stored reviews.
18. **Never expose stack traces, SQL or credentials** in an API response. The
    handlers in `app/core/exceptions.py` return a safe envelope; keep it that
    way.
19. **Never weaken authentication** to make the admin UI easier to build, and
    never remove a database constraint to make a test pass.
20. **Never leave an important feature as a TODO comment**, and never claim
    completion without running the relevant validation and reporting the real
    result.

## Logging

Never log passwords, JWTs, full `Authorization` headers, database URLs or AWS
secrets. Request logs contain timestamp, request id, method, path, status code
and duration - nothing sensitive.
