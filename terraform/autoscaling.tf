# ---------------------------------------------------------------------------
# ECS Application Auto Scaling.
#
# Minimum 1 task (the demo default), scaling out on average CPU. A small demo
# environment like this is NOT equivalent to high-scale production capacity -
# see README.md "Production hardening" for what would change.
# ---------------------------------------------------------------------------

resource "aws_appautoscaling_target" "ecs" {
  count = var.enable_autoscaling ? 1 : 0

  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.autoscaling_min_capacity
  max_capacity       = var.autoscaling_max_capacity
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${local.name_prefix}-cpu-target-tracking"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.ecs[0].service_namespace
  resource_id        = aws_appautoscaling_target.ecs[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[0].scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value = var.autoscaling_cpu_target

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    # Scale out quickly, scale in slowly, so a traffic dip does not cause
    # flapping.
    scale_out_cooldown = 60
    scale_in_cooldown  = 300
  }
}
