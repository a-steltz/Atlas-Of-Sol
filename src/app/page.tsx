import { getContentIndex } from "@/lib/content/get-content-index";
import type { BodyEntity } from "@/lib/content/schema";

export const dynamic = "error";

type SourceItem = NonNullable<BodyEntity["sources"]>[number];
type NumberFormatter = Intl.NumberFormat;

const physicalRows: Array<{ key: keyof NonNullable<BodyEntity["physical"]>; label: string }> = [
    { key: "meanRadiusKm", label: "Mean radius (km)" },
    { key: "massKg", label: "Mass (kg)" },
    { key: "densityKgM3", label: "Density (kg/m^3)" },
    { key: "surfaceGravityMS2", label: "Surface gravity (m/s^2)" },
    { key: "escapeVelocityMS", label: "Escape velocity (m/s)" }
];

const orbitRows: Array<{ key: keyof NonNullable<BodyEntity["orbit"]>; label: string }> = [
    { key: "semiMajorAxisKm", label: "Semi-major axis (km)" },
    { key: "orbitalPeriodDays", label: "Orbital period (days)" },
    { key: "eccentricity", label: "Eccentricity" },
    { key: "inclinationDeg", label: "Inclination (deg)" },
    { key: "rotationPeriodHours", label: "Rotation period (hours)" },
    { key: "retrogradeRotation", label: "Retrograde rotation" },
    { key: "tidallyLocked", label: "Tidally locked" }
];

const numberFormatter: NumberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6
});

/**
 * Converts source URL text to a safe href, supporting markdown-link and plain URL forms.
 *
 * @param {string | undefined} rawUrl - Raw source URL value from content payload
 * @returns {string | null} Validated absolute URL or `null` when unavailable/invalid
 */
function normalizeSourceUrl(rawUrl: string | undefined): string | null {
    if (!rawUrl) return null;

    const trimmed = rawUrl.trim();
    const markdownLinkMatch = trimmed.match(/^\[[^\]]+\]\(([^)]+)\)$/);
    const candidate = markdownLinkMatch ? markdownLinkMatch[1].trim() : trimmed;

    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

/**
 * Formats numeric and boolean values for compact data table presentation.
 *
 * @param {number | boolean} value - Primitive value from scientific table fields
 * @returns {string} Human-readable display text
 */
function formatTableValue(value: number | boolean): string {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value === 0) return "0";

    const magnitude = Math.abs(value);
    if (magnitude >= 1_000_000 || magnitude < 0.001) {
        return value.toExponential(3);
    }

    return numberFormatter.format(value);
}

/**
 * Renders an optional string-list section when content exists.
 *
 * @param {string} title - Section heading
 * @param {string[] | undefined} items - Optional string list payload
 * @returns {JSX.Element | null} Rendered list section or `null`
 */
