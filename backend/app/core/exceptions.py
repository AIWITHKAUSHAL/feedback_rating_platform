"""Application errors and the handlers that turn them into JSON responses.

Every error leaves the API in the same shape::

    {
      "success": false,
      "error": {"code": "DUPLICATE_REVIEW", "message": "..."},
      "request_id": "..."
    }

Stack traces and database messages never reach the client.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_ctx

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for expected, client-facing errors."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "BAD_REQUEST"
    message: str = "The request could not be processed."

    def __init__(self, message: str | None = None, *, details: Any = None) -> None:
        super().__init__(message or self.message)
        self.message = message or self.message
        self.details = details


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
    message = "The requested resource was not found."


class CourseNotFoundError(NotFoundError):
    code = "COURSE_NOT_FOUND"
    message = "Course not found."


class ReviewNotFoundError(NotFoundError):
    code = "REVIEW_NOT_FOUND"
    message = "Review not found."


class DuplicateReviewError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "DUPLICATE_REVIEW"
    message = "You have already reviewed this course."


class DuplicateCourseError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "DUPLICATE_COURSE"
    message = "A course with this title already exists."


class AuthenticationError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "AUTHENTICATION_FAILED"
    message = "Invalid credentials."


class InvalidTokenError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "INVALID_TOKEN"
    message = "Your session is invalid or has expired. Please sign in again."


class PayloadTooLargeError(AppError):
    status_code = 413
    code = "PAYLOAD_TOO_LARGE"
    message = "Request body is too large."


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Build the standard error envelope."""
    error: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    body = {
        "success": False,
        "error": error,
        "request_id": request_id_ctx.get(),
    }
    return JSONResponse(status_code=status_code, content=body, headers=headers)


# Maps generic HTTP status codes to stable machine readable codes.
_HTTP_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    429: "TOO_MANY_REQUESTS",
}


def register_exception_handlers(app: FastAPI) -> None:
    """Attach every exception handler to the FastAPI application."""

    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {
                "field": ".".join(str(part) for part in err["loc"][1:]) or str(err["loc"][0]),
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        return error_response(
            422,
            "VALIDATION_ERROR",
            "Some of the submitted values are invalid.",
            details,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _HTTP_CODES.get(exc.status_code, "HTTP_ERROR")
        headers = dict(exc.headers) if exc.headers else None
        return error_response(exc.status_code, code, str(exc.detail), headers=headers)

    @app.exception_handler(IntegrityError)
    async def _integrity_error(_: Request, exc: IntegrityError) -> JSONResponse:
        # A constraint fired that the service layer did not translate. Log the
        # detail for operators, return a generic conflict to the client.
        logger.warning("database_integrity_error", extra={"detail": str(exc.orig)})
        return error_response(
            status.HTTP_409_CONFLICT,
            "CONFLICT",
            "The request conflicts with existing data.",
        )

    @app.exception_handler(SQLAlchemyError)
    async def _database_error(_: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.exception("database_error", extra={"error_type": type(exc).__name__})
        return error_response(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "DATABASE_UNAVAILABLE",
            "The service is temporarily unable to reach its database.",
        )

    @app.exception_handler(Exception)
    async def _unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error", extra={"error_type": type(exc).__name__})
        return error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "An unexpected error occurred. Please try again.",
        )
