Atlas of Sol - High Level Design

_A Wonder-First Interactive Solar System Experience_

## What Atlas of Sol Is (2–4 sentence summary)

**Atlas of Sol** is an interactive, web-based solar system museum designed to spark wonder and curiosity through layered exploration. Users can zoom from the Solar System level down to individual planetary bodies, discovering curated highlights and understanding how we know what we know. It prioritizes clarity and emotional engagement over dense academic content, while still linking to trusted scientific sources. Architecturally, it is built to scale beyond our solar system without requiring a rewrite.

# 1️ - The Problem We’re Addressing

Space is inspiring but:

- Information is fragmented across Wikipedia, NASA sites, and papers.
- Most sources are dense and not designed for playful discovery.
- Users need to already know what to search for.
- There is no central “front door” that feels like walking into a museum exhibit.

People hear:

> “Io has 400 active volcanoes.”

But there’s no intuitive, interactive place to _wander_ into that fact.

# 2 - Core Philosophy

Atlas of Sol is:

- A curated discovery layer over real science.
- Wonder-first.
- Structured but not academic.
- Playful but not trivial.
- Accurate but not overwhelming.

It is not:

- A research archive.
- An orbital mechanics simulator.
- A rocket game.
- A scale-perfect scientific rendering.

# 3 - Experience Model

## Observer With Agency

Users are not controlling the solar system. They are not driving a spaceship.

