import { getContentIndex } from "@/lib/content/get-content-index";
import type { BodyEntity } from "@/lib/content/schema";

export const dynamic = "error";

type ChildrenByParentId = Record<string, BodyEntity[]>;

/**
 * Renders a nested tree from `childrenByParentId` while guarding against cycles.
 *
 * @param {string} parentId - Parent node id to render children for
 * @param {ChildrenByParentId} childrenByParentId - Child lookup map by parent id
 * @param {Set<string>} lineage - IDs encountered along the current traversal branch
 * @returns {JSX.Element | null} Nested tree markup for the provided parent
 */
function renderHierarchy(
    parentId: string,
    childrenByParentId: ChildrenByParentId,
    lineage: Set<string>
) {
    const children = childrenByParentId[parentId] ?? [];
    if (children.length === 0) return null;

    return (
        <ul className="ml-5 list-disc space-y-2">
            {children.map((child) => {
                const isCycle = lineage.has(child.id);
                const nextLineage = new Set(lineage);
                nextLineage.add(child.id);

                return (
                    <li key={child.id}>
                        <code>{child.id}</code>{" "}
                        <span className="text-zinc-500">({child.type})</span>
                        {isCycle ? (
                            <div className="text-sm text-red-600">Cycle detected at {child.id}</div>
                        ) : (
                            renderHierarchy(child.id, childrenByParentId, nextLineage)
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * MVP proof page that verifies static content loading and hierarchy indexing.
 *
 * @returns {Promise<React.ReactNode>} Home page content with content index diagnostics
 */
export default async function Home() {
    const contentIndex = await getContentIndex();
    const totalEntities = Object.keys(contentIndex.entitiesById).length;
    const rootSystemId = "sol";

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
                    <h2 className="text-lg font-medium">Navigation Hierarchy Preview</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Root: <code>{rootSystemId}</code>
                    </p>
                    <div className="mt-3 text-sm">
                        {renderHierarchy(
                            rootSystemId,
                            contentIndex.childrenByParentId,
                            new Set()
                        ) ?? <p>No child bodies found for the current root.</p>}
                    </div>
                </section>
            </main>
        </div>
    );
}
