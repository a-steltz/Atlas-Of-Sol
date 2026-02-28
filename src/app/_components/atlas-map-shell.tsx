"use client";

/**
 * Atlas map shell component.
 *
 * Purpose:
 * - Render the sticky top-map experience and scrolling museum floor
 * - Bridge server-loaded content indexes into client-side interaction state
 * - Keep all hierarchy levels visually consistent via one orbit-lane model
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronRight, Orbit } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { indexById } from "@/lib/collections/lookup-utils";
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
    const BODY_FADE_DURATION_SECONDS = 0.24;
    const BODY_FADE_DURATION_MS = BODY_FADE_DURATION_SECONDS * 1000;
    const systemsById = useMemo<AtlasSystemsById>(() => indexById(systems), [systems]);

    const bodiesById = useMemo<AtlasBodiesById>(() => indexById(bodies), [bodies]);

    const primarySystem = systems.find((system) => system.id === "sol") ?? systems[0];
    const [anchorId, setAnchorId] = useState<string>(primarySystem?.id ?? "sol");
    const [transitionPhase, setTransitionPhase] = useState<"idle" | "fadingOut" | "fadingIn">(
        "idle"
    );
    const [fadeNonce, setFadeNonce] = useState(0);
    const fadeOutTimerRef = useRef<number | null>(null);
    const fadeInTimerRef = useRef<number | null>(null);

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
    const shouldFadeOutBodies = transitionPhase === "fadingOut";
    const shouldFadeInBodies = transitionPhase === "fadingIn";
    const isTransitioning = transitionPhase !== "idle";

    const handleAnchorChange = (nextAnchorId: string) => {
        if (isTransitioning || nextAnchorId === anchorId) return;
        // Centralized setter keeps click interactions explicit and easy to trace
        // when center-body and orbiter elements trigger anchor transitions.
        setTransitionPhase("fadingOut");
        fadeOutTimerRef.current = window.setTimeout(() => {
            setAnchorId(nextAnchorId);
            setFadeNonce((previous) => previous + 1);
            setTransitionPhase("fadingIn");
            fadeInTimerRef.current = window.setTimeout(() => {
                setTransitionPhase("idle");
                fadeInTimerRef.current = null;
            }, BODY_FADE_DURATION_MS);
            fadeOutTimerRef.current = null;
        }, BODY_FADE_DURATION_MS);
    };

    useEffect(() => {
        return () => {
            if (fadeOutTimerRef.current !== null) {
                window.clearTimeout(fadeOutTimerRef.current);
            }
            if (fadeInTimerRef.current !== null) {
                window.clearTimeout(fadeInTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-[190svh] bg-slate-950 text-slate-100">
            <section className="sticky top-0 z-0 h-[80svh] overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.24),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_65%,#0f172a_100%)]" />
                <div className="relative mx-auto flex h-full w-full max-w-[112rem] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
                    <header className="flex flex-col gap-3">
                        <h1 className="text-2xl font-semibold tracking-[0.08em] text-sky-100 uppercase drop-shadow-[0_0_22px_rgba(56,189,248,0.32)] sm:text-3xl">
                            Atlas of Sol
                        </h1>
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
                                <div className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-2 py-4 sm:px-3">
                                    <div className="orbit-lane-scrollbar h-[290px] overflow-x-auto overflow-y-hidden pb-1">
                                        {/* Marker centers are locked to one midpoint so all circles share
                                            the same visual orbit horizon, independent of body size. */}
                                        <div className="flex h-full min-w-max items-stretch justify-start gap-4 sm:gap-6">
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
                                                const canInteract = isInteractive && !isTransitioning;
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
                                                            <BodyMarker
                                                                key={
                                                                    shouldFadeInBodies
                                                                        ? `${body.id}-fade-${fadeNonce}`
                                                                        : body.id
                                                                }
                                                                body={body}
                                                                fadeIn={shouldFadeInBodies}
                                                                fadeOut={shouldFadeOutBodies}
                                                                interactive={canInteract}
                                                                onSelect={() => {
                                                                    if (!canInteract) return;
                                                                    handleAnchorChange(body.id);
                                                                }}
                                                                selected={isSelected}
                                                                showNameInside={false}
                                                                variant={variant}
                                                            />
                                                        </div>

                                                        <motion.div
                                                            animate={
                                                                shouldFadeOutBodies
                                                                    ? { opacity: 0 }
                                                                    : { opacity: 1 }
                                                            }
                                                            className="absolute inset-x-0 px-1"
                                                            initial={
                                                                shouldFadeInBodies
                                                                    ? { opacity: 0 }
                                                                    : false
                                                            }
                                                            style={{
                                                                top: `calc(50% + ${Math.round(diameter / 2) + 8}px)`
                                                            }}
                                                            transition={
                                                                shouldFadeInBodies ||
                                                                shouldFadeOutBodies
                                                                    ? {
                                                                          duration:
                                                                              BODY_FADE_DURATION_SECONDS,
                                                                          ease: "easeInOut"
                                                                      }
                                                                    : undefined
                                                            }
                                                        >
                                                            <p className="truncate text-sm font-semibold text-white">
                                                                {body.name}
                                                            </p>
                                                            <p className="text-xs text-slate-300">
                                                                {body.type}
                                                            </p>
                                                        </motion.div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
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
    /** Whether this marker should fade in for a navigation transition. */
    fadeIn?: boolean;
    /** Whether this marker should fade out for a navigation transition. */
    fadeOut?: boolean;
};

