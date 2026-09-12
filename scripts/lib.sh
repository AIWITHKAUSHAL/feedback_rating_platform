#!/usr/bin/env bash
# Shared helpers for the CoursePulse scripts.
# shellcheck shell=bash

set -euo pipefail

readonly TERRAFORM_DIR="${TERRAFORM_DIR:-terraform}"

# ------------------------------------------------------------------- output
info()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()    { printf '\033[1;32m  ✓\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m  !\033[0m %s\n' "$*" >&2; }
fail()  { printf '\033[1;31m  ✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------ prerequisites
require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "'$1' is required but was not found on PATH."
}

require_prerequisites() {
  local missing=0
  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      warn "missing required command: $cmd"
      missing=1
    fi
  done
  [[ $missing -eq 0 ]] || fail "Install the missing tools and try again."
}

require_aws_credentials() {
  aws sts get-caller-identity >/dev/null 2>&1 ||
    fail "AWS credentials are not valid. Run 'aws configure' or 'aws sso login' first."
  ok "AWS identity: $(aws sts get-caller-identity --query Arn --output text)"
}

# --------------------------------------------------------- terraform outputs
# Reads a Terraform output, or falls back to an environment variable of the
# same (upper-cased) name so the CI workflow can reuse these scripts.
tf_output() {
  local name="$1"
  local env_name
  env_name="$(printf '%s' "$name" | tr '[:lower:]' '[:upper:]')"

  if [[ -n "${!env_name:-}" ]]; then
    printf '%s' "${!env_name}"
    return 0
  fi

  terraform -chdir="$TERRAFORM_DIR" output -raw "$name" 2>/dev/null ||
    fail "Could not read Terraform output '$name'. Has 'terraform apply' run yet?"
}

# The commit being deployed; tags the image so every release is traceable.
git_sha() {
  git rev-parse --short=12 HEAD 2>/dev/null || printf 'notgit-%s' "$(date +%Y%m%d%H%M%S)"
}
