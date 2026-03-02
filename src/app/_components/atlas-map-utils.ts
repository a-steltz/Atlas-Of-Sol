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

/** Label/value pair used in museum-floor detail sections. */
export type MuseumDetail = {
    label: string;
    value: string;
};

/** Group of related museum-floor facts displayed as one card. */
export type MuseumFactSection = {
    id: string;
    title: string;
    items: MuseumDetail[];
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
 * Builds discovery detail rows for the museum-floor discovery card.
 *
 * @param {BodyEntity} body - Body currently selected as anchor
 * @returns {MuseumDetail[]} Discovery metadata rows in display order
 */
export function getDiscoveryDetails(body: BodyEntity): MuseumDetail[] {
    const discovery = body.discovery;
    if (!discovery) return [];

    const details: MuseumDetail[] = [];

    if (discovery.discoveryYearPrecision === "prehistoric") {
        details.push({
            label: "Discovery Era",
            value: "Known since prehistory"
        });
    }

    if (discovery.discoveryYear !== undefined) {
        details.push({
            label: "Discovery Year",
            value:
                discovery.discoveryYearPrecision === "estimated"
                    ? `c. ${discovery.discoveryYear} (estimated)`
                    : `${discovery.discoveryYear}`
        });
    }

    if (discovery.discoveredBy) {
        details.push({
            label: "Discovered By",
            value: discovery.discoveredBy
        });
    }

    if (discovery.discoveryMethod) {
        details.push({
            label: "Method",
            value: discovery.discoveryMethod
        });
    }

    return details;
}

/**
 * Derives grouped scientific facts for approachable museum-floor scanning.
 *
 * @param {BodyEntity} body - Body currently selected as anchor
 * @returns {MuseumFactSection[]} Non-empty scientific fact groups
 */
export function getMuseumFactSections(body: BodyEntity): MuseumFactSection[] {
    const sections: MuseumFactSection[] = [];

    const physicalItems: MuseumDetail[] = [
        formatNumberDetail("Mean Radius", body.physical?.meanRadiusKm, "km"),
        formatNumberDetail("Mass", body.physical?.massKg, "kg"),
        formatNumberDetail("Density", body.physical?.densityKgM3, "kg/m^3"),
        formatNumberDetail("Surface Gravity", body.physical?.surfaceGravityMS2, "m/s^2"),
        formatNumberDetail("Escape Velocity", body.physical?.escapeVelocityMS, "m/s")
    ].flatMap(definedDetail);

    if (physicalItems.length > 0) {
        sections.push({
            id: "physical-profile",
            title: "Physical Profile",
            items: physicalItems
        });
    }

    const orbitItems: MuseumDetail[] = [
        formatNumberDetail("Semi-Major Axis", body.orbit?.semiMajorAxisKm, "km"),
        formatNumberDetail("Orbital Period", body.orbit?.orbitalPeriodDays, "days"),
        formatNumberDetail("Eccentricity", body.orbit?.eccentricity),
        formatNumberDetail("Inclination", body.orbit?.inclinationDeg, "deg"),
        formatNumberDetail("Rotation Period", body.orbit?.rotationPeriodHours, "hrs"),
        formatBooleanDetail("Retrograde Rotation", body.orbit?.retrogradeRotation),
        formatBooleanDetail("Tidally Locked", body.orbit?.tidallyLocked)
    ].flatMap(definedDetail);

    if (orbitItems.length > 0) {
        sections.push({
            id: "orbit-rotation",
            title: "Orbit and Rotation",
            items: orbitItems
        });
    }

    const compositionItems: MuseumDetail[] = [
        formatStringListDetail("Primary Composition", body.composition?.primary),
        body.composition?.atmosphere?.type
            ? {
                  label: "Atmosphere Type",
                  value: formatEnumLabel(body.composition.atmosphere.type)
              }
            : null,
        formatStringListDetail(
            "Atmospheric Components",
            body.composition?.atmosphere?.mainComponents
        ),
        formatNumberDetail(
            "Surface Pressure",
            body.composition?.atmosphere?.surfacePressureBar,
            "bar"
        ),
        formatStringListDetail("Internal Structure", body.composition?.internalStructure)
    ].flatMap(definedDetail);

    if (compositionItems.length > 0) {
        sections.push({
            id: "composition",
            title: "Composition",
            items: compositionItems
        });
    }

    const environmentItems: MuseumDetail[] = [
        formatNumberDetail("Mean Temperature", body.environment?.meanTemperatureK, "K"),
        formatNumberDetail("Minimum Temperature", body.environment?.minTemperatureK, "K"),
        formatNumberDetail("Maximum Temperature", body.environment?.maxTemperatureK, "K"),
        body.environment?.liquidWaterPresence
            ? {
                  label: "Liquid Water",
                  value: formatEnumLabel(body.environment.liquidWaterPresence)
              }
            : null,
        body.environment?.magneticFieldType
            ? {
                  label: "Magnetic Field",
                  value: formatEnumLabel(body.environment.magneticFieldType)
              }
            : null,
        body.environment?.volcanicActivity
            ? {
                  label: "Volcanic Activity",
                  value: formatEnumLabel(body.environment.volcanicActivity)
              }
            : null,
        body.environment?.cryovolcanicActivity
            ? {
                  label: "Cryovolcanic Activity",
                  value: formatEnumLabel(body.environment.cryovolcanicActivity)
              }
            : null,
        body.environment?.tectonicActivity
            ? {
                  label: "Tectonic Activity",
                  value: formatEnumLabel(body.environment.tectonicActivity)
              }
            : null
    ].flatMap(definedDetail);

    if (environmentItems.length > 0) {
        sections.push({
            id: "environment",
            title: "Environment",
            items: environmentItems
        });
    }

    return sections;
}

/**
 * Normalizes source URLs so cards can link even when legacy markdown-link
 * formatting appears inside content JSON.
 *
 * @param {string | undefined} rawUrl - Source URL field from content
 * @returns {string | null} Clickable URL or null when absent/unusable
 */
export function normalizeSourceUrl(rawUrl: string | undefined): string | null {
    if (!rawUrl) return null;

    const markdownLinkMatch = rawUrl.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/);
    if (markdownLinkMatch) {
        return markdownLinkMatch[1];
    }

    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
        return null;
    }

    return trimmedUrl;
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

