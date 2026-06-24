# Jules Task — Repository Cleanup (on-demand / quarterly)

**Loop Library #012 · adapted for Jules**
**Cadence:** on-demand or quarterly. **Output:** a report + branch actions. **Approval required before deleting branches.**

---

Inspect this repository's local and remote branches, open pull requests, dangling commits, and worktrees. Identify which state still matters and which is stale (merged branches, abandoned PRs, superseded work).

For anything that may contain valuable unmerged work: summarize what it is and where it diverges, and surface it for recovery — do not delete it. Produce a cleanup report grouping every branch/PR as: **active**, **safe to delete (merged/superseded)**, or **needs human decision**.

**Do not delete or force-push anything in this run.** List the exact `git` commands you would run for the "safe to delete" group so a human can approve and execute them. Never delete the default branch, release branches, or anything with unmerged commits.

**Done when:** every branch, PR, commit, and worktree is classified as active, owned, or proposed-for-removal-with-evidence, and the report + proposed commands are posted for approval.

---
**Run log (required):** Write `jules/runs/<YYYY-MM-DD>-<loop-name>.md` capturing: timestamp, the branch/PR you opened, files changed, the build/test/scan commands you ran with their results, and the final outcome (success / clean no-op / blocked). Include this run-log file in the same PR. If the result is a clean no-op (no PR), still leave the run log committed on a branch.
