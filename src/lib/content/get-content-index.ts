import "server-only";

/**
 * Content index loader for Atlas of Sol.
 *
 * Purpose:
 * - Discover `system.json`, `body.json`, and `mission.json` files under `content/`
 * - Parse and schema-validate each document against shared Zod contracts
 * - Enforce cross-entity reference integrity and MVP hierarchy invariants
 * - Return normalized, deterministically sorted lookup structures for server routes
 *
 * This module is server-only and is consumed by app routes through `getContentIndex`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
    bodySchema,
    kindFromFilename,
    missionSchema,
    systemSchema,
    type AnyEntity,
    type BodyEntity,
    type ContentEntityKind,
    type MissionEntity,
    type SystemEntity
} from "@/lib/content/schema";

export type ContentIndex = {
    /** Systems sorted by display name. */
    systems: SystemEntity[];
    /** Bodies sorted by `navOrder` (fallback: name). */
    bodies: BodyEntity[];
    /** Missions sorted by display name. */
    missions: MissionEntity[];
    /** Global entity lookup keyed by canonical `id` across all kinds. */
    entitiesById: Record<string, AnyEntity>;
    /** Body list grouped by owning system ID (each list is sorted). */
    bodiesBySystemId: Record<string, BodyEntity[]>;
    /** Direct child-body list grouped by `navParentId` (each list is sorted). */
    childrenByParentId: Record<string, BodyEntity[]>;
};

/**
 * Internal normalized entry used during load/validation before final indexing.
 * Retains source metadata (`relPath`) so validation errors can point to files.
 */
type IndexedEntity = {
    /** Parsed content kind derived from filename (`system|body|mission`). */
    kind: ContentEntityKind;
    /** File path relative to project root for human-friendly error output. */
    relPath: string;
    /** Schema-validated entity payload. */
    data: AnyEntity;
};

const projectRoot = path.resolve(process.cwd());
const contentRoot = path.join(projectRoot, "content");

/**
 * Sorts bodies for deterministic output across loaders and page rendering.
 *
 * @param {BodyEntity} a - Left body in comparator
 * @param {BodyEntity} b - Right body in comparator
 * @returns {number} Sort order value
 */
function sortBodies(a: BodyEntity, b: BodyEntity): number {
    const navA = a.navOrder ?? Number.POSITIVE_INFINITY;
    const navB = b.navOrder ?? Number.POSITIVE_INFINITY;

    if (navA !== navB) return navA - navB;
    return a.name.localeCompare(b.name);
}

/**
 * Flattens Zod issue objects into a compact, readable error message.
 *
 * @param {import("zod").ZodError} error - Validation error returned by Zod
 * @returns {string} Human-readable issue list
 */
function formatZodError(error: import("zod").ZodError): string {
    return error.issues
        .map((issue) => {
            const issuePath = issue.path?.length
                ? issue.path.map((pathSegment) => String(pathSegment)).join(".")
                : "(root)";
            return `${issuePath}: ${issue.message}`;
        })
        .join("; ");
}

/**
 * Recursively collects all content schema files under a directory.
 *
 * @param {string} dir - Directory to scan
 * @returns {Promise<string[]>} Absolute file paths for system/body/mission JSON files
 */
async function listContentFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...(await listContentFiles(fullPath)));
            continue;
        }

        if (entry.isFile()) {
            if (
                entry.name === "system.json" ||
                entry.name === "body.json" ||
                entry.name === "mission.json"
            ) {
                results.push(fullPath);
            }
        }
    }

    return results;
}

/**
 * Reads and parses a JSON file with a path-aware parse error.
 *
 * @param {string} filePath - Absolute file path
 * @returns {Promise<unknown>} Parsed JSON object
 */
async function readJsonFile(filePath: string): Promise<unknown> {
    const raw = await fs.readFile(filePath, "utf8");
    try {
        return JSON.parse(raw);
    } catch (err) {
        throw new Error(
            `Invalid JSON in ${path.relative(projectRoot, filePath)}: ${err instanceof Error ? err.message : String(err)}`
        );
    }
}

