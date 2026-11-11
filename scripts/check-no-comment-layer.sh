#!/usr/bin/env bash
# Fails when the local comment layer (issue #8) leaks into this repo.
# The layer lives in its own repo and must never reach master or the production image.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

status=0

matches=$(git grep -nE "__comments|robopipe-comments|rp-comments" -- . \
  ':(exclude)docs/specs/8-local-comments/' \
  ':(exclude)scripts/check-no-comment-layer.sh' \
  ':(exclude).github/workflows/no-comment-layer.yml' || true)
if [ -n "$matches" ]; then
  echo "Comment layer reference found:"
  echo "$matches"
  status=1
fi

if grep -nE '"(http-proxy-3|@medv/finder)"' package.json; then
  echo "Comment layer dependency found in package.json."
  status=1
fi

if [ "$status" -eq 0 ]; then
  echo "OK: no comment layer in this repo."
fi
exit "$status"
