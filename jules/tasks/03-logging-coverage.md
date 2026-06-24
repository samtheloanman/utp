# Jules Task — Logging Coverage (on-demand / weekly)

**Loop Library #007 · adapted for Jules**
**Cadence:** on-demand, or schedule weekly. **Output:** one PR. **Do not merge.**

---

Review this system's logging and add missing coverage until every important path produces useful, tested logs. Important paths = user-facing flows, service/API boundaries, background jobs, and failure/error paths (catch blocks, rejected promises, non-2xx responses).

Use the project's existing logging library and conventions — do not introduce a new logging dependency. Each log must carry enough context to trace a request (operation name, identifiers, outcome) but **must never log secrets, tokens, passwords, full PII, private keys, or wallet/seed material**. For UTP specifically: never log private keys, signed payloads, or raw transaction secrets.

Add representative success-path and failure-path tests that prove the logs fire. After changes, run the build and tests and keep only changes that pass.

Open a pull request summarizing which paths gained logging and the tests that prove it. Do not change business logic or output behavior.

**Done when:** every important path emits useful, tested logs with no sensitive data exposed, checks pass, and a reviewable PR is open.

---
**Run log (required):** Write `jules/runs/<YYYY-MM-DD>-<loop-name>.md` capturing: timestamp, the branch/PR you opened, files changed, the build/test/scan commands you ran with their results, and the final outcome (success / clean no-op / blocked). Include this run-log file in the same PR. If the result is a clean no-op (no PR), still leave the run log committed on a branch.
