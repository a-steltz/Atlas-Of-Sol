## Session Summary

- Removed editorial size score text (`x/10`) from orbit-map body captions.
- Orbit-map labels now show only body name and body type for cleaner presentation.

## Decisions Locked

- Hide size-score copy in the orbit-map lane captions across all body types.

## Files Touched

- [uncommitted] `src/app/_components/atlas-map-shell.tsx` - Removed `· {body.size}/10` from orbit caption text.

## Validation Run

- `npm run lint` - pass
- `npm run typecheck` - pass

## Open Questions

- Should the Museum Floor quick stats also hide the `Size` card, or keep it there as secondary detail?

## Next Steps

- Continue visual polish based on screenshot-led feedback.

## Risks / Notes

- No behavior or data-model changes; this is a presentation-only adjustment.
