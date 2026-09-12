"""Static demonstration data used by ``seed.py``.

Kept separate from the seeding logic so the data is easy to read, review and
extend without touching the idempotency rules.
"""

from __future__ import annotations

from typing import TypedDict


class CourseSpec(TypedDict):
    title: str
    mentor: str
    category: str
    duration: str
    description: str


COURSES: list[CourseSpec] = [
    {
        "title": "FastAPI Production APIs",
        "mentor": "Dr. Neha Verma",
        "category": "Python",
        "duration": "6 weeks",
        "description": (
            "Design, test and ship production FastAPI services. Covers dependency injection, "
            "Pydantic v2 validation, layered architecture, transactions with SQLAlchemy 2.x, "
            "structured logging and container deployment behind a load balancer."
        ),
    },
    {
        "title": "AWS Cloud Foundations",
        "mentor": "Rahul Mehta",
        "category": "Cloud Computing",
        "duration": "8 weeks",
        "description": (
            "A grounded tour of the AWS building blocks teams actually use: VPC networking, IAM "
            "least privilege, S3, CloudFront, ECS on Fargate, RDS and CloudWatch, with a running "
            "cost conversation at every step."
        ),
    },
    {
        "title": "Docker & Kubernetes Fundamentals",
        "mentor": "Priya Nair",
        "category": "DevOps",
        "duration": "5 weeks",
        "description": (
            "Build small images that start fast, understand layers and caching, then move from a "
            "single container to scheduled workloads. Includes health checks, log handling and "
            "twelve-factor configuration."
        ),
    },
    {
        "title": "Terraform Infrastructure as Code",
        "mentor": "Arjun Kulkarni",
        "category": "DevOps",
        "duration": "6 weeks",
        "description": (
            "Model real infrastructure with Terraform: variables, locals, outputs, dependency "
            "graphs, state management and safe destroy paths. Ends with a full VPC, ALB, ECS and "
            "RDS stack you can tear down cleanly."
        ),
    },
    {
        "title": "React Modern Frontend Development",
        "mentor": "Sneha Iyer",
        "category": "Web Development",
        "duration": "7 weeks",
        "description": (
            "Component design, typed props, data fetching, routing and accessible forms with React "
            "and TypeScript. Emphasises loading, empty and error states because real users meet "
            "those far more often than the happy path."
        ),
    },
    {
        "title": "PostgreSQL for Developers",
        "mentor": "Vikram Desai",
        "category": "Database",
        "duration": "5 weeks",
        "description": (
            "Schema design, constraints, indexes and query plans. Learn why a unique constraint "
            "beats an application check, how to read EXPLAIN ANALYZE, and how connection pooling "
            "changes application behaviour under load."
        ),
    },
    {
        "title": "Building AI Agents",
        "mentor": "Dr. Ananya Rao",
        "category": "Artificial Intelligence",
        "duration": "8 weeks",
        "description": (
            "From a single model call to a reliable agent: tool schemas, planning loops, retries, "
            "evaluation harnesses and cost control. Focuses on measurable behaviour rather than "
            "prompt folklore."
        ),
    },
    {
        "title": "Graph RAG Fundamentals",
        "mentor": "Dr. Ananya Rao",
        "category": "Artificial Intelligence",
        "duration": "4 weeks",
        "description": (
            "Retrieval augmented generation over graph structured knowledge. Entity extraction, "
            "relationship modelling, hybrid retrieval and honest evaluation of answer quality "
            "against a labelled set."
        ),
    },
    {
        "title": "DevOps CI/CD Engineering",
        "mentor": "Karthik Menon",
        "category": "DevOps",
        "duration": "6 weeks",
        "description": (
            "Build pipelines that fail loudly and deploy boringly. Branch strategy, test gates, "
            "artefact promotion, OIDC based cloud authentication, database migrations during "
            "deployment and rollback planning."
        ),
    },
    {
        "title": "API Security Engineering",
        "mentor": "Farhan Qureshi",
        "category": "Cybersecurity",
        "duration": "5 weeks",
        "description": (
            "Threat model an HTTP API, then fix it: authentication, token lifetime, authorization "
            "boundaries, input validation, safe error responses, secret handling and the logging "
            "rules that keep credentials out of your log store."
        ),
    },
    {
        "title": "Python Data Engineering Pipelines",
        "mentor": "Meera Joshi",
        "category": "Data Engineering",
        "duration": "7 weeks",
        "description": (
            "Ingest, validate, transform and load data without losing rows. Idempotent jobs, "
            "schema evolution, backfills, partitioning and the operational habits that make a "
            "pipeline trustworthy at 3am."
        ),
    },
    {
        "title": "Machine Learning in Production",
        "mentor": "Dr. Sanjay Pillai",
        "category": "Machine Learning",
        "duration": "9 weeks",
        "description": (
            "Everything after the notebook: feature pipelines, training reproducibility, model "
            "versioning, serving latency, drift monitoring and the decision of when a model should "
            "not ship at all."
        ),
    },
    {
        "title": "Advanced SQL Query Optimisation",
        "mentor": "Vikram Desai",
        "category": "Database",
        "duration": "4 weeks",
        "description": (
            "Window functions, CTEs, aggregation strategies and index selection. Each module takes "
            "a slow query from a real application and makes it fast with measurements rather than "
            "guesses."
        ),
    },
    {
        "title": "TypeScript Deep Dive",
        "mentor": "Sneha Iyer",
        "category": "Web Development",
        "duration": "5 weeks",
        "description": (
            "Generics, narrowing, discriminated unions and declaration files. Learn to model your "
            "domain so the compiler catches the bugs your tests would otherwise have to, without "
            "drowning the codebase in type gymnastics."
        ),
    },
    {
        "title": "Cloud Cost Optimisation",
        "mentor": "Rahul Mehta",
        "category": "Cloud Computing",
        "duration": "3 weeks",
        "description": (
            "Read a cloud bill, find the waste and change the architecture that caused it. Right "
            "sizing, storage classes, data transfer traps, NAT gateway costs and the tagging "
            "discipline that makes any of it measurable."
        ),
    },
    {
        "title": "Python Testing and Quality",
        "mentor": "Dr. Neha Verma",
        "category": "Python",
        "duration": "4 weeks",
        "description": (
            "Write tests that survive refactoring. Fixtures, isolation, database test strategy, "
            "meaningful assertions, coverage as a signal rather than a target, and linting that "
            "helps instead of nagging."
        ),
    },
    {
        "title": "Observability with CloudWatch",
        "mentor": "Karthik Menon",
        "category": "Cloud Computing",
        "duration": "3 weeks",
        "description": (
            "Turn logs, metrics and dashboards into answers. Structured logging, request "
            "correlation IDs, useful alarms, and how to investigate a latency spike without "
            "guessing which service caused it."
        ),
    },
]

