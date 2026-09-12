# ---------------------------------------------------------------------------
# RDS PostgreSQL.
#
# Private, single-AZ, smallest sensible instance, encrypted storage.
# Reachable only from the ECS security group.
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-db-subnets"
  description = "Private subnets for the CoursePulse database"
  subnet_ids  = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-db-subnets" }
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2 # cheap headroom via storage autoscaling
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  # The database has no public endpoint - this must stay false.
  publicly_accessible = false
  multi_az            = false # single-AZ keeps the demo affordable

  backup_retention_period    = var.db_backup_retention_days
  backup_window              = "03:00-04:00"
  maintenance_window         = "sun:04:30-sun:05:30"
  auto_minor_version_upgrade = true

  # Demo deletion behaviour: no final snapshot and no deletion protection, so
  # `terraform destroy` completes without manual steps. For anything real,
  # set db_deletion_protection = true and skip_final_snapshot = false.
  deletion_protection      = var.db_deletion_protection
  skip_final_snapshot      = true
  delete_automated_backups = true
  copy_tags_to_snapshot    = true
  apply_immediately        = true

  # Performance Insights and enhanced monitoring are extra cost: left off.
  performance_insights_enabled    = false
  monitoring_interval             = 0
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = { Name = "${local.name_prefix}-postgres" }
}
