## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

### 🛑 Workspace strictness
**MANDATORY:** The agent MUST strictly operate in the current project's root directory. If the IDE's "Active Document" metadata points to a file in a completely different project (e.g., you have another window open), IGNORE the active document and do not change workspaces.
