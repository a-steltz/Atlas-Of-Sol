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
- `scripts/content/validate.ts` — content validation entrypoint (uses shared schemas in `src/lib/content/schema.ts`)
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
- Content is **strictly validated** by `scripts/content/validate.ts` using shared schemas in `src/lib/content/schema.ts`.
    - Adding new fields to `system.json`/`body.json`/`mission.json` requires updating shared schemas first.

### Content Validation Contract (High-Level)

- All entities must have a globally unique `id` across systems + bodies + missions.
- `navParentId` must reference an existing entity `id`.
- `systemId` on bodies must reference an existing system `id`.
- `primaryBodyId` on systems is required, must reference an existing body `id`, and that body must belong to the same system.
- `type` on bodies must be one of the allowed enum values (see `scripts/content/validate.ts` / `Atlas of Sol.md`).
- `size` on bodies is required and must be an integer from `1` to `10` (stylized UI sizing, not true physical scale).
- Only a system's `primaryBodyId` body may use `navParentId` equal to the system `id` (single direct-root body in MVP).
- `relations[].targetId` on missions must reference an existing entity `id`.
- `hook` on bodies is required and must be a non-empty string.
- `highlights[]`, `howWeKnow[]`, and `openQuestions[]` are optional; if present, each must be a non-empty array of non-empty strings.
- Scientific backbone fields on bodies (`physical`, `orbit`, `composition`, `environment`, `discovery`) are optional and should be omitted when unknown.
- In `orbit`, `retrogradeRotation` is optional and `rotationPeriodHours` remains numeric.
- Scientific backbone numeric fields must be finite numbers; `orbit.eccentricity` must satisfy `0 <= e < 1`; Kelvin temperatures and atmospheric `surfacePressureBar` must be `>= 0`.
- In `composition.atmosphere`, `type` is optional with enum values (`substantial-envelope`, `thick`, `thin`, `tenuous`, `none`).
- If `composition.atmosphere.type` is `none`, omit `mainComponents` and `surfacePressureBar`; if `type` is `substantial-envelope`, omit `surfacePressureBar`.
- In `environment`, use enum fields (`liquidWaterPresence`, `magneticFieldType`, `volcanicActivity`, `cryovolcanicActivity`, `tectonicActivity`) instead of booleans.
- `sources[]` is optional; if present, each source requires `attribution` and `title` with optional `url`, `year`, and `publisher`.
- `scientificSynthesis[]` is optional; if present, it must be a non-empty array of non-empty paragraph strings.
- Inline citations are 1-based (`[n]`) and map to `sources[n-1]`; if citations are present, `sources` must exist and each cited index must satisfy `1 <= n <= sources.length`.
- Discovery metadata uses `discoveryYearPrecision` (`exact` | `estimated` | `prehistoric`); if `discoveryYear` is present, precision is required, and `prehistoric` requires omitting `discoveryYear`.
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
- Don’t introduce new content fields without updating shared schemas and `scripts/content/validate.ts`.
- Don’t commit `node_modules/` or `.next/`.