type MarkerKind = "orb" | "annulus";
type RegionSpeck = {
    left: string;
    top: string;
    size: number;
    opacity: number;
    twinkle?: boolean;
    delay: number;
};

const REGION_BAND_SPECKS: RegionSpeck[] = [
    { left: "21%", top: "47%", size: 2.4, opacity: 0.48, twinkle: true, delay: 0 },
    { left: "28%", top: "34%", size: 2, opacity: 0.42, delay: 0.12 },
    { left: "34%", top: "24%", size: 2.6, opacity: 0.56, twinkle: true, delay: 0.24 },
    { left: "48%", top: "19%", size: 2.2, opacity: 0.45, delay: 0.3 },
    { left: "61%", top: "24%", size: 2.8, opacity: 0.58, twinkle: true, delay: 0.42 },
    { left: "72%", top: "34%", size: 2.1, opacity: 0.44, delay: 0.52 },
    { left: "78%", top: "47%", size: 2.5, opacity: 0.5, twinkle: true, delay: 0.64 },
    { left: "74%", top: "61%", size: 2.2, opacity: 0.45, delay: 0.74 },
    { left: "64%", top: "72%", size: 2.6, opacity: 0.54, twinkle: true, delay: 0.84 },
    { left: "50%", top: "79%", size: 2, opacity: 0.44, delay: 0.94 },
    { left: "36%", top: "73%", size: 2.3, opacity: 0.47, twinkle: true, delay: 1.04 },
    { left: "26%", top: "61%", size: 2.1, opacity: 0.43, delay: 1.14 }
];

/**
 * Resolves the visual marker family from canonical body type.
 * Regions default to annulus styling; all other body types stay circular orbs.
 *
 * @param {BodyEntity["type"]} bodyType - Canonical body type enum value
 * @returns {MarkerKind} Visual marker kind used by the orbit map
 */
function resolveMarkerKind(bodyType: BodyEntity["type"]): MarkerKind {
    return bodyType === "region" ? "annulus" : "orb";
}

