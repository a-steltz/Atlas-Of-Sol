"use client";

/**
 * Atlas map shell component.
 *
 * Purpose:
 * - Render the sticky top-map experience and scrolling museum floor
 * - Bridge server-loaded content indexes into client-side interaction state
 * - Keep all hierarchy levels visually consistent via one orbit-lane model
 */
import { useMemo, useState } from "react";

import { ChevronRight, Orbit, Telescope } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";

import type { BodyEntity, SystemEntity } from "@/lib/content/schema";

import {
    buildBreadcrumb,
    deriveOrbitLaneModel,
    getQuickStats,
    sizeToPixels,
    type AtlasBodiesById,
    type AtlasChildrenByParentId,
    type AtlasSystemsById
} from "./atlas-map-utils";

type AtlasMapShellProps = {
    /** All systems loaded from content index. */
    systems: SystemEntity[];
    /** All bodies loaded from content index. */
    bodies: BodyEntity[];
    /** Parent ID to direct-child bodies index. */
    childrenByParentId: AtlasChildrenByParentId;
};

/**
 * Client-side sticky map and museum-floor shell for the Atlas of Sol home page.
 * Renders one unified horizontal lane (`center body + orbiters`) for both system
 * and body views so all hierarchy levels share the same visual grammar.
 *
 * @param {AtlasMapShellProps} props - Preloaded content index slices from server
 * @returns {JSX.Element} Interactive sticky map with bottom peek floor
 */
