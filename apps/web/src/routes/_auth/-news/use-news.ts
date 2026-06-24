import { useInfiniteQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export type TagFilter = "all" | "macro" | "market" | "regulation";

export function useNews(tag: TagFilter) {
	const news = useInfiniteQuery(
		trpc.news.list.infiniteQueryOptions(
			{ tag: tag === "all" ? undefined : tag },
			{ getNextPageParam: (lastPage) => lastPage.nextCursor }
		)
	);

	const items = news.data?.pages.flatMap((page) => page.items) ?? [];
	const updatedAt = news.data?.pages[0]?.updatedAt ?? null;
	const hasItems = items.length > 0;

	return { hasItems, items, news, updatedAt };
}
