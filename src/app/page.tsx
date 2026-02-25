import AtlasMapShell from "@/app/_components/atlas-map-shell";
import { getContentIndex } from "@/lib/content/get-content-index";

export const dynamic = "error";

/**
 * Atlas of Sol home route.
 * Loads validated content on the server and hands the interactive state to the
 * client shell responsible for the sticky map + museum-floor experience.
 *
 * @returns {Promise<React.ReactNode>} Home route content
 */
export default async function Home() {
    const contentIndex = await getContentIndex();

    return (
        <AtlasMapShell
            bodies={contentIndex.bodies}
            childrenByParentId={contentIndex.childrenByParentId}
            systems={contentIndex.systems}
        />
    );
}
