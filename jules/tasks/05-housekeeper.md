# Jules Task — Housekeeper (scheduled, monthly)

**Loop Library #041 · adapted for Jules**
**Cadence:** schedule monthly. **Output:** one PR. **Do not merge.**

---

Review this repository for low-risk maintenance problems: dead code (unreachable or unused), stale files and outdated comments, unused dependencies, duplicated logic, broken links, inconsistent names, and confusing structure.

Protect anything active, generated, or uncertain — when in doubt, defer it, do not delete it. For each candidate: prove it is safe (e.g. show it's truly unreferenced), make the smallest coherent change, then rerun the build, tests, and a diff review. Keep only changes that pass verification.

Open a pull request listing each cleanup with the evidence that made it safe. Uncertain candidates go in the PR description under "deferred — needs human judgment," not into the diff. Never touch secrets, `.env*`, or unrelated uncommitted work.

**Done when:** no confirmed low-risk cleanup remains, existing behavior still passes, and a reviewable PR is open. Stop and report if progress stalls or verification is unavailable.

---
**Run log (required):** Write `jules/runs/<YYYY-MM-DD>-<loop-name>.md` capturing: timestamp, the branch/PR you opened, files changed, the build/test/scan commands you ran with their results, and the final outcome (success / clean no-op / blocked). Include this run-log file in the same PR. If the result is a clean no-op (no PR), still leave the run log committed on a branch.
