# CoursePulse backend image.
#
# Small, non-root and production-ready: dependencies are installed in their own
# layer so application edits do not invalidate the pip cache.
FROM python:3.12-slim-bookworm

# Predictable Python behaviour in containers.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# psycopg[binary] ships its own libpq, so no build toolchain is needed here.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code last: the layers above stay cached between deployments.
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# The ALB health check hits /health; this keeps `docker ps` honest locally too.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

# Schema changes are applied by `alembic upgrade head` as an explicit
# deployment step (see scripts/deploy.sh), never implicitly at container start.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