/**
 * Converts finite numeric values to museum-floor label rows.
 *
 * @param {string} label - Display label for this metric
 * @param {number | undefined} value - Numeric value from content
 * @param {string} [unit] - Optional suffix unit label
 * @returns {MuseumDetail | null} Detail row or null when value is absent
 */
function formatNumberDetail(
    label: string,
    value: number | undefined,
    unit?: string
): MuseumDetail | null {
    if (value === undefined) return null;
    return {
        label,
        value: unit ? `${formatMetric(value)} ${unit}` : formatMetric(value)
    };
}

/**
 * Converts boolean values into reader-friendly yes/no label rows.
 *
 * @param {string} label - Display label for this metric
 * @param {boolean | undefined} value - Boolean value from content
 * @returns {MuseumDetail | null} Detail row or null when value is absent
 */
function formatBooleanDetail(label: string, value: boolean | undefined): MuseumDetail | null {
    if (value === undefined) return null;
    return {
        label,
        value: value ? "Yes" : "No"
    };
}

/**
 * Converts optional string arrays into comma-joined museum-floor rows.
 *
 * @param {string} label - Display label for this detail
 * @param {string[] | undefined} values - Optional string array value
 * @returns {MuseumDetail | null} Detail row or null when no strings are provided
 */
function formatStringListDetail(label: string, values: string[] | undefined): MuseumDetail | null {
    if (!values?.length) return null;
    return {
        label,
        value: values.join(", ")
    };
}

/**
 * Title-cases simple enum values stored in kebab-case.
 *
 * @param {string} value - Enum value from content schema
 * @returns {string} Human-readable label
 */
export function formatEnumLabel(value: string): string {
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

/**
 * Helper used with `flatMap` to strip null detail candidates.
 *
 * @param {MuseumDetail | null} detail - Candidate detail row
 * @returns {MuseumDetail[]} Array with zero or one concrete detail rows
 */
function definedDetail(detail: MuseumDetail | null): MuseumDetail[] {
    return detail ? [detail] : [];
}
