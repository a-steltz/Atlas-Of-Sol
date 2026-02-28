/**
 * Builds an ID-keyed lookup table from entities that expose a string `id`.
 *
 * If duplicate IDs are present, later items overwrite earlier ones to preserve
 * the same last-write-wins behavior as `Object.fromEntries`.
 *
 * @param {readonly T[]} items - Source entities to index by `id`
 * @returns {Record<string, T>} Object lookup keyed by entity `id`
 */
export function indexById<T extends { id: string }>(items: readonly T[]): Record<string, T> {
    const lookup: Record<string, T> = {};

    for (const item of items) {
        lookup[item.id] = item;
    }

    return lookup;
}
