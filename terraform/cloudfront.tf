# ---------------------------------------------------------------------------
# One CloudFront distribution serves the whole application:
#
#   /*      -> private S3 bucket (React build)
#   /api/*  -> Application Load Balancer (FastAPI)
#   /health -> Application Load Balancer (useful for verification)
#
# Because the SPA and the API share an origin, the browser makes same-origin
# requests and CORS never comes into play in production.
# ---------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-s3-oac"
  description                       = "OAC for the private frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Caching disabled + all query strings/headers forwarded: API responses depend
# on filters and Authorization, so they must never be cached at the edge.
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# SPA routing: S3 has no object for /courses/10 or /admin/reviews, so rewrite
# any path whose last segment has no file extension to /index.html and let
# React Router resolve it.
#
# This runs on the S3 behavior only. A distribution-wide custom_error_response
# would also rewrite the API's own 404/403 responses into index.html with a
# 200, breaking the API contract for clients.
#
# CloudFront Functions do not support tags; Terraform still destroys this one
# together with the distribution.
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${local.name_prefix}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Serve index.html for client-side routes"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var lastSegment = request.uri.substring(request.uri.lastIndexOf('/') + 1);
      if (lastSegment.indexOf('.') === -1) {
        request.uri = '/index.html';
      }
      return request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  comment             = "${local.name_prefix} - CoursePulse frontend and API"
  default_root_object = "index.html"
  # North America + Europe only: the cheapest price class.
  price_class = "PriceClass_100"

  origin {
    origin_id                = "s3-frontend"
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    origin_id   = "alb-api"
    domain_name = aws_lb.main.dns_name

    custom_origin_config {
      http_port  = 80
      https_port = 443
      # The ALB listens on HTTP only (no custom domain, so no ACM certificate).
      # Viewer traffic is still HTTPS up to CloudFront.
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # React application.
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  # API and health endpoints -> ALB, never cached. No error rewriting here:
  # API status codes (404, 401, 409, 422) must reach the client unchanged.
  dynamic "ordered_cache_behavior" {
    for_each = local.api_path_patterns

    content {
      path_pattern             = ordered_cache_behavior.value
      target_origin_id         = "alb-api"
      viewer_protocol_policy   = "redirect-to-https"
      allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods           = ["GET", "HEAD"]
      compress                 = true
      cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # Uses the default *.cloudfront.net certificate - no custom domain, no cost.
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = { Name = "${local.name_prefix}-cdn" }
}
