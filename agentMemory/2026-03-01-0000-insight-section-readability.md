# Agent Memory — 2026-03-01 — Insight Section Readability Pass

## Session Summary

User flagged that the Highlights, How We Know, and Open Questions sections felt "harsh on the eye." Diagnosed the root cause as excessive line length (~130+ chars at `text-sm` due to the `max-w-5xl` container with no constraint on the bullet list). Iterated through three approaches before landing on the right solution: instead of constraining line width, give each bullet item a heavier backdrop card matching the Discovery tile style. Additionally corrected vertical alignment of bullet dots.

## Decisions Locked

- **No line-length constraint on bullet lists.** Tried `max-w-3xl mx-auto` (misaligned with header) and `max-w-3xl` left-aligned (user rejected look). Full-width items are correct for this layout.
- **Backdrop treatment for insight items matches Discovery tile style.** Each bullet text span uses `rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5` — same family as `rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5` used in the Discovery `<dl>` tiles. This reduces perceived harshness by giving text a contained visual surface rather than floating bright text on the card background.
- **Bullet dot vertical alignment is `items-center`, not `items-start` + manual offset.** The old `mt-2` hack on the dot was a workaround for top-alignment; removing it and using `items-center` on the `<li>` is correct now that items have consistent card padding.

## Files Touched

- `src/app/_components/atlas-map-shell.tsx` — `MuseumInsightSection` component (lines ~583–596):
  - `<ul>`: removed `max-w-3xl` and `mx-auto` (added and then reverted during iteration)
  - `<li>`: `items-start` → `items-center`
  - Dot `<span>`: removed `mt-2`
  - Text `<span>`: `rounded-md bg-slate-900/30 px-2.5 py-1.5` → `rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5`

## Validation Run

Visually confirmed in browser (Venus body page). No lint/typecheck run this session (pure Tailwind class changes, no logic changes).

## Open Questions

N/A

## Next Steps

N/A

## Risks / Notes

- The backdrop approach improves readability without constraining line width — good tradeoff for this wide-format layout.
- If a future body has very long single bullet items (no wrap), the full-width card will still produce long lines. Could revisit `max-w-prose` on the text `<span>` (not the `<ul>`) if that becomes an issue — this would constrain text without affecting box width.
- Discovery tile style (`bg-slate-900/70 border border-white/10`) is now used in two places: Discovery section and all three insight sections. If that style changes in one place, consider updating both.
