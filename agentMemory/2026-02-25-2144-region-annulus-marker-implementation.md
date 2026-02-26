## Session Summary

- Implemented default annulus marker rendering for all `region` bodies in the Orbit Map.
- Kept existing map behavior intact: sizing model, click targets, hover interaction, shared layout transitions, and labels.
- Added subtle dust-tone annulus styling with dashed outer ring, belt texture, hollow center, and static debris specks.

## Decisions Locked

- `body.type === "region"` now resolves to `annulus` marker kind by default.
- All non-region body types continue using the existing orb marker style.
- No content/schema changes were introduced; per-body marker override remains future work.

## Files Touched

- [uncommitted] `src/app/_components/atlas-map-shell.tsx` - Added marker kind resolver and region annulus render branch inside `BodyMarker`.

## Validation Run

- `npm run lint` - pass
- `npm run typecheck` - pass

## Open Questions

- N/A

## Next Steps

- Perform visual QA on desktop and mobile to confirm annulus readability at smaller sizes.

## Risks / Notes

- Annulus debris speck positions are static and intentionally subtle; further micro-tuning may be needed after visual QA.
