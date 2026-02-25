/**
 * Shared content schema module for Atlas of Sol.
 *
 * Purpose:
 * - Define strict Zod schemas for `system.json`, `body.json`, and `mission.json`
 * - Export schema-derived TypeScript types via `z.infer`
 * - Provide shared helpers (for example, filename-to-entity-kind classification)
 *
 * This file is the single source of truth for content shape used by both:
 * - `scripts/content/validate.ts` (CLI/build validation)
 * - `src/lib/content/get-content-index.ts` (runtime content loading)
 */
import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);
const NonEmptyStringArray = z.array(NonEmptyString).min(1);
const FiniteNumber = z.number().finite();
const NonNegativeFiniteNumber = FiniteNumber.min(0);
const AtmosphereType = z.enum(["substantial-envelope", "thick", "thin", "tenuous", "none"]);
const LiquidWaterPresence = z.enum(["surface", "subsurface", "transient", "past", "none"]);
const MagneticFieldType = z.enum(["global", "weak-global", "crustal-remnant", "induced", "none"]);
const ActivityLevel = z.enum(["confirmed", "suspected", "past", "none"]);
const DiscoveryYearPrecision = z.enum(["exact", "estimated", "prehistoric"]);

/**
 * Allowed top-level body types for MVP.
 * Rings are intentionally excluded because they are embedded data.
 */
export const bodyTypeSchema = z.enum([
    "star",
    "planet",
    "moon",
    "dwarf-planet",
    "asteroid",
    "comet",
    "region"
]);

export const relationSchema = z.object({
    /** Relationship label (for example: "orbits", "visited-by", "part-of"). */
    type: z.string().min(1),
    /** Canonical `id` of the related entity. */
    targetId: z.string().min(1)
});

export const nonEmptyStringListSchema = NonEmptyStringArray;

const sourceSchema = z
    .object({
        attribution: NonEmptyString,
        title: NonEmptyString,
        url: NonEmptyString.optional(),
        year: FiniteNumber.int().optional(),
        publisher: NonEmptyString.optional()
    })
    .strict();

const physicalSchema = z
    .object({
        meanRadiusKm: FiniteNumber.optional(),
        massKg: FiniteNumber.optional(),
        densityKgM3: FiniteNumber.optional(),
        surfaceGravityMS2: FiniteNumber.optional(),
        escapeVelocityMS: FiniteNumber.optional()
    })
    .strict();

const orbitSchema = z
    .object({
        semiMajorAxisKm: FiniteNumber.optional(),
        orbitalPeriodDays: FiniteNumber.optional(),
        eccentricity: FiniteNumber.min(0).lt(1).optional(),
        inclinationDeg: FiniteNumber.optional(),
        rotationPeriodHours: FiniteNumber.optional(),
        retrogradeRotation: z.boolean().optional(),
        tidallyLocked: z.boolean().optional()
    })
    .strict();

const atmosphereSchema = z
    .object({
        type: AtmosphereType.optional(),
        mainComponents: NonEmptyStringArray.optional(),
        surfacePressureBar: NonNegativeFiniteNumber.optional()
    })
    .strict()
    .superRefine((value, context) => {
        if (value.type === "none") {
            if (value.mainComponents !== undefined) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["mainComponents"],
                    message: 'mainComponents must be omitted when atmosphere type is "none"'
                });
            }

            if (value.surfacePressureBar !== undefined) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["surfacePressureBar"],
                    message: 'surfacePressureBar must be omitted when atmosphere type is "none"'
                });
            }
        }

        if (value.type === "substantial-envelope" && value.surfacePressureBar !== undefined) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["surfacePressureBar"],
                message:
                    'surfacePressureBar must be omitted when atmosphere type is "substantial-envelope"'
            });
        }
    });

const compositionSchema = z
    .object({
        primary: NonEmptyStringArray.optional(),
        atmosphere: atmosphereSchema.optional(),
        internalStructure: NonEmptyStringArray.optional()
    })
    .strict();

const environmentSchema = z
    .object({
        meanTemperatureK: NonNegativeFiniteNumber.optional(),
        minTemperatureK: NonNegativeFiniteNumber.optional(),
        maxTemperatureK: NonNegativeFiniteNumber.optional(),
        liquidWaterPresence: LiquidWaterPresence.optional(),
        magneticFieldType: MagneticFieldType.optional(),
        volcanicActivity: ActivityLevel.optional(),
        cryovolcanicActivity: ActivityLevel.optional(),
        tectonicActivity: ActivityLevel.optional()
    })
    .strict();

const discoverySchema = z
    .object({
        discoveredBy: NonEmptyString.optional(),
        discoveryYear: FiniteNumber.int().optional(),
        discoveryYearPrecision: DiscoveryYearPrecision.optional(),
        discoveryMethod: NonEmptyString.optional()
    })
    .strict()
    .superRefine((value, context) => {
        if (value.discoveryYear !== undefined && value.discoveryYearPrecision === undefined) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["discoveryYearPrecision"],
                message: "discoveryYearPrecision is required when discoveryYear is provided"
            });
        }

        if (value.discoveryYearPrecision === "prehistoric" && value.discoveryYear !== undefined) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["discoveryYear"],
                message:
                    'discoveryYear must be omitted when discoveryYearPrecision is "prehistoric"'
            });
        }
    });

