#!/usr/bin/env bash
# Local Jules loop runner. Lives at <repo>/jules/run.sh
# Dispatches in-repo task prompts to Jules (async cloud sessions -> PRs).
# Usage:
#   ./jules/run.sh <loop>          # run one loop
#   ./jules/run.sh all-scheduled   # run the recurring set (doc-sweep, cve, housekeeper)
#   ./jules/run.sh list            # show available loops
# Cron example (weekly, Mondays 2am):
#   0 2 * * 1  cd /path/to/repo && ./jules/run.sh all-scheduled >> jules/runs/cron.log 2>&1
set -eu
cd "$(dirname "$0")/.."   # -> repo root (jules new defaults to this repo)

# loop key -> task file (portable, no associative arrays / bash 3.2 safe)
task_file() {
  case "$1" in
    doc-sweep)    echo "01-doc-sweep.md" ;;
    architecture) echo "02-architecture-satisfaction.md" ;;
    logging)      echo "03-logging-coverage.md" ;;
    cve)          echo "04-dependency-cve-burndown.md" ;;
    housekeeper)  echo "05-housekeeper.md" ;;
    repo-cleanup) echo "06-repository-cleanup.md" ;;
    propagation)  echo "07-propagation-compliance.md" ;;
    *)            echo "" ;;
  esac
}
LOOPS="doc-sweep architecture logging cve housekeeper repo-cleanup propagation"
SCHEDULED="doc-sweep cve housekeeper"

command -v jules >/dev/null || { echo "jules CLI not found on PATH"; exit 1; }

run_one() {
  f="jules/tasks/$(task_file "$1")"
  [ -f "$f" ] || { echo "missing task file: $f"; exit 1; }
  repo=$(git config --get remote.origin.url | sed -E 's#^git@[^:]+:##; s#^https?://[^/]+/##; s#\.git$##')
  echo "→ dispatching '$1' to Jules (repo: $repo) ..."
  cat "$f" | jules new --repo "$repo"
}

case "${1:-}" in
  list)          for n in $LOOPS; do echo "$n"; done ;;
  all-scheduled) for n in $SCHEDULED; do run_one "$n"; done ;;
  "" )           echo "usage: ./jules/run.sh <loop|all-scheduled|list>"; exit 1 ;;
  * )            if [ -n "$(task_file "$1")" ]; then run_one "$1";
                 else echo "unknown loop '$1' (try: ./jules/run.sh list)"; exit 1; fi ;;
esac