/**
 * Validates cross-entity references after schema-level validation passes.
 *
 * @param {Map<string, IndexedEntity>} entriesById - Map of validated entities keyed by id
 * @returns {void}
 */
function validateReferenceIntegrity(entriesById: Map<string, IndexedEntity>): void {
    // Validate system-level center-body semantics before body graph checks so
    // downstream UI derivations can safely rely on `primaryBodyId`.
    for (const [id, entry] of entriesById.entries()) {
        if (entry.kind !== "system") continue;

        const system = entry.data as SystemEntity;
        const primaryBodyEntry = entriesById.get(system.primaryBodyId);
        if (!primaryBodyEntry || primaryBodyEntry.kind !== "body") {
            throw new Error(
                `Invalid primaryBodyId: "${system.primaryBodyId}" on system "${id}" (${entry.relPath}) (no body with that id)`
            );
        }

        const primaryBody = primaryBodyEntry.data as BodyEntity;
        if (primaryBody.systemId !== system.id) {
            throw new Error(
                `Invalid primaryBodyId: "${system.primaryBodyId}" on system "${id}" (${entry.relPath}) (body belongs to system "${primaryBody.systemId}")`
            );
        }

        if (primaryBody.navParentId !== system.id) {
            throw new Error(
                `Invalid primaryBodyId: "${system.primaryBodyId}" on system "${id}" (${entry.relPath}) (primary body must have navParentId "${system.id}")`
            );
        }
    }

    for (const [id, entry] of entriesById.entries()) {
        if (entry.kind !== "body") continue;

        const body = entry.data as BodyEntity;
        const system = entriesById.get(body.systemId);
        if (!system || system.kind !== "system") {
            throw new Error(
                `Invalid systemId: "${body.systemId}" on body "${id}" (${entry.relPath}) (no system with that id)`
            );
        }

        if (body.navParentId === id) {
            throw new Error(
                `Invalid navParentId: body "${id}" cannot be its own parent (${entry.relPath})`
            );
        }

        const parent = entriesById.get(body.navParentId);
        if (!parent) {
            throw new Error(
                `Invalid navParentId: "${body.navParentId}" on body "${id}" (${entry.relPath}) (no entity with that id)`
            );
        }

        if (body.navParentId === body.systemId) {
            // MVP invariant: a system root may only have one direct body child,
            // and that child must be the configured primary center body.
            const systemEntry = entriesById.get(body.systemId);
            const systemData = systemEntry?.data as SystemEntity | undefined;
            const primaryBodyId = systemData?.primaryBodyId;

            if (!primaryBodyId || body.id !== primaryBodyId) {
                throw new Error(
                    `Invalid navParentId: "${body.navParentId}" on body "${id}" (${entry.relPath}) (only the system primary body may be a direct child of the system root)`
                );
            }
        }
    }

    for (const [id, entry] of entriesById.entries()) {
        if (entry.kind !== "mission") continue;

        const mission = entry.data as MissionEntity;
        if (!mission.relations) continue;

        for (const relation of mission.relations) {
            if (!entriesById.has(relation.targetId)) {
                throw new Error(
                    `Invalid relation targetId: "${relation.targetId}" on mission "${id}" (${entry.relPath})`
                );
            }
        }
    }
}

/**
 * Loads all known content files, validates them, and builds a normalized index.
 *
 * Pipeline overview:
 * 1. Verify `content/` exists; return empty index when absent.
 * 2. Recursively discover schema files (`system.json`, `body.json`, `mission.json`).
 * 3. Parse JSON and run kind-specific Zod validation.
 * 4. Enforce global ID uniqueness across all entity kinds.
 * 5. Run cross-entity integrity checks (system/body/mission references and hierarchy rules).
 * 6. Materialize sorted arrays and grouped lookups for route rendering.
 *
 * @returns {Promise<ContentIndex>} Normalized content index for route rendering
 * @throws {Error} When JSON parsing fails, schema validation fails, IDs collide,
 * or cross-entity integrity checks fail
 */
