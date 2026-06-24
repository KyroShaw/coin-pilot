import { createFileRoute } from "@tanstack/react-router";
import { Activity, Loader2 } from "lucide-react";
import { useState } from "react";

import { NewsArticle } from "./-news/news-article";
import { NewsTabs } from "./-news/news-tabs";
import { type TagFilter, useNews } from "./-news/use-news";

export const Route = createFileRoute("/_auth/news")({
	component: NewsRoute,
});

function NewsRoute() {
	const [tag, setTag] = useState<TagFilter>("all");

	const { hasItems, items, news, updatedAt } = useNews(tag);

	return (
		<div className="min-h-full bg-[#060e20] text-[#eeefff]">
			<div className="mx-auto w-full max-w-2xl px-6 py-8">
				<header className="mb-4 flex items-end justify-between">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">宏观简报</h1>
						<p className="mt-1 text-[#8d90a0] text-sm">
							全球金融与加密市场热点 · AI 影响摘要
						</p>
					</div>
					{updatedAt ? (
						<span className="flex items-center gap-1.5 text-[#8d90a0] text-xs">
							<Activity className="h-3.5 w-3.5" />
							更新于 {new Date(updatedAt).toLocaleString()}
						</span>
					) : null}
				</header>

				<NewsTabs onChange={setTag} tag={tag} />

				{news.isPending ? (
					<div className="flex justify-center py-16">
						<Loader2 className="h-6 w-6 animate-spin text-[#b4c5ff]" />
					</div>
				) : null}

				{news.isPending || hasItems ? null : (
					<p className="py-16 text-center text-[#8d90a0] text-sm">
						暂无消息，等待首次刷新完成。
					</p>
				)}

				<ul className="space-y-3">
					{items.map((item) => (
						<li key={item.id}>
							<NewsArticle item={item} />
						</li>
					))}
				</ul>

				{news.hasNextPage ? (
					<div className="mt-5 flex justify-center">
						<button
							className="rounded-lg border border-[#283044] bg-[#0b1326] px-4 py-2 text-[#dae2fd] text-sm hover:border-[#2563eb] disabled:opacity-50"
							disabled={news.isFetchingNextPage}
							onClick={() => news.fetchNextPage()}
							type="button"
						>
							{news.isFetchingNextPage ? "加载中…" : "加载更多"}
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}
