"use client";

/**
 * BodyMarker component module.
 *
 * Purpose:
 * - Render circular 2D orbit-map markers for both center (anchor) and orbiter roles
 * - Encapsulate all marker visual variants: standard orb and asteroid-belt annulus
 * - Isolate animation state and hover logic from the map shell
 */
import { useState } from "react";

import { motion, useReducedMotion } from "motion/react";

import type { BodyEntity } from "@/lib/content/schema";

import { sizeToPixels } from "./atlas-map-utils";

/** Props for the BodyMarker orbit-map marker component. */
export type BodyMarkerProps = {
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

/**
 * Fixed speck positions forming the asteroid-belt ring for region markers.
 * Each speck is placed along a circular arc at roughly equal angular intervals.
 * Specks marked `twinkle: true` animate on hover to suggest particulate motion.
 */
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
export function BodyMarker({
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
                interactive ? `cursor-pointer hover:scale-[1.03] ${hoverClass}` : "cursor-default"
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
            transition={fadeIn || fadeOut ? { duration: 0.24, ease: "easeInOut" } : undefined}
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
                                          opacity: [
                                              speck.opacity,
                                              Math.min(1, speck.opacity + 0.22),
                                              speck.opacity
                                          ],
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