# Fixed reviewer pool: the same students appear across courses, which keeps the
# seed deterministic and makes the duplicate-review rule easy to demonstrate.
STUDENTS: list[tuple[str, str]] = [
    ("Aditi Sharma", "aditi.sharma@example.com"),
    ("Rohan Gupta", "rohan.gupta@example.com"),
    ("Fatima Khan", "fatima.khan@example.com"),
    ("Daniel Oyelaran", "daniel.oyelaran@example.com"),
    ("Mei Lin Chen", "meilin.chen@example.com"),
    ("Carlos Rivera", "carlos.rivera@example.com"),
    ("Ishaan Bhatt", "ishaan.bhatt@example.com"),
    ("Nadia Petrova", "nadia.petrova@example.com"),
    ("Tanvi Raut", "tanvi.raut@example.com"),
    ("Omar Haddad", "omar.haddad@example.com"),
    ("Grace Mwangi", "grace.mwangi@example.com"),
    ("Kenji Watanabe", "kenji.watanabe@example.com"),
    ("Laura Bianchi", "laura.bianchi@example.com"),
    ("Siddharth Rane", "siddharth.rane@example.com"),
]

# Review text pools per rating, so a 5-star comment never reads like a 2-star one.
REVIEW_TEXTS: dict[int, list[str]] = {
    5: [
        "Easily the most useful course I have taken this year. The labs mirror real work and the "
        "mentor explains the reasoning behind every decision, not just the steps.",
        "Exceptional depth without losing clarity. I shipped a change at work during week three "
        "using exactly what was taught in the session on testing.",
        "The pacing is excellent and every module ends with something you can actually run. "
        "Questions in the live sessions were answered thoroughly.",
        "Clear explanations, genuinely useful hands-on exercises and feedback on submitted work "
        "within a day. Worth the time investment.",
    ],
    4: [
        "Strong content and a well structured path. I would have liked one more exercise on the "
        "deployment section, but the fundamentals are covered properly.",
        "Very good course overall. A couple of the recorded videos are slightly out of date "
        "compared to the current tooling, though the written notes are accurate.",
        "Learned a lot and the mentor is clearly experienced. The first two weeks move quickly if "
        "you are new to the topic.",
        "Solid, practical and honest about trade-offs. Docked a star only because the project "
        "brief could be more specific.",
    ],
    3: [
        "Reasonable introduction, but I expected more depth in the later modules. Good if you are "
        "starting out, less so if you already work with this daily.",
        "Useful material, uneven delivery. Some sessions are excellent and others feel rushed "
        "towards the end of the hour.",
        "The concepts are explained well enough, however the exercises repeat the same pattern "
        "several times instead of building on each other.",
    ],
    2: [
        "The topics are relevant but the course assumes a lot of prior knowledge that was not "
        "listed in the prerequisites. I struggled to keep up.",
        "Content is thin relative to the duration. Several exercises did not run without "
        "undocumented setup steps.",
    ],
    1: [
        "Not what was advertised. The examples did not work and support requests went unanswered "
        "for over a week.",
    ],
}

# Ratings are drawn from this weighted pool: realistic platforms skew positive
# but still carry enough spread to make the distribution chart interesting.
RATING_POOL: list[int] = [5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2, 1]
