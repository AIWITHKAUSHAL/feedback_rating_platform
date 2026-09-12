/**
 * Small k6 read-path load test for CoursePulse.
 *
 *   k6 run -e BASE_URL=https://xxxxxxxx.cloudfront.net load-test/courses.js
 *   k6 run -e BASE_URL=http://localhost:8000 load-test/courses.js
 *
 * Deliberately gentle. The demo environment is one 0.25 vCPU Fargate task in
 * front of a db.t4g.micro database: the point is to observe pagination,
 * indexed queries and CloudWatch metrics under mild concurrency, NOT to prove
 * a throughput figure. Do not point a heavy test at the demo stack.
 *
 * Only read endpoints are exercised. Review submission is skipped on purpose:
 * one review per email per course is a database constraint, so a load test
 * would either fail with 409s or pollute real demo data.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:8000").replace(/\/$/, "");

const catalogueLatency = new Trend("catalogue_latency", true);
const detailLatency = new Trend("detail_latency", true);

export const options = {
  scenarios: {
    browsing: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 }, // warm up
        { duration: "1m", target: 10 }, // steady browsing
        { duration: "30s", target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    // Generous, because a cold Fargate task and a t4g.micro database are not
    // a performance tier.
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
    catalogue_latency: ["p(95)<1500"],
  },
};

const FILTERS = [
  "",
  "?category=DevOps",
  "?min_rating=4",
  "?search=python",
  "?sort=most_reviewed",
  "?page=2&page_size=6",
];

export default function () {
  // 1. Browse the catalogue with a rotating filter.
  const filter = FILTERS[Math.floor(Math.random() * FILTERS.length)];
  const listResponse = http.get(`${BASE_URL}/api/courses${filter}`, {
    tags: { endpoint: "courses_list" },
  });
  catalogueLatency.add(listResponse.timings.duration);

  const listOk = check(listResponse, {
    "catalogue returns 200": (response) => response.status === 200,
    "catalogue is paginated": (response) => response.json("page") !== undefined,
  });

  // 2. Open one of the returned courses.
  if (listOk) {
    const items = listResponse.json("items") || [];
    if (items.length > 0) {
      const course = items[Math.floor(Math.random() * items.length)];
      const detailResponse = http.get(`${BASE_URL}/api/courses/${course.id}`, {
        tags: { endpoint: "course_detail" },
      });
      detailLatency.add(detailResponse.timings.duration);

      check(detailResponse, {
        "detail returns 200": (response) => response.status === 200,
        "detail includes the rating distribution": (response) =>
          (response.json("rating_distribution") || []).length === 5,
      });
    }
  }

  // 3. Hero statistics, as the home page would.
  check(http.get(`${BASE_URL}/api/stats`, { tags: { endpoint: "stats" } }), {
    "stats returns 200": (response) => response.status === 200,
  });

  sleep(Math.random() * 2 + 1); // think time
}
