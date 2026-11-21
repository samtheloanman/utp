---
name: autoresearch
description: "Use when need scoped research before planning; outputs SPEC.md."
argument-hint: "[lite|full|deep]"
user-invocable: true
risk: safe
---

# AutoResearch Skill

Performs scoped pre-implementation discovery and produces a concrete `SPEC.md` before planning or coding.

## Intensity Scopes

Invoke as `/autoresearch [lite|full|deep]` (default: `full`):

| Scope | Search Boundary | Primary Tools | Typical Use |
|---|---|---|---|
| **lite** | Target file + immediate imports + library docs | `view_file`, `context7-auto-research` | Small tweaks, isolated bugfixes |
| **full** (default) | Workspace codebase + test suites + configs | `grep_search`, `find_by_name`, `view_file` | Features, multi-file refactors |
| **deep** | Full repo graph + git history + remote research | `grep_search`, `tavily-web` / `search_web`, git logs | Architecture changes, new subsystem integrations |

---

## Execution Protocol

1. **Discover Context**:
   - **lite**: Inspect target files and relevant dependencies.
   - **full**: Map out affected modules, schemas, endpoints, and existing unit/integration tests.
   - **deep**: Fetch external API references, review recent git history on relevant modules, and check architectural patterns.

2. **Formulate `SPEC.md`**:
   Produce a concise `SPEC.md` with:
   - **Objective**: Direct statement of what needs to be solved.
   - **Current State vs Desired State**: Concrete baseline and target behavior.
   - **Constraints & Edge Cases**: Known pitfalls, dependencies, performance limits.
   - **Acceptance Criteria**: Explicit, testable criteria (commands/assertions that MUST pass).

3. **Output**:
   Present the synthesized `SPEC.md`. Do not proceed to implementation until the spec is validated by the caller or LLM council.