async function loadContentIndex(): Promise<ContentIndex> {
    // Fast-exit: missing `content/` is treated as an empty catalog.
    const exists = await fs
        .stat(contentRoot)
        .then((stat) => stat.isDirectory())
        .catch(() => false);

    if (!exists) {
        return {
            systems: [],
            bodies: [],
            missions: [],
            entitiesById: {},
            bodiesBySystemId: {},
            childrenByParentId: {}
        };
    }

    // Stage 1: discover candidate files and create an ID-keyed staging map.
    const files = await listContentFiles(contentRoot);
    const entriesById = new Map<string, IndexedEntity>();

    for (const filePath of files) {
        const kind = kindFromFilename(path.basename(filePath));
        if (kind === "unknown") continue;

        // Stage 2: parse and schema-validate by filename-derived entity kind.
        const json = await readJsonFile(filePath);
        const relPath = path.relative(projectRoot, filePath);

        const parsed =
            kind === "system"
                ? systemSchema.safeParse(json)
                : kind === "body"
                  ? bodySchema.safeParse(json)
                  : missionSchema.safeParse(json);

        if (!parsed.success) {
            throw new Error(
                `Schema validation failed for ${relPath}: ${formatZodError(parsed.error)}`
            );
        }

        // Stage 3: enforce global ID uniqueness across all content kinds.
        const existing = entriesById.get(parsed.data.id);
        if (existing) {
            throw new Error(
                `Duplicate id: "${parsed.data.id}" (found in ${existing.kind}: ${existing.relPath} and ${kind}: ${relPath})`
            );
        }

        entriesById.set(parsed.data.id, {
            kind,
            relPath,
            data: parsed.data as AnyEntity
        });
    }

    // Stage 4: validate cross-entity references and hierarchy invariants.
    validateReferenceIntegrity(entriesById);

    // Stage 5: materialize primary arrays and global lookup map.
    const systems: SystemEntity[] = [];
    const bodies: BodyEntity[] = [];
    const missions: MissionEntity[] = [];
    const entitiesById: Record<string, AnyEntity> = {};

    for (const [id, entry] of entriesById.entries()) {
        entitiesById[id] = entry.data;
        if (entry.kind === "system") systems.push(entry.data as SystemEntity);
        if (entry.kind === "body") bodies.push(entry.data as BodyEntity);
        if (entry.kind === "mission") missions.push(entry.data as MissionEntity);
    }

    // Keep top-level collections deterministic for stable rendering and tests.
    systems.sort((a, b) => a.name.localeCompare(b.name));
    bodies.sort(sortBodies);
    missions.sort((a, b) => a.name.localeCompare(b.name));

    // Stage 6: build secondary lookup indexes used by map and navigation UI.
    const bodiesBySystemId: Record<string, BodyEntity[]> = {};
    const childrenByParentId: Record<string, BodyEntity[]> = {};

    for (const body of bodies) {
        const bySystem = bodiesBySystemId[body.systemId] ?? [];
        bySystem.push(body);
        bodiesBySystemId[body.systemId] = bySystem;

        const byParent = childrenByParentId[body.navParentId] ?? [];
        byParent.push(body);
        childrenByParentId[body.navParentId] = byParent;
    }

    // Normalize each group order so grouped traversals are deterministic too.
    for (const bodyList of Object.values(bodiesBySystemId)) {
        bodyList.sort(sortBodies);
    }

    for (const childList of Object.values(childrenByParentId)) {
        childList.sort(sortBodies);
    }

    // Final normalized index consumed by server routes and client map shell.
    return {
        systems,
        bodies,
        missions,
        entitiesById,
        bodiesBySystemId,
        childrenByParentId
    };
}

/**
 * Returns a memoized content index for the current server process.
 */
export const getContentIndex = cache(loadContentIndex);
