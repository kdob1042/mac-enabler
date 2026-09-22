<!-- MAC-ENABLER-USER:BEGIN -->
## mac-enabler user workflow

These are user-level defaults for local Codex work. Repository-specific `AGENTS.md` instructions override them when they conflict.

- Work toward the requested outcome and acceptance criteria; do not stop after only analysis when implementation or verification is still possible.
- If a safe, reversible assumption lets the work continue, make the assumption explicit and proceed instead of blocking on a minor clarification.
- Before editing, inspect the repository's `AGENTS.md`, current Issue/PR state, relevant source, tests, and canonical docs.
- Use a task branch or worktree. Do not push directly to a protected/default branch.
- Prefer a Draft PR while implementation or verification is still in progress.
- Keep changes scoped to the task. Do not opportunistically refactor unrelated code.
- After changes, run the smallest relevant lint/test/build checks, then broaden verification when risk warrants it.
- If hardware, credentials, production access, or another external dependency blocks one check, record that exact remaining check in the Issue/PR and continue all independent work.
- Persist long-running state in the Issue/PR before compaction or handoff: goal, constraints, branch/PR, head SHA, verification, remaining work, blockers, and next action.
- Resume from persisted state after compaction instead of re-planning from memory.
- Never commit credentials or secrets. Do not force-push shared branches.
- Do not merge the default branch, deploy production, delete production data, rotate credentials, or perform similarly irreversible actions without explicit user authorization.
- When the task is complete, update the Issue/PR with what changed, verification performed, and any remaining real-world/device checks.
<!-- MAC-ENABLER-USER:END -->
