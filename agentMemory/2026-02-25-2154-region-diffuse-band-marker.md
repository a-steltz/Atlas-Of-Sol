## Session Summary

- Replaced the region marker visual from rigid annulus styling to a diffuse debris-band treatment.
- Implemented medium-density particulate specks with a hybrid silhouette (faint boundary ring + haze band + center void).
- Added subtle hover/focus particle twinkle for region markers and disabled twinkle when reduced-motion is preferred.

## Decisions Locked

- Region marker default remains keyed by `body.type === "region"` through `resolveMarkerKind`, but visual execution is now diffuse-band oriented.
- Hover twinkle is interaction-gated (hover/focus only), not always-on animation.
- Reduced-motion users receive static region markers without twinkle.

## Files Touched

- [uncommitted] `src/app/_components/atlas-map-shell.tsx` - Added diffuse-band region rendering layers, medium particle set, and reduced-motion-aware hover twinkle behavior.

## Validation Run

- `npm run lint` - pass
- `npm run typecheck` - pass

## Open Questions

- N/A

## Next Steps

- Perform visual QA for small-size region readability and tune speck count/opacity if needed.

## Risks / Notes

- Particle distribution is handcrafted for aesthetic balance; future per-region variation is possible but intentionally out of scope.
