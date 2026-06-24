# Jules Task — Doc Sweep (scheduled, nightly)

**Loop Library #001 · adapted for Jules**
**Cadence:** schedule nightly. **Output:** one PR. **Do not merge.**

---

Review this repository in full and make sure all documentation reflects the current implementation. In scope: READMEs, setup/onboarding guides, API references, code examples, runbooks, and inline doc comments that describe behavior.

For each doc that no longer matches the code: update it to match the current implementation. Do not invent features that don't exist in the code — describe only what the code actually does. Verify every code example or command you change actually runs (build/lint/execute it in the workspace).

When done, open a pull request titled `docs: nightly doc sweep` with a summary of what changed and why. Do not modify application logic, secrets, `.env*`, or generated files. If documentation already matches the implementation, make no changes and report "no drift found" instead of opening an empty PR.

**Done when:** documentation matches current implementation and a reviewable PR is open (or a clean no-op is reported).

---
**Run log (required):** Write `jules/runs/<YYYY-MM-DD>-<loop-name>.md` capturing: timestamp, the branch/PR you opened, files changed, the build/test/scan commands you ran with their results, and the final outcome (success / clean no-op / blocked). Include this run-log file in the same PR. If the result is a clean no-op (no PR), still leave the run log committed on a branch.
