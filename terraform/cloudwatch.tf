# ---------------------------------------------------------------------------
# Logging and the operations dashboard.
#
# The API writes one JSON line per request (timestamp, request_id, method,
# path, status_code, duration_ms), which CloudWatch Logs Insights can query
# directly - see README.md "Viewing logs".
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}-backend"
  retention_in_days = var.log_retention_days

  tags = { Name = "${local.name_prefix}-backend-logs" }
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "ALB - requests and errors"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "HTTPCode_Target_5XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "ALB - latency and healthy hosts"
          region = var.aws_region
          view   = "timeSeries"
          period = 300
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix,
            { stat = "p95" }],
            ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup",
              aws_lb_target_group.backend.arn_suffix, "LoadBalancer", aws_lb.main.arn_suffix,
            { stat = "Average" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "ECS - CPU and memory utilisation"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Average"
          period = 300
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name,
            "ServiceName", aws_ecs_service.backend.name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "RDS - CPU, connections and free storage"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Average"
          period = 300
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.identifier],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeStorageSpace", ".", "."],
          ]
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          title  = "Recent API errors (status_code >= 500)"
          region = var.aws_region
          query  = <<-QUERY
            SOURCE '${aws_cloudwatch_log_group.backend.name}'
            | fields @timestamp, request_id, method, path, status_code, duration_ms
            | filter status_code >= 500
            | sort @timestamp desc
            | limit 20
          QUERY
        }
      },
    ]
  })
}

# One cheap, genuinely useful alarm: the API is returning server errors.
resource "aws_cloudwatch_metric_alarm" "backend_5xx" {
  alarm_name          = "${local.name_prefix}-backend-5xx"
  alarm_description   = "FastAPI returned 5 or more 5XX responses in 5 minutes"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = { Name = "${local.name_prefix}-backend-5xx" }
}
