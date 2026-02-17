/**
 * Atlas of Sol content validation entrypoint.
 *
 * Purpose:
 * - Enforce strict schema validation for `system.json`, `body.json`, and `mission.json`
 * - Enforce globally unique entity IDs across all indexed content
 * - Enforce cross-entity reference integrity (`systemId`, `navParentId`, `relations[].targetId`)
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
import { z } from "zod";

const projectRoot = path.resolve(process.cwd());
const contentRoot = path.join(projectRoot, "content");

/**
 * Allowed top-level body types for MVP.
 * Rings are intentionally excluded because they are embedded data.
 */
const bodyTypeSchema = z.enum([
    "star",
    "planet",
    "moon",
    "dwarf-planet",
    "asteroid",
    "comet",
    "region"
]);

const relationSchema = z.object({
    type: z.string().min(1),
    targetId: z.string().min(1)
});

const ringsSchema = z
    .object({
        description: z.string().optional(),
        data: z.record(z.unknown()).optional()
    })
    .strict();

const systemSchema = z
    .object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional()
    })
    .strict();

const bodySchema = z
    .object({
        id: z.string().min(1),
        name: z.string().min(1),
        type: bodyTypeSchema,
        systemId: z.string().min(1),
        navParentId: z.string().min(1),
        navOrder: z.number().finite().optional(),
        curationScore: z.number().finite().min(0).max(100),
        relations: z.array(relationSchema).optional(),
        rings: ringsSchema.optional()
    })
    .strict();

const missionSchema = z
    .object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        relations: z.array(relationSchema).optional()
    })
    .strict();

/**
 * Flattens Zod issue objects into a compact, readable error message.
 *
 * @param {import("zod").ZodError} error - Validation error returned by Zod
 * @returns {string} Human-readable issue list
 */
function formatZodError(error) {
    return error.issues
        .map((issue) => {
            const p = issue.path?.length ? issue.path.join(".") : "(root)";
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
async function listContentFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results = [];

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
 * Maps a known content filename to its entity kind.
 *
 * @param {string} filename - Basename to classify
 * @returns {"system" | "body" | "mission" | "unknown"} Entity kind
 */
function kindFromFilename(filename) {
    if (filename === "system.json") return "system";
    if (filename === "body.json") return "body";
    if (filename === "mission.json") return "mission";
    return "unknown";
}

/**
 * Reads and parses a JSON file with a path-aware parse error.
 *
 * @param {string} filePath - Absolute file path
 * @returns {Promise<unknown>} Parsed JSON object
 */
async function readJsonFile(filePath) {
    const raw = await fs.readFile(filePath, "utf8");
    try {
        return JSON.parse(raw);
    } catch (err) {
        throw new Error(
            `Invalid JSON in ${path.relative(projectRoot, filePath)}: ${err?.message ?? String(err)}`
        );
    }
}

/**
 * Validates content files against strict schemas and cross-entity references.
 *
 * Validation guarantees:
 * - global ID uniqueness across all indexed entities
 * - strict schema shape per entity type
 * - valid `systemId`, `navParentId`, and `relations[].targetId` references
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
    const entitiesById = new Map();

    for (const filePath of files) {
        const filename = path.basename(filePath);
        const kind = kindFromFilename(filename);
        const json = await readJsonFile(filePath);

        let parsed;
        if (kind === "system") parsed = systemSchema.safeParse(json);
        else if (kind === "body") parsed = bodySchema.safeParse(json);
        else if (kind === "mission") parsed = missionSchema.safeParse(json);
        else continue;

        if (!parsed.success) {
            throw new Error(
                `Schema validation failed for ${path.relative(projectRoot, filePath)}: ${formatZodError(parsed.error)}`
            );
        }

        // Enforce globally unique IDs across systems, bodies, and missions.
        const { id } = parsed.data;
        const existing = entitiesById.get(id);
        if (existing) {
            throw new Error(
                `Duplicate id: "${id}" (found in ${existing.kind}: ${existing.relPath} and ${kind}: ${path.relative(
                    projectRoot,
                    filePath
                )})`
            );
        }

        entitiesById.set(id, {
            kind,
            relPath: path.relative(projectRoot, filePath),
            data: parsed.data
        });
    }

    // Phase 2: Validate body graph integrity (system linkage + navigation parent + relations).
    for (const [id, entry] of entitiesById.entries()) {
        if (entry.kind !== "body") continue;

        const { navParentId, systemId, relations } = entry.data;

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

        // Body relations may target any existing entity in the global graph.
        if (relations) {
            for (const rel of relations) {
                if (!entitiesById.has(rel.targetId)) {
                    throw new Error(
                        `Invalid relation targetId: "${rel.targetId}" on body "${id}" (${entry.relPath})`
                    );
                }
            }
        }
    }

    // Phase 3: Validate mission relation targets.
    for (const [id, entry] of entitiesById.entries()) {
        if (entry.kind !== "mission") continue;
        const { relations } = entry.data;
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
