import { ExternalLink } from "lucide-react";

import type { RouterOutputs } from "@/utils/trpc";

type NewsItem = RouterOutputs["news"]["list"]["items"][number];

const TAG_LABELS: Record<string, string> = {
	macro: "宏观",
	market: "市场",
	regulation: "监管",
};

interface NewsArticleProps {
	item: NewsItem;
}

export function NewsArticle({ item }: NewsArticleProps) {
	return (
		<article className="rounded-xl border border-[#1e293b] bg-[#0b1326] p-4">
			<div className="mb-1 flex items-center gap-2 text-[#8d90a0] text-xs">
				<span className="font-medium text-[#b4c5ff]">{item.source}</span>
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
	);
}
