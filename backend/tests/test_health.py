"""Health, readiness and error-envelope behaviour."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_returns_healthy(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["environment"] == "test"


def test_health_includes_request_id_header(client: TestClient) -> None:
    response = client.get("/health")

    assert response.headers["X-Request-ID"]


def test_health_echoes_supplied_request_id(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "trace-12345"})

    assert response.headers["X-Request-ID"] == "trace-12345"


def test_readiness_reports_database_connected(client: TestClient) -> None:
    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "connected"}


def test_security_headers_are_present(client: TestClient) -> None:
    response = client.get("/health")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_unknown_path_uses_standard_error_envelope(client: TestClient) -> None:
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["request_id"]


def test_root_returns_service_banner(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["docs"] == "/docs"


def test_cors_origins_accepts_a_comma_separated_environment_value() -> None:
    """CORS_ORIGINS is supplied as a plain string by Docker Compose and ECS."""
    from app.core.config import Settings

    settings = Settings(cors_origins="http://localhost:5173, https://example.cloudfront.net")

    assert settings.cors_origins == [
        "http://localhost:5173",
        "https://example.cloudfront.net",
    ]


def test_cors_origins_falls_back_to_the_vite_dev_origin() -> None:
    from app.core.config import Settings

    # Ignore a developer's local ../.env: this test is specifically for the
    # built-in fallback and must behave identically locally and in CI.
    assert Settings(_env_file=None).cors_origins == ["http://localhost:5173"]
