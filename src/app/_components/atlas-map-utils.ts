/**
 * Atlas map utility module.
 *
 * Purpose:
 * - Centralize pure, reusable derivation/formatting logic for the orbit map UI
 * - Keep rendering components focused on layout and interaction wiring
 * - Provide documented shared types used by the map shell and helper functions
 */
import type { BodyEntity, SystemEntity } from "@/lib/content/schema";

/** Parent ID to direct-child bodies index used by the map lane renderer. */
export type AtlasChildrenByParentId = Record<string, BodyEntity[]>;
/** Body entity lookup keyed by canonical body ID. */
export type AtlasBodiesById = Record<string, BodyEntity>;
/** System entity lookup keyed by canonical system ID. */
export type AtlasSystemsById = Record<string, SystemEntity>;

/** Breadcrumb token for system/body navigation pills above the map. */
export type BreadcrumbItem = {
    id: string;
    label: string;
    kind: "system" | "body";
};

/** Compact key/value pair displayed in the museum floor quick-stats grid. */
export type QuickStat = {
    label: string;
    value: string;
};

/**
 * Resolved data model used to render one orbit lane frame.
 *
 * `laneBodies` always starts with the visual center body and then appends
 * direct orbiters in display order.
 */
export type OrbitLaneModel = {
    system: SystemEntity | null;
    centerBody: BodyEntity | null;
    orbiters: BodyEntity[];
    laneBodies: BodyEntity[];
    isSystemRoot: boolean;
};

/** Parameter bundle for deriving a lane model from current app state. */
type LaneDerivationParams = {
    anchorId: string;
    systemsById: AtlasSystemsById;
    bodiesById: AtlasBodiesById;
    childrenByParentId: AtlasChildrenByParentId;
};

/**
 * Converts editorial body `size` (`1-10`) into pixel diameter for map markers.
 * Anchor markers are intentionally larger than child markers for hierarchy clarity.
 *
 * @param {number} size - Canonical body size score from content
 * @param {"anchor" | "child"} variant - Marker role in the sticky map
 * @returns {number} Pixel diameter used for the rendered marker
 */
export function sizeToPixels(size: number, variant: "anchor" | "child"): number {
    const clamped = Math.min(10, Math.max(1, size));
    if (variant === "anchor") return 88 + clamped * 12;
    return 30 + clamped * 8;
}

/**
 * Returns direct children for a parent ID using the precomputed index.
 *
 * @param {string} parentId - Entity ID currently acting as map anchor
 * @param {AtlasChildrenByParentId} childrenByParentId - Parent to child-body index
 * @returns {BodyEntity[]} Sorted direct-child bodies or an empty list
 */
export function getChildren(
    parentId: string,
    childrenByParentId: AtlasChildrenByParentId
): BodyEntity[] {
    return childrenByParentId[parentId] ?? [];
}

/**
 * Derives the unified orbit-lane model for the current map anchor.
 *
 * System-root views intentionally use `primaryBodyId` as the visual center body.
 * Body views use the selected body as the visual center and show direct children.
 *
 * @param {{ anchorId: string; systemsById: AtlasSystemsById; bodiesById: AtlasBodiesById; childrenByParentId: AtlasChildrenByParentId }} params - Lane derivation inputs
 * @param {string} params.anchorId - Current map anchor entity ID
 * @param {AtlasSystemsById} params.systemsById - Indexed systems by ID
 * @param {AtlasBodiesById} params.bodiesById - Indexed bodies by ID
 * @param {AtlasChildrenByParentId} params.childrenByParentId - Parent->children lookup table
 * @returns {OrbitLaneModel} Center body plus orbiters for rendering the map lane
 */