export const systemSchema = z
    .object({
        /** Globally unique canonical identifier (for example: "sol"). */
        id: z.string().min(1),
        /** Display name shown in navigation and UI labels. */
        name: z.string().min(1),
        /** Canonical body ID that acts as the system's primary center body. */
        primaryBodyId: z.string().min(1),
        /** Optional short summary used in previews and overview content. */
        description: z.string().optional()
    })
    .strict();

export const bodySchema = z
    .object({
        /** Globally unique canonical identifier (for example: "sol/mercury"). */
        id: z.string().min(1),
        /** Display name shown in navigation and detail views. */
        name: z.string().min(1),
        /** One-sentence curiosity hook for fast user orientation. */
        hook: z.string().trim().min(1),
        /** Top-level body classification used for filtering and rendering behavior. */
        type: bodyTypeSchema,
        /** Stylized relative display size (`1-10`) used by 2D map UI layouts. */
        size: FiniteNumber.int().min(1).max(10),
        /** Parent system identifier this body belongs to. */
        systemId: z.string().min(1),
        /** Parent node identifier in the navigation hierarchy. */
        navParentId: z.string().min(1),
        /** Optional sibling ordering value within a navigation group. */
        navOrder: FiniteNumber.optional(),
        /** Editorial ranking used for curation and density mode thresholds. */
        curationScore: FiniteNumber.min(0).max(100),
        /** Optional short highlight bullets about the body. */
        highlights: nonEmptyStringListSchema.optional(),
        /** Optional evidence/measurement bullets explaining how we know. */
        howWeKnow: nonEmptyStringListSchema.optional(),
        /** Optional unresolved question bullets for future learning prompts. */
        openQuestions: nonEmptyStringListSchema.optional(),
        /** Optional source list supporting cited statements (`[n]` maps to `sources[n-1]`). */
        sources: z.array(sourceSchema).min(1).optional(),
        /** Optional narrative synthesis paragraphs with inline citations (`[n]`). */
        scientificSynthesis: nonEmptyStringListSchema.optional(),
        /** Optional physical properties stored in canonical SI-compatible units. */
        physical: physicalSchema.optional(),
        /** Optional orbital and rotational characteristics. */
        orbit: orbitSchema.optional(),
        /** Optional composition details (bulk, atmosphere, interior structure). */
        composition: compositionSchema.optional(),
        /** Optional environmental conditions; temperatures are stored in Kelvin. */
        environment: environmentSchema.optional(),
        /** Optional discovery metadata and year confidence semantics. */
        discovery: discoverySchema.optional()
    })
    .strict()
    .superRefine((value, context) => {
        const citations: Array<{ n: number; path: (string | number)[] }> = [];

        if (value.highlights) {
            for (const [index, highlight] of value.highlights.entries()) {
                for (const match of highlight.matchAll(/\[(\d+)\]/g)) {
                    citations.push({
                        n: Number.parseInt(match[1], 10),
                        path: ["highlights", index]
                    });
                }
            }
        }

        if (value.scientificSynthesis) {
            for (const [index, paragraph] of value.scientificSynthesis.entries()) {
                for (const match of paragraph.matchAll(/\[(\d+)\]/g)) {
                    citations.push({
                        n: Number.parseInt(match[1], 10),
                        path: ["scientificSynthesis", index]
                    });
                }
            }
        }

        if (citations.length === 0) return;

        if (!value.sources) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["sources"],
                message:
                    "sources are required when citations are present (`[n]` maps to `sources[n-1]`)"
            });
            return;
        }

        for (const citation of citations) {
            if (citation.n < 1 || citation.n > value.sources.length) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: citation.path,
                    message: `citation [${citation.n}] is out of range (valid range: [1] to [${value.sources.length}])`
                });
            }
        }
    });

/**
 * Dormant contract: missions are not yet present in `content/`, but this schema is
 * intentionally retained so mission ingestion can be enabled without redesigning types.
 */
export const missionSchema = z
    .object({
        /** Globally unique canonical mission identifier. */
        id: z.string().min(1),
        /** Mission display name. */
        name: z.string().min(1),
        /** Optional mission summary text. */
        description: z.string().optional(),
        /** Optional graph edges linking missions to related entities. */
        relations: z.array(relationSchema).optional()
    })
    .strict();

export type Relation = z.infer<typeof relationSchema>;
export type SystemEntity = z.infer<typeof systemSchema>;
export type BodyEntity = z.infer<typeof bodySchema>;
export type MissionEntity = z.infer<typeof missionSchema>;
export type AnyEntity = SystemEntity | BodyEntity | MissionEntity;

export type ContentEntityKind = "system" | "body" | "mission";

/**
 * Maps a known content (JSON) filename to its entity kind.
 *
 * @param {string} filename - Basename to classify
 * @returns {ContentEntityKind | "unknown"} Entity kind
 */
export function kindFromFilename(filename: string): ContentEntityKind | "unknown" {
    if (filename === "system.json") return "system";
    if (filename === "body.json") return "body";
    if (filename === "mission.json") return "mission";
    return "unknown";
}
