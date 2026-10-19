## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

## Project source of truth

- Roadmap: `.gsd/ROADMAP.md` (only live roadmap) · Status: `.gsd/STATE.md` · Product: `brain/prd.md`
- Brand: `DESIGN.md` — civic glass-teal, tokens in `src/app/globals.css`. The dark "uBTC" system and `/launch`, `/vault` pages are archived in `archive/design-dark-v1/`; never use them for new work.
- `archive/` is reference only; it is excluded from TypeScript, ESLint and the build.
