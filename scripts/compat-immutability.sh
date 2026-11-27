#!/usr/bin/env bash
# Fails when released compat fixtures or compat.lock lines were changed, deleted or renamed since the base.
# Base is the previous release tag (HEAD^), because on a release-tag build HEAD carries the new tag itself.
# Local checks override the base with COMPAT_BASE=<ref>, e.g. COMPAT_BASE=HEAD on a clean tree.
set -euo pipefail

readonly FIXTURES=tests/compat/fixtures
readonly LOCK=tests/compat/compat.lock

cd "$(dirname "$0")/.."

resolve_base() {
  if [ -n "${COMPAT_BASE:-}" ]; then
    printf '%s\n' "$COMPAT_BASE"
    return 0
  fi
  # Release tags only (x.y.z): dev/* workflow tags must never become the base.
  git describe --tags --abbrev=0 --match '[0-9]*.[0-9]*.[0-9]*' HEAD^ 2>/dev/null || true
}

check_fixtures() {
  local base=$1 changed
  # --no-renames: a rename must surface as a delete of the old path; rename detection would hide it from MD.
  changed=$(git diff --no-renames --name-only --diff-filter=MD "$base" -- "$FIXTURES")
  if [ -n "$changed" ]; then
    echo "Released compat fixtures modified or deleted since $base:" >&2
    printf '%s\n' "$changed" | sed 's/^/  /' >&2
    return 1
  fi
}

check_lock() {
  local base=$1 removed
  if ! git cat-file -e "$base:$LOCK" 2>/dev/null; then
    echo "No $LOCK at $base: lock not checked."
    return 0
  fi
  if [ ! -f "$LOCK" ]; then
    echo "$LOCK is missing but exists at $base." >&2
    return 1
  fi
  removed=$(git show "$base:$LOCK" | grep -vxF -f "$LOCK" || true)
  if [ -n "$removed" ]; then
    echo "Lock lines changed or removed since $base:" >&2
    printf '%s\n' "$removed" | sed 's/^/  /' >&2
    return 1
  fi
}

main() {
  local base
  base=$(resolve_base)
  if [ -z "$base" ]; then
    echo "no earlier tag: nothing to check"
    exit 0
  fi
  check_fixtures "$base"
  check_lock "$base"
  echo "compat fixtures and lock unchanged since $base"
}

main "$@"