They are observers with zoom control. (In practice, we could visualize this as a telescope with many levels of zoom, or Neil DeGrasse Tyson's _spaceship of the mind_.)

Think:

- Google Earth style zoom layers.
- Solar System → Planet System → Body Detail
- Depth and reveal create wonder.

# 4️ - Navigation Architecture

Atlas of Sol uses a **single, consistent visibility model** at every level of exploration.

There is no separate “entry points” list.
Visibility is determined entirely by:

- Hierarchical parent-child relationships
- Curation Score
- User-selected density mode

## A) Hierarchical Navigation

Every body (including regions) has a `navParentId`.

The system node (e.g., `id: "sol"`) is the root of navigation and does not require a `navParentId`.

At any given view, the system:

1. Identifies the current parent entity (e.g., Sol, Jupiter, Asteroid Belt).
2. Collects all direct children where `navParentId` matches that parent.
3. Applies the current density mode (see below) to determine which of those children are visible.

This means:

- Sol view shows all bodies whose `navParentId = "sol"`
- Jupiter view shows all bodies whose `navParentId = "sol/jupiter"`
- Asteroid Belt view shows all bodies whose `navParentId = "sol/asteroid-belt"`

There are no special cases between planets, moons, and regions.
Every level behaves the same way.

This keeps the architecture simple, predictable, and scalable.

**Note** : Later, we may allow showing a range of depths simultaneously, but for our MVP, we are sticking with the above philosophy.

---

## A2) Ordering Within a Parent (Optional)

Bodies may include an optional `navOrder: number`.

When listing children under a given `navParentId`, sort by:

1. `navOrder` ascending (if present)
2. `curationScore` descending
3. `name` ascending

This allows curated ordering (e.g., Galilean moons) without breaking density/curation rules.

## B) Curation Score (0–100)

Each body includes a `curationScore`.

This is the museum’s editorial rating for:

> How likely this object is to spark curiosity for a general user.

It is **not**:

- Scientific importance
- Physical size
- Mass
- Objective value

_Though, all of those can play into the determination of the rating._

It is a UX and exhibit design tool.

Example scores:

- Jupiter: 95
    - Io: 92
    - Europa: 91
    - Amalthea: 35
    - Minor moon: 10
- Mars: 90
- Earth: 98
- Venus: 80
- Mercury: 70

Curation Score determines visibility under different density modes.

---

## C) Density Modes (User-Controlled Clutter Threshold)

Atlas of Sol provides three density modes:

### 1️ Highlights (Default — Museum Mode)

- Shows only children with high curation scores.
- Clean, intentional, wonder-first experience.
- Represents the museum’s recommended exhibit floor.

### 2️ Expanded

- Lowers the threshold.
- Reveals more objects within the same parent.
- Adds depth without overwhelming.

### 3️ Everything

- Shows all children regardless of curation score.
- Communicates scale and vastness.
- Intended for exploratory or power users.

### Default Thresholds (MVP)

These are global defaults (configurable later):

- Highlights: `curationScore >= 80`
- Expanded: `curationScore >= 30`
- Everything: no threshold

## D) Progressive Reveal Philosophy

This model ensures:

- The default experience is curated and uncluttered.
- Users can progressively reveal complexity.
- Every system behaves consistently.
- There is only one source of truth controlling visibility.

Later, additional lenses (e.g., Ocean Worlds, Geologically Active, Visited by Cassini) may temporarily override or augment visibility — but the baseline remains:

**Parent → Children → Filter by Curation Score**

## Resulting Behavior

- Sol view shows major planets, belts, and key bodies in Highlights mode.
- Jupiter view shows Galilean moons first.
- Lowering density reveals smaller moons.
- “Everything” reveals the full depth of the dataset within that region.

The museum curation guides the first impression.
The user controls how deep the complexity goes.

# 5️ - Interaction Flow

## Level 1: Sol (System Lobby)

- Wonder-first visual diagram.
- Subtle ambient motion.
- Smooth hover and zoom interactions.
- Clicking Jupiter zooms into Jupiter’s system.

Not true scale.
Exploration-first layout.

## Level 2: Planet System View (e.g., Jupiter)

- Jupiter dominates the frame.
- Moons arranged clearly.

Hierarchical signaling (**to be implemented later**):

- At Sol level, Jupiter may subtly indicate “something interesting inside.”
- Once zoomed into Jupiter, Io becomes the highlighted body.

## Level 3: Body Detail View

Each body includes:

### 1. Hook (one-line wonder statement)

> “Io is the most volcanically active world in the Solar System.”

### 2. Highlights

3–6 powerful facts.

### 3. How We Know

- Missions

- Instruments

- Timeline

- What changed our understanding

### 4. Open Questions

Keeps curiosity alive.

### 5. Sources

Links to NASA, ESA, JPL, etc.

# 6️ - Content Domains

We separated content into clean domains.

## Systems

Example:

```
/content/systems/sol/system.json
```

### Purpose

- Defines system-level metadata (name, description, optional theming).

* Acts as the top-level container for a star system (e.g., Sol).
* Provides architectural support for future exosystems.
* Does **not** directly list or embed bodies.

Bodies belong to a system by referencing it via `systemId`, and their hierarchy is defined through `navParentId`.

The system file remains lightweight and focused on system-wide concerns, not hierarchical structure.

### Top-Level Navigation Node (Decision)

MVP uses **Option A**: `system.json` is a navigable node with `id: "sol"`.

- The app starts at the system node (e.g., Sol).
- All top-level bodies in that system set `navParentId: "sol"`.

## Bodies

Planets, moons, dwarf planets, asteroids, comets, and regions are modeled as individual `body.json` entities.

Conceptually, bodies belong to a system.
Structurally, they are organized under that system’s directory for clarity and maintainability.

Example filesystem structure:

```
/content
  /systems
    /sol
      system.json

  /bodies
    /sol
      /sun
        body.json
      /planets
        /mercury
          body.json
        /earth
          body.json
          /moons
            /moon
              body.json
      /regions
        /asteroid-belt
          body.json
        /kuiper-belt
          body.json
      /small-bodies
        /asteroids
          /ceres
            body.json
```

Hierarchy is determined exclusively by:

- `systemId`
- `navParentId`

For example:

- Bodies with `navParentId: "sol"` appear in the Sol system view.
- Bodies with `navParentId: "sol/jupiter"` appear in the Jupiter system view.
- Bodies with `navParentId: "sol/asteroid-belt"` appear within the belt region.

There is no duplication of hierarchy inside `system.json`.
The body graph is the single source of truth.

#### Rings

Rings are embedded within a planet’s `body.json` for MVP.

They are modeled as a JSON object inside the planet entity rather than as separate bodies, for example:

```json
{
    "rings": {
        "description": "Saturn’s main rings.",
        "data": {}
    }
}
```

This keeps structure simple while allowing expansion later if ring systems become navigable entities.

Rings do not participate in hierarchical navigation or density filtering in the MVP.

### Regions

Regions (e.g., Asteroid Belt, Kuiper Belt, Oort Cloud) are first-class bodies.

They behave like parents in the hierarchy and can contain their own children.

This allows:

- Belt-level exploration.
- Vastness communication without cluttering the Sol lobby.
- Clean expansion later.

## Missions (to be expanded on later)

Probes, Rovers, etc.

Separate from bodies.

Example:

```
/content/missions/new-horizons/mission.json
```

Missions reference bodies by ID.

---

# 7️ - Folder Structure

```
/content
  /systems
    /sol
      system.json

  /bodies
    /sol
      /sun
        body.json
      /planets
        /jupiter
          body.json
          /moons
            /io
              body.json
        /saturn
          body.json
          /moons
            /titan
              body.json
      /regions
        /asteroid-belt
          body.json
      /small-bodies
        /asteroids
          /ceres
            body.json

  /missions
    /cassini-huygens
      mission.json
    /new-horizons
      mission.json
```

Controlled recursion:

- Only files matching known schemas (`body.json`, `system.json`, `mission.json`) are indexed.
- Other folders are ignored.

**Important architectural note:**

The folder structure mirrors conceptual hierarchy for developer ergonomics only.
Runtime hierarchy and navigation are derived exclusively from `navParentId`.

Folder names are not canonical identifiers. Numeric prefixes for local sorting are allowed (e.g., `/planets/05-jupiter`) as long as the entity `id` in JSON remains canonical (e.g., `sol/jupiter`).

The body graph is the single source of truth for:

- Parent-child relationships
- Visibility logic
- Navigation behavior

`system.json` does not define body structure.

# 8 - Data Modeling Decisions

## Global ID Rules

All systems, bodies, missions, and related entities must have a **globally unique** string `id`.

- IDs are immutable once published.
- Enforce uniqueness across the entire content set (do not assume uniqueness “by type”).
- IDs may reflect hierarchy , e.g., `sol/jupiter/io`, but only uniqueness is required.

## Universal Body Fields

Each body entity includes:

- `id`
- `name`
- `hook` (required one-line wonder statement)
- `type` (strict enum; see below)
- `navParentId`
- optional `navOrder`
- `systemId`
- `curationScore`
- `relations[]`
- optional `highlights[]`
- optional `howWeKnow[]`
- optional `openQuestions[]`
- optional `rings` object (for planets)
- optional `physical` object (scientific physical properties)
- optional `orbit` object (orbital/rotational values, including optional `retrogradeRotation`)
- optional `composition` object (bulk composition + atmosphere + interior)
- optional `environment` object (Kelvin temperatures + classified water/magnetic/activity states)
- optional `discovery` object (discoverer/year/precision/method)
- optional `scientificSynthesis[]` array (2–3 paragraph strings with inline citations)
- optional `sources[]` array (structured source metadata)

For MVP validation, if `highlights[]`, `howWeKnow[]`, or `openQuestions[]` are provided, each must be a non-empty array of non-empty strings.

Scientific backbone validation (all optional; omit when unknown):

- Numeric fields are validated as finite numbers.
- `orbit.eccentricity`, when present, must satisfy `0 <= e < 1`.
- `orbit.retrogradeRotation`, when present, is a boolean.
- `environment.meanTemperatureK`, `environment.minTemperatureK`, and `environment.maxTemperatureK`, when present, must be `>= 0`.
- `composition.atmosphere.surfacePressureBar`, when present, must be `>= 0`.
- `composition.atmosphere.type`, when present, must be one of `substantial-envelope`, `thick`, `thin`, `tenuous`, or `none`.
- If `composition.atmosphere.type` is `none`, `composition.atmosphere.mainComponents` and `composition.atmosphere.surfacePressureBar` must be omitted.
- If `composition.atmosphere.type` is `substantial-envelope`, `composition.atmosphere.surfacePressureBar` must be omitted.
- `composition.primary[]`, `composition.internalStructure[]`, and `composition.atmosphere.mainComponents[]`, when present, must be non-empty arrays of non-empty strings.
- `environment.liquidWaterPresence`, when present, must be one of `surface`, `subsurface`, `transient`, `past`, or `none`.
- `environment.magneticFieldType`, when present, must be one of `global`, `weak-global`, `crustal-remnant`, `induced`, or `none`.
- `environment.volcanicActivity`, `environment.cryovolcanicActivity`, and `environment.tectonicActivity`, when present, must be one of `confirmed`, `suspected`, `past`, or `none`.
- `sources[]`, when present, must contain non-empty structured entries (`attribution`, `title`; optional `url`, `year`, `publisher`).
- `scientificSynthesis[]`, when present, must be a non-empty array of non-empty strings.
- Inline citations are 1-based (`[n]`) and map to `sources[n-1]`; cited indices must satisfy `1 <= n <= sources.length`.
- `discovery.discoveryYear`, when present, must be an integer and may be negative (astronomical year numbering).
- `discovery.discoveryYearPrecision`, when present, must be one of `exact`, `estimated`, or `prehistoric`.
- If `discovery.discoveryYear` is present, `discovery.discoveryYearPrecision` is required.
- If `discovery.discoveryYearPrecision` is `prehistoric`, `discovery.discoveryYear` must be omitted.

Example `body.json` (abridged):

```json
{
    "id": "sol/jupiter/io",
    "name": "Io",
    "type": "moon",
    "systemId": "sol",
    "navParentId": "sol/jupiter",
    "navOrder": 1,
    "curationScore": 92,
    "relations": [{ "type": "orbits", "targetId": "sol/jupiter" }]
}
```

## Body `type` Enum (MVP)

In every `body.json`, `type` must be exactly one of:

- `star`
- `planet`
- `moon`
- `dwarf-planet`
- `asteroid`
- `comet`
- `region`

### Curation Score Clarification

`curationScore` governs default museum visibility and density behavior.

It determines what appears under:

- Highlights mode
- Expanded mode
- Everything mode

It does **not** restrict future lens-based filtering (e.g., Ocean Worlds, Geologically Active, Visited by Cassini). Those systems may override or augment visibility logic without modifying curation scores.

Curation Score represents the museum’s editorial recommendation, not scientific importance.

## Relations Array

Allows graph-style modeling independent of hierarchy.

Schema shape:

```json
{
    "relations": [{ "type": "visitedBy", "targetId": "sol/missions/cassini-huygens" }]
}
```

Examples:

- `visitedBy`
- `locatedIn`
- `memberOf`
- `resonanceWith`
- `orbits`

This supports:

- Mission linking
- Cross-system references
- Future binary stars and barycenters
- Non-hierarchical relationships

Hierarchy is defined only by `navParentId`.
Everything else belongs in `relations`.

# 9️ - What We Are Explicitly Not Doing

- No deep orbital physics engine.
- No rocket gameplay.
- No research-paper reading inside the app.
- No true-to-scale mandatory layout.
- No separate “entry point” visibility lists.
- No showing everything at once in the system lobby by default.

Atlas of Sol is curated first, exhaustive second.

# 10 - Technical Direction

- Next.js (static-first architecture).
- Build-time indexing of bodies and missions.
- Zod schema validation at build time.
- Client-side interactive zoom UI.
- Visibility derived from `navParentId` + `curationScore` + density mode.
- Future backend optional (user accounts, bookmarks, personalization, etc.).

## Schema Validation (Zod)

Validate content during indexing/build:

- Enforce global `id` uniqueness across all indexed entities (systems, bodies, missions, etc.).
- Validate `body.json.type` using a strict enum.
- Require non-empty `hook` on bodies.
- Validate that every `navParentId` references a real entity `id`.
- Validate that every body `systemId` references a real system `id`.
- Validate that `relations[].targetId` references a real entity `id`.
- Validate optional shapes (`navOrder`, `rings`, `relations[]`).
- Validate optional rich-text arrays (`highlights[]`, `howWeKnow[]`, `openQuestions[]`) as non-empty arrays of non-empty strings when present.
- Validate optional scientific backbone fields (`physical`, `orbit`, `composition`, `environment`, `discovery`) with finite-number and enum constraints.
- Validate atmosphere classification constraints (`none` omits components/pressure; `substantial-envelope` omits pressure) and enum-based environment activity/water/magnetic fields.
- Validate citation mapping (`[n]` -> `sources[n-1]`) and ensure cited source indexes are in range.
- Validate discovery year semantics (`discoveryYear` requires precision, and `prehistoric` precision forbids year).

Validation implementation lives in:

- `src/lib/content/schema.ts` (shared schema/type source of truth)
- `scripts/content/validate.ts` (content validation entrypoint)

Prefer explicit error messages, e.g.:

- `Duplicate id: "sol/jupiter/io"`
- `Missing id on body.json at /content/bodies/sol/planets/jupiter/moons/io/body.json`
- `Invalid navParentId: "sol/jupitr" (no entity with that id)`
- `Unsupported body type: "ring" (allowed: star, planet, moon, dwarf-planet, asteroid, comet, region)`

The architecture is:

- Single source of truth for hierarchy.
- Single mechanism for default visibility.
- Extensible through lenses and future features.
- Scalable beyond Sol without structural changes.