function renderStringListSection(title: string, items: string[] | undefined) {
    if (!items || items.length === 0) return null;

    return (
        <section className="space-y-2">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
                {title}
            </h3>
            <ul className="ml-5 list-disc space-y-1 text-sm">
                {items.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </section>
    );
}

/**
 * Renders body sources when available, including optional URL and metadata.
 *
 * @param {SourceItem[] | undefined} sources - Optional source records
 * @returns {JSX.Element | null} Rendered sources block or `null`
 */
function renderSourcesSection(sources: SourceItem[] | undefined) {
    if (!sources || sources.length === 0) return null;

    return (
        <section className="space-y-2">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
                Sources
            </h3>
            <ol className="ml-5 list-decimal space-y-2 text-sm">
                {sources.map((source, index) => {
                    const url = normalizeSourceUrl(source.url);
                    const details = [source.publisher, source.year?.toString()]
                        .filter(Boolean)
                        .join(" • ");

                    return (
                        <li key={`${source.attribution}-${source.title}-${index}`}>
                            <p>
                                <strong>{source.attribution}</strong>: {source.title}
                            </p>
                            {details ? (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400">{details}</p>
                            ) : null}
                            {url ? (
                                <a
                                    className="text-xs text-blue-600 underline dark:text-blue-400"
                                    href={url}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    {url}
                                </a>
                            ) : null}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

/**
 * Renders a compact key/value scientific table from a row configuration.
 *
 * @param {string} title - Table title
 * @param {Record<string, number | boolean | undefined> | undefined} data - Section payload
 * @param {Array<{ key: string; label: string }>} rows - Ordered row metadata
 * @returns {JSX.Element | null} Rendered table or `null`
 */
function renderDataTable(
    title: string,
    data: Record<string, number | boolean | undefined> | undefined,
    rows: Array<{ key: string; label: string }>
) {
    if (!data) return null;

    const presentRows = rows
        .map((row) => ({
            label: row.label,
            value: data[row.key]
        }))
        .filter((row) => row.value !== undefined);

    if (presentRows.length === 0) return null;

    return (
        <section className="space-y-2">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
                {title}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
                <table className="min-w-full text-sm">
                    <tbody>
                        {presentRows.map((row) => (
                            <tr
                                key={row.label}
                                className="border-b border-black/[.06] last:border-b-0 dark:border-white/[.1]"
                            >
                                <th className="w-1/2 px-3 py-2 text-left font-medium">{row.label}</th>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {formatTableValue(row.value as number | boolean)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/**
 * Checks whether a body has any of the POC scientific sections to render.
 *
 * @param {BodyEntity} body - Body payload to inspect
 * @returns {boolean} Whether at least one requested section has content
 */
function hasScientificProfile(body: BodyEntity): boolean {
    return Boolean(
        body.highlights ||
            body.openQuestions ||
            body.howWeKnow ||
            body.scientificSynthesis ||
            body.sources ||
            body.physical ||
            body.orbit
    );
}

/**
 * MVP proof page that verifies static content loading and hierarchy indexing.
 *
 * @returns {Promise<React.ReactNode>} Home page content with collapsible body details
 */
export default async function Home() {
    const contentIndex = await getContentIndex();
    const totalEntities = Object.keys(contentIndex.entitiesById).length;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
                <header className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Atlas of Sol
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Proof-of-concept view showing server-loaded content from{" "}
                        <code>content/</code>.
                    </p>
                </header>

                <section className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
                    <h2 className="text-lg font-medium">Index Counts</h2>
                    <ul className="mt-3 space-y-1 text-sm">
                        <li>
                            Systems: <strong>{contentIndex.systems.length}</strong>
                        </li>
                        <li>
                            Bodies: <strong>{contentIndex.bodies.length}</strong>
                        </li>
                        <li>
                            Missions: <strong>{contentIndex.missions.length}</strong>
                        </li>
                        <li>
                            Total entities: <strong>{totalEntities}</strong>
                        </li>
                    </ul>
                </section>

                <section className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
                    <h2 className="text-lg font-medium">Bodies</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Collapsible proof-of-concept view for body science profile fields.
                    </p>
                    <div className="mt-4 space-y-3">
                        {contentIndex.bodies.map((body) => (
                            <details
                                key={body.id}
                                className="rounded-lg border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.145] dark:bg-zinc-900"
                            >
                                <summary className="cursor-pointer list-none">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-semibold">{body.name}</h3>
                                        <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                            {body.type}
                                        </span>
                                        <code className="text-xs text-zinc-600 dark:text-zinc-400">
                                            {body.id}
                                        </code>
                                    </div>
                                </summary>

                                <div className="mt-4 space-y-5">
                                    <section className="space-y-1">
                                        <h4 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
                                            Hook
                                        </h4>
                                        <p className="text-sm">{body.hook}</p>
                                    </section>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {renderDataTable(
                                            "Physical",
                                            body.physical as
                                                | Record<string, number | boolean | undefined>
                                                | undefined,
                                            physicalRows
                                        )}
                                        {renderDataTable(
                                            "Orbit",
                                            body.orbit as
                                                | Record<string, number | boolean | undefined>
                                                | undefined,
                                            orbitRows
                                        )}
                                    </div>

                                    {renderStringListSection("Highlights", body.highlights)}
                                    {renderStringListSection("How We Know", body.howWeKnow)}
                                    {renderStringListSection("Open Questions", body.openQuestions)}
                                    {renderStringListSection(
                                        "Scientific Synthesis",
                                        body.scientificSynthesis
                                    )}
                                    {renderSourcesSection(body.sources)}

                                    {!hasScientificProfile(body) ? (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            No extended scientific profile yet.
                                        </p>
                                    ) : null}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