/**
 * Circular 2D map marker used for both center-body and orbiter rendering.
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
    interactive = true,
    fadeIn = false,
    fadeOut = false
}: BodyMarkerProps) {
    const diameter = sizeToPixels(body.size, variant);
    const markerKind = resolveMarkerKind(body.type);
    const isAnnulus = markerKind === "annulus";
    const prefersReducedMotion = useReducedMotion();
    const [regionHovered, setRegionHovered] = useState(false);
    const twinkleActive = isAnnulus && regionHovered && !prefersReducedMotion;
    const baseClass = isAnnulus
        ? "border-slate-300/45 bg-slate-300/10 text-slate-100 shadow-[0_0_35px_rgba(148,163,184,0.24)]"
        : "border-sky-200/50 bg-sky-300/18 text-sky-50 shadow-[0_0_35px_rgba(56,189,248,0.3)]";
    const hoverClass = isAnnulus ? "hover:border-slate-100/75" : "hover:border-sky-200";

    return (
        <motion.button
            aria-label={`${interactive ? "Select" : "Viewing"} ${body.name}`}
            className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border text-[11px] font-semibold tracking-wide transition ${baseClass} ${
                interactive
                    ? `cursor-pointer hover:scale-[1.03] ${hoverClass}`
                    : "cursor-default"
            }`}
            animate={fadeOut ? { opacity: 0 } : { opacity: 1 }}
            initial={fadeIn ? { opacity: 0 } : false}
            onClick={() => {
                if (!interactive || !onSelect) return;
                onSelect();
            }}
            onBlur={() => {
                setRegionHovered(false);
            }}
            onFocus={() => {
                setRegionHovered(true);
            }}
            onHoverEnd={() => {
                setRegionHovered(false);
            }}
            onHoverStart={() => {
                setRegionHovered(true);
            }}
            style={{
                width: diameter,
                height: diameter
            }}
            transition={
                fadeIn || fadeOut
                    ? { duration: 0.24, ease: "easeInOut" }
                    : undefined
            }
            type="button"
        >
            {isAnnulus ? (
                <>
                    {/* Hybrid silhouette: faint boundary ring plus diffuse particulate belt. */}
                    <span className="pointer-events-none absolute inset-[10%] rounded-full border border-slate-200/22" />
                    <span className="pointer-events-none absolute inset-[14%] rounded-full bg-[radial-gradient(circle,transparent_42%,rgba(148,163,184,0.08)_52%,rgba(148,163,184,0.28)_61%,rgba(148,163,184,0.11)_69%,transparent_78%)]" />
                    <span className="pointer-events-none absolute inset-[19%] rounded-full bg-[radial-gradient(circle,transparent_45%,rgba(226,232,240,0.13)_58%,transparent_72%)] blur-[0.5px]" />
                    <span className="pointer-events-none absolute inset-[31%] rounded-full bg-slate-950/72" />
                    {REGION_BAND_SPECKS.map((speck) => (
                        <motion.span
                            className="pointer-events-none absolute rounded-full bg-slate-100"
                            key={`${speck.left}-${speck.top}`}
                            initial={false}
                            animate={
                                twinkleActive && speck.twinkle
                                    ? {
                                          opacity: [speck.opacity, Math.min(1, speck.opacity + 0.22), speck.opacity],
                                          scale: [1, 1.18, 1]
                                      }
                                    : {
                                          opacity: speck.opacity,
                                          scale: 1
                                      }
                            }
                            style={{
                                left: speck.left,
                                top: speck.top,
                                width: speck.size,
                                height: speck.size
                            }}
                            transition={
                                twinkleActive && speck.twinkle
                                    ? {
                                          duration: 1.5,
                                          repeat: Number.POSITIVE_INFINITY,
                                          repeatType: "mirror",
                                          ease: "easeInOut",
                                          delay: speck.delay
                                      }
                                    : {
                                          duration: 0.18,
                                          ease: "easeOut"
                                      }
                            }
                        />
                    ))}
                </>
            ) : (
                <span className="absolute inset-[14%] rounded-full border border-sky-100/35" />
            )}
            {selected ? (
                <span
                    className={`absolute inset-[6%] rounded-full ${isAnnulus ? "border border-slate-100/35" : "border border-sky-100/40"}`}
                />
            ) : null}
            {showNameInside ? (
                <span className="px-2 text-center leading-tight">{body.name}</span>
            ) : null}
        </motion.button>
    );
}
