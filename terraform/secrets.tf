# ---------------------------------------------------------------------------
# Generated secrets.
#
# Nothing sensitive is written in this repository: Terraform generates the
# database password and the JWT signing key, stores them in AWS Secrets
# Manager, and ECS injects them into the container at start-up.
#
# Cost note: Secrets Manager charges ~$0.40 per secret per month (two secrets
# here). SSM Parameter Store SecureString would be free, but Secrets Manager
# integrates directly with the ECS task definition `secrets` block, which keeps
# the wiring short and easy to teach.
# ---------------------------------------------------------------------------

resource "random_password" "db" {
  length = 32
  # RDS forbids these characters in a master password, and keeping the value
  # URL-safe means it can be embedded in a connection string unescaped.
  special          = true
  override_special = "-_"
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

# Full SQLAlchemy URL, so the application needs exactly one secret to connect.
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${local.name_prefix}/database-url"
  description             = "PostgreSQL connection URL for the CoursePulse API"
  recovery_window_in_days = 0 # immediate delete, so destroy/recreate works in a demo

  tags = { Name = "${local.name_prefix}-database-url" }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = format(
    "postgresql+psycopg://%s:%s@%s:%s/%s",
    var.db_username,
    urlencode(random_password.db.result),
    aws_db_instance.main.address,
    aws_db_instance.main.port,
    var.db_name,
  )
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.name_prefix}/jwt-secret"
  description             = "Signing key for CoursePulse admin access tokens"
  recovery_window_in_days = 0

  tags = { Name = "${local.name_prefix}-jwt-secret" }
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt.result
}
