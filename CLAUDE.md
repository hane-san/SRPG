# Claude Code entrypoint

@AGENTS.md
@docs/DEVELOPMENT.md

For PR supervision (reviews, CI fixes, conflicts, overnight rounds) follow `.claude/skills/steward/SKILL.md`.

The same project contract applies in ChatGPT/Codex and Claude Code. Treat the
checked-out repository and Git history as the source of truth. Read the current
release notes and roadmap before choosing further work; do not depend on a chat
transcript or another assistant's private memory.

Follow the approved issue for implementation and independent evidence for review.
Use the actual available model in Claude Code; this file does not select one.
Never push directly to main, force-push or enable auto-merge. Record unverified
checks and leave main integration to the human producer after CI and playtest.