export default function AtlasMapShell({ systems, bodies, childrenByParentId }: AtlasMapShellProps) {
    const systemsById = useMemo<AtlasSystemsById>(
        () => Object.fromEntries(systems.map((system) => [system.id, system])),
        [systems]
    );

    const bodiesById = useMemo<AtlasBodiesById>(
        () => Object.fromEntries(bodies.map((body) => [body.id, body])),
        [bodies]
    );

    const primarySystem = systems.find((system) => system.id === "sol") ?? systems[0];
    const [anchorId, setAnchorId] = useState<string>(primarySystem?.id ?? "sol");

    const anchorBody = bodiesById[anchorId];
    const laneModel = deriveOrbitLaneModel({
        anchorId,
        systemsById,
        bodiesById,
        childrenByParentId
    });

    const breadcrumb = buildBreadcrumb({
        anchorId,
        systemsById,
        bodiesById
    });

    const quickStats = anchorBody ? getQuickStats(anchorBody) : [];

    const handleAnchorChange = (nextAnchorId: string) => {
        // Centralized setter keeps click interactions explicit and easy to trace
        // when center-body and orbiter elements trigger anchor transitions.
        setAnchorId(nextAnchorId);
    };

    return (
        <div className="min-h-[190svh] bg-slate-950 text-slate-100">
            <section className="sticky top-0 z-0 h-[80svh] overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.24),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_65%,#0f172a_100%)]" />
                <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-8">
                    <header className="flex flex-col gap-2">
                        <p className="text-xs tracking-[0.28em] text-sky-300 uppercase">
                            Atlas of Sol
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Telescope className="h-4 w-4 text-sky-300" />
                            <span>
                                Sticky Map + Peek POC grounded on <code>navParentId</code>
                            </span>
                        </div>
                        <nav
                            aria-label="Breadcrumb"
                            className="flex flex-wrap items-center gap-1 text-xs"
                        >
                            {breadcrumb.map((item, index) => (
                                <div className="flex items-center gap-1" key={item.id}>
                                    <button
                                        className="rounded-md px-2 py-1 text-slate-200 transition hover:bg-white/10 hover:text-white"
                                        onClick={() => handleAnchorChange(item.id)}
                                        type="button"
                                    >
                                        {item.label}
                                    </button>
                                    {index < breadcrumb.length - 1 ? (
                                        <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                                    ) : null}
                                </div>
                            ))}
                        </nav>
                    </header>

                    <LayoutGroup>
                        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-slate-900/35 p-3 backdrop-blur sm:p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Orbit className="h-4 w-4 text-sky-300" />
                                <p className="text-xs tracking-[0.22em] text-slate-300 uppercase">
                                    Orbit Map
                                </p>
                            </div>

                            {laneModel.laneBodies.length === 0 ? (
                                <div className="flex flex-1 items-center">
                                    <p className="w-full rounded-xl border border-dashed border-white/20 bg-slate-900/55 p-5 text-sm text-slate-300">
                                        No center body is configured for this system yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-1 items-center">
                                    <div className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-4">
                                        <div className="h-[290px] overflow-x-auto overflow-y-hidden pb-1">
                                            {/* Marker centers are locked to one midpoint so all circles share
                                                the same visual orbit horizon, independent of body size. */}
                                            <div className="flex h-full min-w-max items-stretch gap-4 sm:gap-6">
                                                {laneModel.laneBodies.map((body, index) => {
                                                    const isCenter = index === 0;
                                                    const variant = isCenter ? "anchor" : "child";
                                                    const diameter = sizeToPixels(
                                                        body.size,
                                                        variant
                                                    );
                                                    const isInteractive =
                                                        !isCenter ||
                                                        (isCenter && laneModel.isSystemRoot);
                                                    const isSelected =
                                                        isCenter && !laneModel.isSystemRoot;

                                                    return (
                                                        <article
                                                            className="relative h-full text-center"
                                                            key={body.id}
                                                            style={{
                                                                width: Math.max(98, diameter + 18)
                                                            }}
                                                        >
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                                {/*
                                                                    Center bodies and orbiters render in the same lane,
                                                                    but shared `layoutId` still links each body identity so
                                                                    promotion animations remain smooth and continuous.
                                                                */}
                                                                <BodyMarker
                                                                    body={body}
                                                                    interactive={isInteractive}
                                                                    onSelect={() => {
                                                                        if (!isInteractive) return;
                                                                        handleAnchorChange(body.id);
                                                                    }}
                                                                    selected={isSelected}
                                                                    showNameInside={false}
                                                                    variant={variant}
                                                                />
                                                            </div>

                                                            <div
                                                                className="absolute inset-x-0 px-1"
                                                                style={{
                                                                    top: `calc(50% + ${Math.round(diameter / 2) + 8}px)`
                                                                }}
                                                            >
                                                                <p className="truncate text-sm font-semibold text-white">
                                                                    {body.name}
                                                                </p>
                                                                <p className="text-xs text-slate-300">
                                                                    {body.type} · {body.size}/10
                                                                </p>
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    </LayoutGroup>
                </div>
            </section>

            <section className="relative z-10 min-h-[126svh] rounded-t-3xl border border-white/10 bg-slate-900/96 px-4 pb-20 pt-6 shadow-[0_-24px_70px_rgba(2,6,23,0.78)] backdrop-blur sm:px-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                    <p className="text-xs tracking-[0.24em] text-slate-400 uppercase">
                        Museum Floor
                    </p>

                    {anchorBody ? (
                        <>
                            <article className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
                                <h3 className="text-lg font-semibold text-white">
                                    {anchorBody.name}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-200">
                                    {anchorBody.hook}
                                </p>

                                <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    {quickStats.map((stat) => (
                                        <div
                                            className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2"
                                            key={stat.label}
                                        >
                                            <dt className="text-[11px] tracking-[0.16em] text-slate-400 uppercase">
                                                {stat.label}
                                            </dt>
                                            <dd className="mt-1 text-sm font-medium text-slate-100">
                                                {stat.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </article>

                            <article className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
                                <h4 className="text-sm tracking-[0.2em] text-slate-300 uppercase">
                                    Highlight Snapshot
                                </h4>
                                {anchorBody.highlights?.length ? (
                                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                                        {anchorBody.highlights.slice(0, 2).map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-3 text-sm text-slate-300">
                                        Extended highlights for this body are still being curated.
                                    </p>
                                )}
                            </article>
                        </>
                    ) : (
                        <article className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
                            <h3 className="text-lg font-semibold text-white">
                                Enter the floor by selecting a body
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-200">
                                {laneModel.system?.description ??
                                    "The top map remains in view while this floor scrolls. Select a body above to reveal hook and quick stats here."}
                            </p>
                        </article>
                    )}
                </div>
            </section>
        </div>
    );
}

type BodyMarkerProps = {
    /** Canonical body record represented by this marker. */
    body: BodyEntity;
    /** Marker sizing role; center body uses the larger "anchor" scale. */
    variant: "anchor" | "child";
    /** Optional click handler used for interactive markers. */
    onSelect?: () => void;
    /** Visual emphasis ring for currently selected center body. */
    selected?: boolean;
    /** Whether to render the body name inside the marker. */
    showNameInside?: boolean;
    /** Whether the marker accepts user interaction. */
    interactive?: boolean;
};

/**
 * Circular 2D map marker used for both center-body and orbiter rendering.
 * The canonical body ID is used to build the shared Motion `layoutId`.
 *
 * @param {BodyMarkerProps} props - Marker inputs
 * @returns {JSX.Element} Animated body marker button
 */
function BodyMarker({
    body,
    variant,
    onSelect,
    selected = false,
    showNameInside = variant === "anchor",
    interactive = true
}: BodyMarkerProps) {
    const diameter = sizeToPixels(body.size, variant);

    return (
        <motion.button
            aria-label={`${interactive ? "Select" : "Viewing"} ${body.name}`}
            className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-sky-200/50 bg-sky-300/18 text-[11px] font-semibold tracking-wide text-sky-50 shadow-[0_0_35px_rgba(56,189,248,0.3)] transition ${
                interactive
                    ? "cursor-pointer hover:scale-[1.03] hover:border-sky-200"
                    : "cursor-default"
            }`}
            layout
            // The body ID is globally unique in content and maps 1:1 to the entity,
            // making it the safest shared transition key across map states.
            layoutId={`body-${body.id}`}
            onClick={() => {
                if (!interactive || !onSelect) return;
                onSelect();
            }}
            style={{
                width: diameter,
                height: diameter
            }}
            transition={{
                type: "spring",
                stiffness: 280,
                damping: 28,
                mass: 0.65
            }}
            type="button"
        >
            <span className="absolute inset-[14%] rounded-full border border-sky-100/35" />
            {selected ? (
                <span className="absolute inset-[6%] rounded-full border border-sky-100/40" />
            ) : null}
            {showNameInside ? (
                <span className="px-2 text-center leading-tight">{body.name}</span>
            ) : null}
        </motion.button>
    );
}
