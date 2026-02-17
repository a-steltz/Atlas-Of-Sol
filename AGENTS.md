# AGENTS.md — Atlas of Sol

This file is the “how to work in this repo” guide for coding agents and humans.

## Quick Facts

- Node: `24.13.1` (see `.nvmrc`)
- Package manager: `npm` (`package-lock.json` is the source of truth)
- Framework: Next.js (App Router) in `src/app`
- Formatting: Prettier (4-space tabs, no trailing commas; Markdown prose wrap preserved)
- Content validation: strict Zod validation at build time (`npm run content:validate`)

## Repo Map

- `src/app/` — Next.js App Router UI
- `content/` — MVP content (`system.json`, `body.json`, `mission.json`)
- `scripts/content/validate.mjs` — Zod schemas + global ID + reference validation
- `.github/workflows/ci.yml` — CI (format check, lint, build)
- `.husky/` — Git hooks (pre-commit runs lint-staged/Prettier)

## Canonical Commands

- Install dependencies (clean): `npm ci`
- Dev server (Turbopack): `npm run dev`
- Format: `npm run format`
- Format check (CI): `npm run format:check`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Content validation: `npm run content:validate`
- Production build (runs content validation first): `npm run build`

## Guardrails (Important)

- Pre-commit: runs Prettier on staged files via lint-staged.
- CI: runs `format:check`, `lint`, and `build` on PRs and `main`.

### Lockfile Policy (Reduce Churn)

- Do not run `npm install` unless you intentionally changed dependencies.
- Prefer `npm ci` for reproducible installs.
- Avoid unrelated changes to `package-lock.json`.

### Formatting Policy (Reduce Noise)

- Avoid reformatting unrelated files.
- Prettier will format staged files; keep commits focused to reduce collateral formatting diffs.
- Markdown is formatted, but prose wrapping is preserved.

## Commenting Style

Comments are encouraged. Prefer JSDoc-style function headers and inline notes for non-obvious logic.

- Use `/** ... */` headers for exported functions/components and shared helpers.
- Include a 1–2 sentence summary of behavior (especially edge cases).
- Use `@param` for parameters and `@returns` when the return value isn’t self-evident.
- Use inline `// ...` comments to explain tricky decisions, invariants, and “why” (not just “what”).
- Keep comments accurate and updated when logic changes; remove stale comments.

Example:

```ts
/**
 * Toggles the expansion state of a row. Collapses if already expanded.
 *
 * @param requestId - The ID of the staffing request to toggle
 */
const handleRowToggle = (requestId: number) => {
    // Guard: don’t allow interaction while disabled.
    if (disabled) return;
    setExpandedRowId(expandedRowId === requestId ? null : requestId);
};
```

## Content Rules (Source of Truth)

- The canonical content/model rules are in `Atlas of Sol.md`.
- Content is **strictly validated** by `scripts/content/validate.mjs`.
    - Adding new fields to `system.json`/`body.json`/`mission.json` requires updating the validator schema first.

### Content Validation Contract (High-Level)

- All entities must have a globally unique `id` across systems + bodies + missions.
- `navParentId` must reference an existing entity `id`.
- `systemId` on bodies must reference an existing system `id`.
- `type` on bodies must be one of the allowed enum values (see `scripts/content/validate.mjs` / `Atlas of Sol.md`).
- `relations[].targetId` must reference an existing entity `id`.
- `hook` on bodies is required and must be a non-empty string.
- `highlights[]`, `howWeKnow[]`, and `openQuestions[]` are optional; if present, each must be a non-empty array of non-empty strings.
- Folder names are for developer ergonomics only; numeric prefixes (e.g., `05-jupiter`) are allowed for sorting, but JSON `id` values remain canonical and must not be renumbered.

## Agent Memory Workflow

`agentMemory/` is a running handoff journal for recent context. It supports continuity but is not a source of truth for architecture or schema decisions.

### Startup Context Read Order (Hybrid, Bounded)

1. Read the latest journal entry from `agentMemory/` (latest 1 file only).
2. Read commit metadata for the last 5 commits (commit message + touched files, no diffs).

Use these commands:

```bash
find agentMemory -maxdepth 1 -type f -name '????-??-??-????-*.md' | sort | tail -n 1
git log --name-only --pretty=format:'--- %h %ad %s' --date=short -n 5
```

Rules:

- If no journal entry exists, continue with commit metadata only.
- Do not read diffs by default during startup context gathering.
- Keep startup context bounded to avoid flooding the context window.

### Session-End Journal Rule

- Write exactly one journal entry at the end of each work session.
- Journal entries are written manually by the agent using the standard template.
- Filename format: `agentMemory/YYYY-MM-DD-HHMM-<slug>.md` (24-hour `HHMM`).
- Keep all journal entries; no pruning or archival policy is required right now.

### Uncommitted Context Policy

- Ask per session whether to include uncommitted-but-completed work.
- If included, label bullets explicitly with status tags:
    - `[committed]`
    - `[uncommitted]`

### Required Journal Sections

Each journal entry must include these section headers:

- `## Session Summary`
- `## Decisions Locked`
- `## Files Touched`
- `## Validation Run`
- `## Open Questions`
- `## Next Steps`
- `## Risks / Notes`

If no decisions or actions apply to a required header, write "N/A". Do not invent content to fill sections.
## Commit Messages

Use Conventional Commits where possible:

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `docs: ...`
- `refactor: ...`

## “Do Not” List

- Don’t add environment variables for MVP unless required (static-first).
- Don’t introduce new content fields without updating `scripts/content/validate.mjs`.
- Don’t commit `node_modules/` or `.next/`.
