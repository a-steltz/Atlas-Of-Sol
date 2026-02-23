/**
 * Atlas of Sol content validation entrypoint.
 *
 * Purpose:
 * - Enforce strict schema validation for `system.json`, `body.json`, and `mission.json`
 * - Enforce globally unique entity IDs across all indexed content
 * - Enforce cross-entity reference integrity (`systemId`, `navParentId`, mission `relations[].targetId`)
 *
 * Inputs:
 * - Recursively scans the `content/` directory under the current project root
 *
 * Outputs:
 * - Prints a success summary when validation passes
 * - Throws with explicit, path-aware error messages when validation fails
 *
 * Exit behavior:
 * - Exits with code `0` on success
 * - Exits with code `1` on validation or parse errors
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
    bodySchema,
    kindFromFilename,
    missionSchema,
    systemSchema,
    type AnyEntity,
    type BodyEntity,
    type ContentEntityKind,
    type MissionEntity
} from "../../src/lib/content/schema";

const projectRoot = path.resolve(process.cwd());
const contentRoot = path.join(projectRoot, "content");

type IndexedEntity = {
    kind: ContentEntityKind;
    relPath: string;
    data: AnyEntity;
};

/**
 * Flattens Zod issue objects into a compact, readable error message.
 *
 * @param {import("zod").ZodError} error - Validation error returned by Zod
 * @returns {string} Human-readable issue list
 */
function formatZodError(error: import("zod").ZodError): string {
    return error.issues
        .map((issue) => {
            const p = issue.path?.length
                ? issue.path.map((pathSegment) => String(pathSegment)).join(".")
                : "(root)";
            return `${p}: ${issue.message}`;
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
 * Validates content files against strict schemas and cross-entity references.
 *
 * Validation guarantees:
 * - global ID uniqueness across all indexed entities
 * - strict schema shape per entity type
 * - valid `systemId`, `navParentId`, and mission `relations[].targetId` references
 *
 * @returns {Promise<void>}
 */
async function main() {
    // Phase 0: Skip gracefully for repos that have not introduced content yet.
    const exists = await fs
        .stat(contentRoot)
        .then((s) => s.isDirectory())
        .catch(() => false);

    if (!exists) {
        console.log('No "content/" directory found; skipping content validation.');
        return;
    }

    // Phase 1: Discover candidate files and build a global entity index by ID.
    const files = await listContentFiles(contentRoot);
    const entitiesById = new Map<string, IndexedEntity>();

    for (const filePath of files) {
        const filename = path.basename(filePath);
        const kind = kindFromFilename(filename);
        if (kind === "unknown") continue;

        const json = await readJsonFile(filePath);
        const relPath = path.relative(projectRoot, filePath);
        const parseSchema =
            kind === "system" ? systemSchema : kind === "body" ? bodySchema : missionSchema;
        const parsed = parseSchema.safeParse(json);

        if (!parsed.success) {
            throw new Error(
                `Schema validation failed for ${relPath}: ${formatZodError(parsed.error)}`
            );
        }

        // Enforce globally unique IDs across systems, bodies, and missions.
        const { id } = parsed.data;
        const existing = entitiesById.get(id);
        if (existing) {
            throw new Error(
                `Duplicate id: "${id}" (found in ${existing.kind}: ${existing.relPath} and ${kind}: ${relPath})`
            );
        }

        entitiesById.set(id, {
            kind,
            relPath,
            data: parsed.data as AnyEntity
        });
    }

    // Phase 2: Validate body graph integrity (system linkage + navigation parent).
    for (const [id, entry] of entitiesById.entries()) {
        if (entry.kind !== "body") continue;

        const { navParentId, systemId } = entry.data as BodyEntity;

        const system = entitiesById.get(systemId);
        if (!system || system.kind !== "system") {
            throw new Error(
                `Invalid systemId: "${systemId}" on body "${id}" (${entry.relPath}) (no system with that id)`
            );
        }

        if (navParentId === id) {
            throw new Error(
                `Invalid navParentId: body "${id}" cannot be its own parent (${entry.relPath})`
            );
        }

        const parent = entitiesById.get(navParentId);
        if (!parent) {
            throw new Error(
                `Invalid navParentId: "${navParentId}" on body "${id}" (${entry.relPath}) (no entity with that id)`
            );
        }

    }

    // Phase 3: Validate mission relation targets.
    for (const [id, entry] of entitiesById.entries()) {
        if (entry.kind !== "mission") continue;
        const { relations } = entry.data as MissionEntity;
        if (!relations) continue;

        for (const rel of relations) {
            if (!entitiesById.has(rel.targetId)) {
                throw new Error(
                    `Invalid relation targetId: "${rel.targetId}" on mission "${id}" (${entry.relPath})`
                );
            }
        }
    }

    console.log(
        `Content validation passed: ${entitiesById.size} entities (${files.length} files scanned).`
    );
}

main().catch((err) => {
    console.error(String(err?.message ?? err));
    process.exit(1);
});
