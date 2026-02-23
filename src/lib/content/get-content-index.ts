import "server-only";

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
    systems: SystemEntity[];
    bodies: BodyEntity[];
    missions: MissionEntity[];
    entitiesById: Record<string, AnyEntity>;
    bodiesBySystemId: Record<string, BodyEntity[]>;
    childrenByParentId: Record<string, BodyEntity[]>;
};

type IndexedEntity = {
    kind: ContentEntityKind;
    relPath: string;
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
 * Loads and validates all content JSON files into a normalized in-memory index.
 *
 * @returns {Promise<ContentIndex>} Normalized content index for route rendering
 */
async function loadContentIndex(): Promise<ContentIndex> {
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

    const files = await listContentFiles(contentRoot);
    const entriesById = new Map<string, IndexedEntity>();

    for (const filePath of files) {
        const kind = kindFromFilename(path.basename(filePath));
        if (kind === "unknown") continue;

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

    validateReferenceIntegrity(entriesById);

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

    systems.sort((a, b) => a.name.localeCompare(b.name));
    bodies.sort(sortBodies);
    missions.sort((a, b) => a.name.localeCompare(b.name));

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

    for (const bodyList of Object.values(bodiesBySystemId)) {
        bodyList.sort(sortBodies);
    }

    for (const childList of Object.values(childrenByParentId)) {
        childList.sort(sortBodies);
    }

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
