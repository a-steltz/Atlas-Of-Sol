# Atlas of Sol - Body Content Migration Task

Use this task when migrating AI research output files (for example `research/*.txt`) into canonical `content/**/body.json` entries.

## Goal

Move research payloads into final content folders without changing free-text narrative content, while adding required Atlas scaffold fields so `content:validate` passes.

## Core Rules

1. Do not edit free-text prose fields.
2. First create destination folders.
3. Copy source research files to `body.json` in destination folders.
4. Add only missing scaffold/project fields.
5. Normalize only `sources[].url` values when needed.
6. Format only touched target files.
7. Validate content before finishing.

## Inputs To Define Before Starting

1. Source files: list of `research/*.txt` files to migrate.
2. Destination folders: full target paths under `content/bodies/...`.
3. Per-body scaffold values:
   - `id`
   - `systemId`
   - `navParentId`
   - `navOrder`
   - `size`
   - `curationScore`
   - `hook` (reuse verbatim sentence from existing research text)
4. Whether source research files are retained (default: keep them).

## Required `body.json` Scaffold Fields

Ensure each migrated file has these required top-level fields:

- `id`
- `name`
- `hook`
- `type`
- `size`
- `systemId`
- `navParentId`
- `navOrder` (recommended for sibling ordering)
- `curationScore`

All research payload fields should remain present as supplied (for example `physical`, `orbit`, `composition`, `environment`, `discovery`, `scientificSynthesis`, `highlights`, `howWeKnow`, `openQuestions`, `sources`).

## URL Normalization Rules

Apply only to `sources[].url`:

1. If URL is Markdown-wrapped (`[label](https://example.com)`), replace with raw URL (`https://example.com`).
2. If URL is a Google redirect link with `q=...`, replace with decoded canonical URL.
3. Do not change `attribution`, `title`, `year`, `publisher`, or any narrative text.

## Migration Procedure

1. Create destination folders.
2. Copy each source file to destination `body.json`.
3. Edit copied files only:
   - Add scaffold fields.
   - Keep all existing free text unchanged.
   - Normalize `sources[].url` values only.
4. Run Prettier on only migrated files.
5. Validate JSON parse for each migrated file.
6. Run `npm run content:validate`.
7. Verify sibling order (if `navOrder` provided) and parent linkage.
8. Optionally record session notes in `agentMemory/` with required section headers.

## Command Template

```bash
# 1) Create folders
mkdir -p <dest-1> <dest-2> <dest-3>

# 2) Copy research files into canonical content locations
cp <source-1.txt> <dest-1>/body.json
cp <source-2.txt> <dest-2>/body.json
cp <source-3.txt> <dest-3>/body.json

# 3) Edit copied files (manual or scripted) to add scaffold fields + URL normalization only

# 4) Format only touched files
npx prettier --write <dest-1>/body.json <dest-2>/body.json <dest-3>/body.json

# 5) Parse check (example)
node -e 'const fs=require("fs");["<dest-1>/body.json","<dest-2>/body.json","<dest-3>/body.json"].forEach((p)=>{JSON.parse(fs.readFileSync(p,"utf8"));console.log("ok",p);});'

# 6) Contract validation
npm run content:validate
```

## Acceptance Checklist

1. Destination `body.json` files exist in correct canonical folders.
2. Required scaffold fields are present and valid.
3. Free-text narrative content is unchanged from source.
4. Only `sources[].url` values were normalized.
5. `npm run content:validate` passes.
6. `systemId` and `navParentId` references resolve.
7. `navOrder` sequence is correct for siblings.

## Optional Session Journal Template Reminder

If journaling this migration in `agentMemory/`, include all required headers:

- `## Session Summary`
- `## Decisions Locked`
- `## Files Touched`
- `## Validation Run`
- `## Open Questions`
- `## Next Steps`
- `## Risks / Notes`
