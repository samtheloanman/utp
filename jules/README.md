# Jules Loops — utp

Committed task prompts Jules reads from this repo, plus a local loop runner.

## Run a loop
```bash
./jules/run.sh list            # see loops
./jules/run.sh doc-sweep       # one loop
./jules/run.sh all-scheduled   # doc-sweep + cve + housekeeper
```
Each call pipes a task in `jules/tasks/` to `jules new`; Jules works the repo in its cloud VM and opens a PR. Run logs land in `jules/runs/`. **Review every PR — never auto-merge.**

## Recurring (local cron)
```
0 2 * * 1  cd /Users/maysamtehranchi/Code/utp && ./jules/run.sh all-scheduled >> jules/runs/cron.log 2>&1
```
(Or set the schedule on the Jules web platform instead.)

## Loops
| key | cadence | output |
|-----|---------|--------|
| doc-sweep      | nightly/weekly | PR |
| architecture   | on-demand (needs a target) | PR |
| logging        | weekly | PR |
| cve            | weekly | PR |
| housekeeper    | monthly | PR |
| repo-cleanup   | quarterly | report + approval |
| propagation    | after you change a shared value | PR |

## utp config — fill before first run
- propagation: set OLD/NEW value in `jules/tasks/07-propagation-compliance.md`
- architecture: state the concrete target in `jules/tasks/02-architecture-satisfaction.md`
