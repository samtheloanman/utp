#!/usr/bin/env bash
# pre-commit-diff-guard.sh
# Diff-scoped mechanical harness:
#   1. Enforces AGENTS.md / docs/CODING_STANDARDS.md line caps & hygiene
#   2. Scans staged diff for secrets (gitleaks if available + deterministic regex fallback)
#   3. Lints staged TS/JS files with strict rules (no-explicit-any, no-unused-vars, no-empty catch)
#   4. Lints staged Python files with ruff (if installed)
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Line-cap & hygiene gate
if [[ -x "$SCRIPT_DIR/check-coding-standards-caps.sh" ]]; then
  "$SCRIPT_DIR/check-coding-standards-caps.sh" "$REPO_ROOT"
elif [[ -x "$REPO_ROOT/scripts/check-coding-standards-caps.sh" ]]; then
  "$REPO_ROOT/scripts/check-coding-standards-caps.sh" "$REPO_ROOT"
fi

# Collect staged added/modified files (exclude deleted)
STAGED_FILES=()
while IFS= read -r f; do
  [[ -n "$f" ]] && STAGED_FILES+=("$f")
done < <(git -c core.quotepath=false diff --cached --name-only --diff-filter=ACM)

if [[ ${#STAGED_FILES[@]} -eq 0 ]]; then
  exit 0
fi

# 2. Diff-scoped secret scan
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect --staged --no-banner --redact
fi

# Deterministic regex fallback for common leaked secrets in added lines
SECRET_PATTERN='(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----)'
if git diff --cached -U0 -- . ':!*.lock' ':!package-lock.json' | grep -E '^\+[^+]' | grep -Eq "$SECRET_PATTERN"; then
  echo "[pre-commit] FAIL: Potential hardcoded secret detected in staged diff. Remove it and load via env/Secret Manager." >&2
  exit 1
fi

# 3. Diff-scoped TS/JS strict lint (changed files only)
TS_FILES=()
for f in "${STAGED_FILES[@]}"; do
  case "$f" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
      TS_FILES+=("$f")
      ;;
  esac
done

run_eslint_in() {
  local base_dir="$1"
  shift
  local eslint_bin="$base_dir/node_modules/.bin/eslint"
  if [[ -d "$base_dir/node_modules/@typescript-eslint" || -d "$base_dir/node_modules/typescript-eslint" ]]; then
    (cd "$base_dir" && "$eslint_bin" --no-warn-ignored \
      --rule '@typescript-eslint/no-explicit-any: error' \
      --rule '@typescript-eslint/no-unused-vars: [error, {argsIgnorePattern: ^_, varsIgnorePattern: ^_, caughtErrorsIgnorePattern: ^_}]' \
      --rule 'no-empty: [error, {allowEmptyCatch: false}]' \
      "$@")
  else
    (cd "$base_dir" && "$eslint_bin" --no-warn-ignored \
      --rule 'no-unused-vars: [error, {argsIgnorePattern: ^_, varsIgnorePattern: ^_, caughtErrorsIgnorePattern: ^_}]' \
      --rule 'no-empty: [error, {allowEmptyCatch: false}]' \
      "$@")
  fi
}

FALLBACK_TS_FILES=()
if [[ ${#TS_FILES[@]} -gt 0 ]]; then
  if [[ -x "$REPO_ROOT/node_modules/.bin/eslint" ]]; then
    run_eslint_in "$REPO_ROOT" "${TS_FILES[@]}"
  elif [[ -x "$REPO_ROOT/web/node_modules/.bin/eslint" ]]; then
    WEB_TS_FILES=()
    for f in "${TS_FILES[@]}"; do
      if [[ "$f" == web/* ]]; then
        WEB_TS_FILES+=("${f#web/}")
      else
        FALLBACK_TS_FILES+=("$f")
      fi
    done
    if [[ ${#WEB_TS_FILES[@]} -gt 0 ]]; then
      run_eslint_in "$REPO_ROOT/web" "${WEB_TS_FILES[@]}"
    fi
  else
    FALLBACK_TS_FILES=("${TS_FILES[@]}")
  fi
fi

# Deterministic fallback when ESLint is not installed (e.g., repos without ESLint or fresh worktrees)
if [[ ${#FALLBACK_TS_FILES[@]} -gt 0 ]]; then
  if git diff --cached -U0 -- "${FALLBACK_TS_FILES[@]}" \
    | grep -E '^\+[^+]' \
    | grep -Ev '^\+[[:space:]]*(//|\*)' \
    | grep -Eq 'catch[[:space:]]*(\([^)]*\))?[[:space:]]*\{[[:space:]]*\}'; then
    echo "[pre-commit] FAIL: Empty catch {} block detected in staged TS/JS diff. Log with context, handle, or rethrow." >&2
    exit 1
  fi

  FALLBACK_TS_ONLY=()
  for f in "${FALLBACK_TS_FILES[@]}"; do
    case "$f" in
      *.ts|*.tsx) FALLBACK_TS_ONLY+=("$f") ;;
    esac
  done
  if [[ ${#FALLBACK_TS_ONLY[@]} -gt 0 ]]; then
    if git diff --cached -U0 -- "${FALLBACK_TS_ONLY[@]}" \
      | grep -E '^\+[^+]' \
      | grep -Ev '^\+[[:space:]]*(//|\*)' \
      | grep -Eq '(:[[:space:]]*any([^A-Za-z0-9_]|$)|[^A-Za-z0-9_]as[[:space:]]+any([^A-Za-z0-9_]|$))'; then
      echo "[pre-commit] FAIL: Explicit 'any' detected in staged TypeScript diff. Use 'unknown' + narrowing/validators." >&2
      exit 1
    fi
  fi
fi

# 4. Diff-scoped Python lint (changed files only)
PY_FILES=()
for f in "${STAGED_FILES[@]}"; do
  case "$f" in
    *.py)
      PY_FILES+=("$f")
      ;;
  esac
done

if [[ ${#PY_FILES[@]} -gt 0 ]]; then
  if command -v ruff >/dev/null 2>&1; then
    ruff check "${PY_FILES[@]}"
  elif [[ -x "$REPO_ROOT/.venv/bin/ruff" ]]; then
    "$REPO_ROOT/.venv/bin/ruff" check "${PY_FILES[@]}"
  elif command -v uvx >/dev/null 2>&1; then
    uvx ruff check "${PY_FILES[@]}"
  elif [[ -x "$HOME/.local/bin/uvx" ]]; then
    "$HOME/.local/bin/uvx" ruff check "${PY_FILES[@]}"
  fi
fi
