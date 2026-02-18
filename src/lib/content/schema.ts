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

export const nonEmptyStringListSchema = z.array(z.string().trim().min(1)).min(1);

export const ringsSchema = z
    .object({
        /** Human-readable overview of the ring system. */
        description: z.string().optional(),
        /** Flexible payload for ring-specific data fields. */
        data: z.record(z.string(), z.unknown()).optional()
    })
    .strict();

export const systemSchema = z
    .object({
        /** Globally unique canonical identifier (for example: "sol"). */
        id: z.string().min(1),
        /** Display name shown in navigation and UI labels. */
        name: z.string().min(1),
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
        /** Parent system identifier this body belongs to. */
        systemId: z.string().min(1),
        /** Parent node identifier in the navigation hierarchy. */
        navParentId: z.string().min(1),
        /** Optional sibling ordering value within a navigation group. */
        navOrder: z.number().finite().optional(),
        /** Editorial ranking used for curation and density mode thresholds. */
        curationScore: z.number().finite().min(0).max(100),
        /** Optional short highlight bullets about the body. */
        highlights: nonEmptyStringListSchema.optional(),
        /** Optional evidence/measurement bullets explaining how we know. */
        howWeKnow: nonEmptyStringListSchema.optional(),
        /** Optional unresolved question bullets for future learning prompts. */
        openQuestions: nonEmptyStringListSchema.optional(),
        /** Optional graph edges linking this body to other entities. */
        relations: z.array(relationSchema).optional(),
        /** Optional embedded ring metadata; rings are not standalone entities. */
        rings: ringsSchema.optional()
    })
    .strict();

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
