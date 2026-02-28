## Session Summary
- Widened the sticky top-map wrapper so the orbit map uses more horizontal viewport space on desktop.
- Kept museum-floor layout constraints unchanged.
- Restyled the orbit lane horizontal scrollbar to be thinner and match the atlas blue/slate visual language.
- Further reduced left/right dead space so the orbit lane occupies more horizontal area at desktop widths.
- Corrected small subsystem layout so parent/child bodies stay near each other instead of being pushed to opposite sides.
- Replaced shared-layout sliding behavior with state-transition fades targeted to one body per navigation action.
- Tuned marker fade timing to be more gradual and less abrupt.
- Upgraded transitions so all markers in the current lane fade out together, then all markers in the destination lane fade in together.

## Decisions Locked
- Increase only the top-map shell width cap (`max-w-6xl` -> `max-w-[96rem]`) to reduce left/right wasted space without changing internal orbit lane behavior.
- Keep scrollbar customization scoped to orbit lane only via a dedicated class (`orbit-lane-scrollbar`) to avoid changing scrollbars globally.
- Increase sticky map shell cap again (`max-w-[96rem]` -> `max-w-[112rem]`) and reduce map-lane padding to prioritize map width over decorative gutters.
- Let lane content expand to available width on large screens (`w-max min-w-full` with `xl:justify-between`) while preserving horizontal scroll on narrower viewports.
- Revert large-screen `justify-between` spreading in orbit lane and use consistent left-aligned spacing (`justify-start` + fixed gaps) as default across hierarchy levels.
- Remove shared `layoutId`/layout-position transitions for markers and use direct view switching with fade-only emphasis.
- Fade target rule: when drilling into a body, fade that destination body; when hopping back to system level, fade the previously focused body.
- Use a slower fade (`0.48s`, `easeInOut`) for transition emphasis rather than a quick pulse.
- Lane transition contract now uses two phases:
- `fadingOut`: all currently visible lane markers fade out together.
- `fadingIn`: all markers in the newly selected lane (anchor + direct children) fade in together.
- Marker clicks are disabled while transitions are in progress to prevent overlapping state changes.

## Files Touched
- [uncommitted] `src/app/_components/atlas-map-shell.tsx` - widened sticky map wrapper, reduced map-lane gutters, finalized left-aligned spacing, switched marker transitions from slide to fade, and implemented full-lane fade-out/fade-in sequencing.
- [uncommitted] `src/app/globals.css` - added thin, atlas-themed horizontal scrollbar styling for the orbit lane.
- [uncommitted] `agentMemory/2026-02-27-2030-orbit-map-width-default.md` - session journal entry.

## Validation Run
- `npm run lint` - pass
- `npm run lint` - pass (post width/gutter reduction)
- `npm run lint` - pass (post left-alignment correction)
- `npm run lint` - pass (post fade-transition swap)
- `npm run typecheck` - pass (post fade-transition swap)
- `npm run lint` - pass (post fade timing adjustment)
- `npm run lint` - pass (post full-lane fade sequencing)
- `npm run typecheck` - pass (post full-lane fade sequencing)

## Open Questions
- N/A

## Next Steps
- If desired, tune side padding (`px-4 sm:px-8`) for even wider map content on extra-large displays.
- If desired, further reduce scrollbar prominence by lowering thumb opacity or height from `8px` to `6px`.

## Risks / Notes
- Wider container may slightly increase line lengths/spacing in the sticky header area on very large monitors.
- WebKit and Firefox scrollbar implementations differ slightly; styling intent is consistent but exact rendering will vary by browser.
- Left-aligned layout favors relationship clarity in small sub-systems and may leave extra empty space to the right when child count is low (intentional).
- Removing shared layout transitions intentionally drops the previous positional interpolation behavior in favor of explicit, less noisy context switches.
- Transition duration now applies twice per navigation action (fade out + fade in), so total perceived switch time is longer by design.
