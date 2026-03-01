## Session Summary
- Reworked the Museum Floor body detail experience to prioritize visitor-relevant content from `body.json` and remove editorial-only fields from display.
- Implemented a new section flow for selected bodies: Hook, Discovery, Highlights, Core Facts, How We Know, Open Questions, Scientific Synthesis, and Sources.
- Added horizontal jump links at the top of Museum Floor to improve long-page navigation.

## Decisions Locked
- Museum Floor no longer renders `curationScore` or `size` in visitor-facing detail content.
- Hook appears first, discovery appears second, and sources are placed at the end of the Museum Floor sequence.
- Scientific backbone data (`physical`, `orbit`, `composition`, `environment`) is grouped into approachable “Core Facts” cards rather than dense raw dumps.

## Files Touched
- [uncommitted] `src/app/_components/atlas-map-shell.tsx` - replaced quick-stats snapshot UI with ordered museum sections, section jump-nav, and source rendering at end.
- [uncommitted] `src/app/_components/atlas-map-utils.ts` - removed quick-stats derivation and added discovery details, grouped fact extraction, and source URL normalization helpers.
- [uncommitted] `agentMemory/2026-02-28-1818-museum-floor-moon-ui-pass.md` - session journal entry.

## Validation Run
- `npx prettier --write src/app/_components/atlas-map-utils.ts src/app/_components/atlas-map-shell.tsx` - pass.
- `npm run lint` - pass.
- `npm run typecheck` - pass.
- `npm run content:validate` - pass (`Content validation passed: 19 entities (19 files scanned).`).

## Open Questions
- Should optional sections with no data (for bodies with sparse payloads) be hidden entirely instead of showing “still being curated” placeholder text?
- Should `scientificSynthesis` paragraphs remain in full, or be collapsed by default behind a “Read more” interaction for readability?

## Next Steps
- Get visual/design feedback on the new Museum Floor ordering using Moon as the reference body.
- If approved, apply the same flow and spacing tune-ups across additional bodies and evaluate density on mobile.
- Optionally normalize remaining markdown-formatted `sources[].url` values in content files so URL cleanup logic can eventually be removed.

## Risks / Notes
- The Moon `sources[0].url` currently contains markdown-link formatting in JSON; UI now normalizes this at render time to preserve clickable links.
- Jump links rely on section IDs rendered within the same page; browser hash navigation behavior may vary slightly with sticky headers across devices.
