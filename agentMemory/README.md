# agentMemory

`agentMemory/` is a running journal for agent handoff context.

This folder is for continuity, not canonical product rules. Architecture and schema source-of-truth documents remain:

- `AGENTS.md`
- `Atlas of Sol.md`
- `src/lib/content/schema.ts`
- `scripts/content/validate.ts`

## Startup Context Workflow

Read startup context in this order:

1. Latest journal entry (latest 1 only).
2. Last 5 commits (message + touched files, no diffs).

Reference commands:

```bash
find agentMemory -maxdepth 1 -type f -name '????-??-??-????-*.md' | sort | tail -n 1
git log --name-only --pretty=format:'--- %h %ad %s' --date=short -n 5
```

If no journal files exist yet, continue with commit metadata only.

## Journal File Naming

- Path: `agentMemory/YYYY-MM-DD-HHMM-<slug>.md`
- Use 24-hour `HHMM`.
- One file per work session.
- Keep all entries; no pruning policy for now.

## Required Sections

Every journal entry must include these headers exactly:

- `## Session Summary`
- `## Decisions Locked`
- `## Files Touched`
- `## Validation Run`
- `## Open Questions`
- `## Next Steps`
- `## Risks / Notes`

If no decisions or actions apply to a required header, write `"N/A"`. Do not invent content to fill sections.

## Status Tags

Uncommitted context is optional and decided per session. If included, label it explicitly:

- `[committed]` for merged or committed work
- `[uncommitted]` for completed but not committed work

Example bullets:

- `[committed] Added required body hooks and updated schema validation.`
- `[uncommitted] Drafted Mercury highlights but did not commit yet.`