export function deriveOrbitLaneModel({
    anchorId,
    systemsById,
    bodiesById,
    childrenByParentId
}: LaneDerivationParams): OrbitLaneModel {
    const anchorBody = bodiesById[anchorId];
    if (anchorBody) {
        const orbiters = getChildren(anchorBody.id, childrenByParentId);
        return {
            system: systemsById[anchorBody.systemId] ?? null,
            centerBody: anchorBody,
            orbiters,
            laneBodies: [anchorBody, ...orbiters],
            isSystemRoot: false
        };
    }

    const system = systemsById[anchorId] ?? null;
    if (!system) {
        return {
            system: null,
            centerBody: null,
            orbiters: [],
            laneBodies: [],
            isSystemRoot: true
        };
    }

    const centerBody = bodiesById[system.primaryBodyId] ?? null;
    if (!centerBody) {
        return {
            system,
            centerBody: null,
            orbiters: [],
            laneBodies: [],
            isSystemRoot: true
        };
    }

    const orbiters = getChildren(centerBody.id, childrenByParentId);
    return {
        system,
        centerBody,
        orbiters,
        laneBodies: [centerBody, ...orbiters],
        isSystemRoot: true
    };
}

/**
 * Builds breadcrumb items from the active anchor back to its system root.
 *
 * @param {{ anchorId: string; systemsById: AtlasSystemsById; bodiesById: AtlasBodiesById }} params - Breadcrumb inputs
 * @param {string} params.anchorId - Current anchor entity ID
 * @param {AtlasSystemsById} params.systemsById - System lookup by ID
 * @param {AtlasBodiesById} params.bodiesById - Body lookup by ID
 * @returns {BreadcrumbItem[]} Ordered breadcrumb path from system root to anchor
 */
export function buildBreadcrumb({
    anchorId,
    systemsById,
    bodiesById
}: {
    anchorId: string;
    systemsById: AtlasSystemsById;
    bodiesById: AtlasBodiesById;
}): BreadcrumbItem[] {
    const anchorBody = bodiesById[anchorId];
    const systemId = anchorBody ? anchorBody.systemId : anchorId;
    const system = systemsById[systemId];

    if (!system) return [];

    const root: BreadcrumbItem = {
        id: system.id,
        label: system.name,
        kind: "system"
    };

    if (!anchorBody) return [root];

    const visited = new Set<string>();
    const chain: BreadcrumbItem[] = [];

    let cursor: BodyEntity | undefined = anchorBody;

    while (cursor) {
        // Keep breadcrumbs focused on user-selected context. The system primary body
        // is intentionally omitted unless it is itself the selected anchor.
        if (cursor.id === system.primaryBodyId && anchorId !== system.primaryBodyId) {
            break;
        }

        if (visited.has(cursor.id)) break;
        visited.add(cursor.id);

        chain.push({
            id: cursor.id,
            label: cursor.name,
            kind: "body"
        });

        if (cursor.navParentId === systemId) break;
        cursor = bodiesById[cursor.navParentId];
    }

    chain.reverse();
    return [root, ...chain];
}

/**
 * Produces compact quick stats for the museum floor preview card.
 *
 * @param {BodyEntity} body - Body currently selected as anchor
 * @returns {QuickStat[]} Lightweight stat chips for first-read orientation
 */
export function getQuickStats(body: BodyEntity): QuickStat[] {
    const stats: QuickStat[] = [
        { label: "Type", value: body.type },
        { label: "Curation", value: `${Math.round(body.curationScore)}` },
        { label: "Size", value: `${body.size}/10` }
    ];

    const numericCandidates: Array<{ label: string; value: number | undefined; unit: string }> = [
        {
            label: "Radius",
            value: body.physical?.meanRadiusKm,
            unit: "km"
        },
        {
            label: "Orbital Period",
            value: body.orbit?.orbitalPeriodDays,
            unit: "days"
        },
        {
            label: "Rotation",
            value: body.orbit?.rotationPeriodHours,
            unit: "hrs"
        },
        {
            label: "Mean Temp",
            value: body.environment?.meanTemperatureK,
            unit: "K"
        }
    ];

    const metric = numericCandidates.find((candidate) => candidate.value !== undefined);
    if (metric && metric.value !== undefined) {
        stats.push({
            label: metric.label,
            value: `${formatMetric(metric.value)} ${metric.unit}`
        });
    }

    return stats;
}

/**
 * Formats a metric for compact badge display.
 *
 * @param {number} value - Numeric metric to format
 * @returns {string} Human-readable compact representation
 */
function formatMetric(value: number): string {
    if (value === 0) return "0";

    const magnitude = Math.abs(value);
    if (magnitude >= 1_000_000 || magnitude < 0.001) {
        return value.toExponential(2);
    }

    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2
    }).format(value);
}
