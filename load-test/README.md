# Load test

A small [k6](https://k6.io/) test for the CoursePulse read path.

```bash
# local stack
k6 run -e BASE_URL=http://localhost:8000 load-test/courses.js

# deployed environment
k6 run -e BASE_URL="$(make url)" load-test/courses.js
```

## What it covers

| Endpoint | Why |
| --- | --- |
| `GET /api/courses` (with rotating filters) | Pagination and the indexed catalogue query |
| `GET /api/courses/{id}` | Aggregates, rating distribution and recent reviews |
| `GET /api/stats` | Home page counters |

## What it deliberately does not do

* **No review submission.** `uq_reviews_course_id_normalized_email` allows one
  review per email per course, so repeated submissions would either return 409
  or fill the demo database with junk.
* **No high concurrency.** The demo runs a single 0.25 vCPU Fargate task in
  front of a `db.t4g.micro` instance. Ten virtual users is enough to watch
  CPU, latency and connection counts move on the CloudWatch dashboard. Treat
  the numbers as a smoke test, not a capacity benchmark.

## Reading the results

Watch these while the test runs (`make aws-logs`, or the CloudWatch
dashboard `coursepulse-dev-overview`):

* `TargetResponseTime` p95 on the ALB
* `CPUUtilization` on the ECS service - if it crosses 60% the autoscaling
  policy adds a task
* `DatabaseConnections` on RDS - SQLAlchemy pooling should keep this flat
