# Project rules

Practical conventions for day-to-day work. The non-negotiables are in
[../RESTRICTIONS.md](../RESTRICTIONS.md); the wider context is in
[../CLAUDE.md](../CLAUDE.md).

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Python modules, functions | `snake_case` | `submit_review` |
| Python classes | `PascalCase` | `DuplicateReviewError` |
| React components and files | `PascalCase` | `CourseCard.tsx` |
| Hooks | `useThing.ts` | `useApiResource.ts` |
| TypeScript types | `PascalCase` | `CourseListItem` |
| API JSON fields | `snake_case` (matches Pydantic) | `average_rating` |
| Terraform resources | `snake_case`, prefixed by `local.name_prefix` | `coursepulse-dev-alb` |
| Error codes | `SCREAMING_SNAKE_CASE` | `DUPLICATE_REVIEW` |

## Backend

* One responsibility per module. If a service function is doing SQL, move it
  to a repository.
* Return schemas from services, not ORM objects, when the caller is a route.
* Commit transactions in the service layer; repositories flush, services
  commit. Translate `IntegrityError` into a domain error - never let it become
  a 500.
* New query pattern → check whether an index covers it.
* Add a test for every bug you fix.

## Frontend

* A component either fetches or presents; container pages fetch, presentation
  components take props.
* Every list screen handles: loading (skeleton), error (with retry), empty
  (with a way forward), and content.
* Filters that change what the server returns belong in the URL, so a filtered
  view is shareable and the back button works.
* Debounce free-text search (350 ms) before it reaches the API.
* Buttons that trigger requests show a loading state and cannot be
  double-clicked.

## Accessibility checklist for any new UI

* Semantic elements (`<nav>`, `<main>`, `<article>`, `<table>`) over `<div>`.
* Every input has a `<label>`; errors use `aria-invalid` + `aria-describedby`.
* Status is never colour-only - include text or an icon.
* Interactive elements are reachable and operable by keyboard, with a visible
  focus ring.
* Test at 375 px, 768 px and desktop. No horizontal page scroll.

## Testing

* Backend: `make test-backend` (real PostgreSQL). Frontend: `make test-frontend`.
* Name tests after the behaviour: `test_hiding_a_review_removes_it_from_public_aggregates`.
* Prefer asserting on user-visible behaviour and exact numbers over snapshots.
* Fixtures with known ratings make aggregate assertions exact - keep it that way.

## Git

* Small, focused commits with imperative messages: `Add rating distribution
  endpoint`.
* Never commit `.env`, `terraform.tfstate`, `node_modules/`, `dist/` or
  `.venv/`.
* CI must be green before merging to `main`, because `main` deploys.

## Documentation

* A change to architecture, API shape or deployment steps updates
  `README.md` in the same commit.
* A change to what is demonstrable updates `docs/ACCEPTANCE_CHECKLIST.md`.
* Comments explain **why**, not what. Delete comments that restate the code.
