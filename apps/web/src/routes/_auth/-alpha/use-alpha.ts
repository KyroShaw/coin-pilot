import { useMutation, useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export type Filter = "all" | "consolidating" | "watched";

export function useAlpha(filter: Filter) {
	const alpha = useQuery(
		trpc.alpha.list.queryOptions({
			onlyConsolidating: filter === "consolidating" ? true : undefined,
			onlyWatched: filter === "watched" ? true : undefined,
		})
	);

	const toggleWatch = useMutation(
		trpc.alpha.toggleWatch.mutationOptions({
			onSuccess: () => alpha.refetch(),
		})
	);

	const data = alpha.data;
	const hasData = data !== undefined && data.projects.length > 0;
	const failed = data?.lastScrapeStatus === "failed";

	return { alpha, failed, hasData, toggleWatch };
}
