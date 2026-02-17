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
- Folder names are for developer ergonomics only; numeric prefixes (e.g., `05-jupiter`) are allowed for sorting, but JSON `id` values remain canonical and must not be renumbered.

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
