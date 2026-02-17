# Atlas of Sol

A wonder-first interactive solar system experience.

## Docs

- `Atlas of Sol.md` is the source of truth for content modeling, navigation rules, and validation requirements.

## Development

```bash
npm run dev
```

## Formatting

```bash
npm run format
npm run format:check
```

## Lint

```bash
npm run lint
```

## Tech Stack

- Framework: Next.js `16` (App Router, `src/app`)
- UI: React `19`
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS `4` + global CSS (`src/app/globals.css`)
- Validation: Zod `4` for strict content schema/reference checks
- Quality: ESLint `9` + Prettier `3` + Husky/lint-staged pre-commit
- CI: GitHub Actions (`format:check`, `lint`, `build`)
- Runtime/tooling: Node `24.13.1` + npm (`package-lock.json`)

## Typecheck

```bash
npm run typecheck
```

## Content Validation

```bash
npm run content:validate
```
