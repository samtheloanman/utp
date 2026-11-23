#!/usr/bin/env bash
# check-coding-standards-caps.sh
# Hard gate enforcing AGENTS.md <= 100 lines, docs/CODING_STANDARDS.md <= 150 lines,
# single-source-of-truth CLAUDE.md/GEMINI.md, and zero stale fleet contradictions.
set -euo pipefail

REPO_ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
AGENTS_CAP=100
STANDARDS_CAP=150
POINTER_CAP=15

errors=0
fail() {
  echo "[coding-standards] FAIL: $*" >&2
  errors=$((errors + 1))
}

AGENTS_FILE="$REPO_ROOT/AGENTS.md"
STANDARDS_FILE="$REPO_ROOT/docs/CODING_STANDARDS.md"

if [[ ! -f "$AGENTS_FILE" ]]; then
  fail "Missing AGENTS.md at $AGENTS_FILE"
else
  agents_lines=$(wc -l < "$AGENTS_FILE" | tr -d ' ')
  if (( agents_lines > AGENTS_CAP )); then
    fail "AGENTS.md has $agents_lines lines (cap: <= $AGENTS_CAP). Move detail to docs/CODING_STANDARDS.md or nested AGENTS.md."
  fi
  if grep -q "^ijfw_version:" "$AGENTS_FILE"; then
    fail "AGENTS.md contains auto-generated ijfw_version YAML frontmatter. Strip frontmatter (keep 1-line pointer only if needed)."
  fi
  if grep -q "gh pr merge" "$AGENTS_FILE"; then
    # Allow explicit prohibition ("Never run `gh pr merge`")? Spec criterion 2 literally tests `! grep -q "gh pr merge" AGENTS.md`!
    fail "AGENTS.md mentions 'gh pr merge' (violates fleet rule & spec criterion: ! grep -q 'gh pr merge' AGENTS.md)."
  fi
  if grep -q "Multi-Agent Planning Coordination (GSD)" "$AGENTS_FILE"; then
    fail "AGENTS.md contains stale GSD section ('Multi-Agent Planning Coordination (GSD)'). Workflow is superpowers, not GSD."
  fi
fi

if [[ ! -f "$STANDARDS_FILE" ]]; then
  fail "Missing docs/CODING_STANDARDS.md at $STANDARDS_FILE"
else
  std_lines=$(wc -l < "$STANDARDS_FILE" | tr -d ' ')
  if (( std_lines > STANDARDS_CAP )); then
    fail "docs/CODING_STANDARDS.md has $std_lines lines (cap: <= $STANDARDS_CAP). Automate rules into linters/tests and prune prose."
  fi
fi

for alias_name in CLAUDE.md GEMINI.md; do
  alias_path="$REPO_ROOT/$alias_name"
  if [[ -L "$alias_path" ]]; then
    target=$(readlink "$alias_path")
    if [[ "$target" != "AGENTS.md" && "$target" != "./AGENTS.md" ]]; then
      fail "$alias_name symlink points to '$target' (expected 'AGENTS.md')."
    fi
  elif [[ -f "$alias_path" ]]; then
    alias_lines=$(wc -l < "$alias_path" | tr -d ' ')
    if (( alias_lines > POINTER_CAP )); then
      fail "$alias_name is a regular file with $alias_lines lines (must be symlink to AGENTS.md, absent, or <= $POINTER_CAP-line pointer referencing AGENTS.md)."
    elif ! grep -q "AGENTS.md" "$alias_path"; then
      fail "$alias_name does not reference AGENTS.md."
    fi
  fi
done

if (( errors > 0 )); then
  echo "[coding-standards] $errors check(s) failed in $REPO_ROOT" >&2
  exit 1
fi

echo "[coding-standards] PASS: caps & hygiene verified ($REPO_ROOT)"
