# Jules Task — Propagation Compliance (trigger-based, NOT scheduled)

**Loop Library #033 · adapted for Jules**
**Cadence:** run right after you change a value that appears in many places. **Output:** one PR. **Do not merge.**

---

I changed a value and every copy must stay consistent.
- **Old value:** `[OLD]`
- **New value:** `[NEW]`
- **What it is:** `[e.g. phone number / NRMLS license # / contract address / API base URL / pricing / feature name]`

List everywhere the new value belongs, then search the whole project for the old value and related forms (formatted variants, partial strings, env references, docs, tests, config). Review each match individually: fix real stale copies, but **keep intentional history, changelog entries, migrations, fixtures, and backward-compatibility rules** — record a one-line reason for each match you leave unchanged.

After updating, re-run the search to confirm zero unintended copies remain, then run the build and tests. Open a pull request listing every file changed and every match intentionally left alone with its reason. Never edit secrets or `.env*` without flagging it.

**Done when:** no unintended copy of the old value remains, every retained match has a recorded reason, checks pass, and a reviewable PR is open.

---
**Run log (required):** Write `jules/runs/<YYYY-MM-DD>-<loop-name>.md` capturing: timestamp, the branch/PR you opened, files changed, the build/test/scan commands you ran with their results, and the final outcome (success / clean no-op / blocked). Include this run-log file in the same PR. If the result is a clean no-op (no PR), still leave the run log committed on a branch.
