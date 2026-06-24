# Jules Task — Architecture Satisfaction (on-demand)

**Loop Library #002 · adapted for Jules**
**Cadence:** run on-demand when you want a refactor pass. **Output:** one PR. **Do not merge.**

---

Refactor toward this concrete target: **[STATE THE GOAL — e.g. "extract data-fetching out of page components into a typed service layer" / "remove duplicated form-validation logic" / "split the 800-line API route into handlers"]**. Do not start until the target is concrete; if it is vague, ask for clarification rather than refactoring broadly.

Work in small, reversible steps. After each significant step: run the build and the full test suite in the workspace and keep the change only if both pass. Track progress in a file at `docs/refactor-progress.md` (what changed, what's left) so the work is resumable. Preserve all existing behavior — this is a refactor, not a feature change; do not alter public APIs or output unless the target explicitly says so.

When the target is reached and checks pass, open a pull request describing the before/after architecture and the verification run. Do not touch secrets, `.env*`, or unrelated modules.

**Done when:** the stated architectural target is met, build + tests pass, and a reviewable PR is open. Stop early and report if progress stalls or a step can't pass verification.

---
**Run log (required):** Write `jules/runs/<YYYY-MM-DD>-<loop-name>.md` capturing: timestamp, the branch/PR you opened, files changed, the build/test/scan commands you ran with their results, and the final outcome (success / clean no-op / blocked). Include this run-log file in the same PR. If the result is a clean no-op (no PR), still leave the run log committed on a branch.
