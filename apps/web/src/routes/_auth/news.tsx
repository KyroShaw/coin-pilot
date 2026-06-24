import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/news")({
	component: NewsRoute,
});

type TagFilter = "all" | "macro" | "market" | "regulation";

interface TabDef {
	key: TagFilter;
	label: string;
}

const TABS: TabDef[] = [
	{ key: "all", label: "全部" },
	{ key: "macro", label: "宏观" },
	{ key: "regulation", label: "监管" },
	{ key: "market", label: "市场" },
];

const TAG_LABELS: Record<string, string> = {
	macro: "宏观",
	market: "市场",
	regulation: "监管",
};

function tabClass(active: boolean): string {
	if (active) {
		return "border-[#2563eb] bg-[#0b1326] text-[#dae2fd]";
	}
	return "border-transparent text-[#8d90a0] hover:text-[#c3c6d7]";
}

function NewsRoute() {
	const [tag, setTag] = useState<TagFilter>("all");

	const news = useInfiniteQuery(
		trpc.news.list.infiniteQueryOptions(
			{ tag: tag === "all" ? undefined : tag },
			{ getNextPageParam: (lastPage) => lastPage.nextCursor }
		)
	);

	const items = news.data?.pages.flatMap((page) => page.items) ?? [];
	const updatedAt = news.data?.pages[0]?.updatedAt ?? null;
	const hasItems = items.length > 0;

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

				<div className="mb-5 flex gap-1 border-[#1e293b] border-b">
					{TABS.map((t) => (
						<button
							className={`-mb-px border-b-2 px-3 py-2 font-medium text-sm transition-colors ${tabClass(t.key === tag)}`}
							key={t.key}
							onClick={() => setTag(t.key)}
							type="button"
						>
							{t.label}
						</button>
					))}
				</div>

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
							<article className="rounded-xl border border-[#1e293b] bg-[#0b1326] p-4">
								<div className="mb-1 flex items-center gap-2 text-[#8d90a0] text-xs">
									<span className="font-medium text-[#b4c5ff]">
										{item.source}
									</span>
									<span>·</span>
									<span>{new Date(item.publishedAt).toLocaleString()}</span>
								</div>
								<a
									className="font-medium text-[#eeefff] leading-snug hover:text-[#dae2fd]"
									href={item.url}
									rel="noopener"
									target="_blank"
								>
									{item.title}
									<ExternalLink className="ml-1 inline h-3 w-3 align-baseline text-[#8d90a0]" />
								</a>
								<p className="mt-2 text-[#c3c6d7] text-sm">
									{item.aiSummary ?? (
										<span className="text-[#8d90a0] italic">摘要生成中…</span>
									)}
								</p>
								<div className="mt-3 flex flex-wrap gap-1.5">
									{item.tags.map((tagName) => (
										<span
											className="rounded-full border border-[#283044] bg-[#131b2e] px-2 py-0.5 text-[#8d90a0] text-[10px]"
											key={tagName}
										>
											{TAG_LABELS[tagName] ?? tagName}
										</span>
									))}
								</div>
							</article>
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
