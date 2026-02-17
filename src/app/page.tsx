/**
 * Initial MVP landing page for Atlas of Sol.
 * Provides project context and the current development starting points.
 *
 * @returns {JSX.Element} Home page content
 */
export default function Home() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-20 sm:py-28">
                <header className="flex flex-col gap-4">
                    <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                        Atlas of Sol
                    </h1>
                    <p className="max-w-2xl text-pretty text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                        A wonder-first interactive solar system experience. Zoom from the Sol system
                        to individual worlds, guided by curated highlights and density modes.
                    </p>
                </header>

                <section className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm dark:border-white/[.145] dark:bg-black">
                        <h2 className="text-lg font-medium">Start Here</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                            Architecture and content rules live in <code>Atlas of Sol.md</code>.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm dark:border-white/[.145] dark:bg-black">
                        <h2 className="text-lg font-medium">Next Step</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                            Build a build-time indexer with schema validation (IDs, nav graph,
                            density thresholds).
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
