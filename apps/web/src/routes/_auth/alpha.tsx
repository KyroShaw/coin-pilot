import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, ChevronDown, Loader2, Star } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/alpha")({
	component: AlphaRoute,
});

type Filter = "all" | "consolidating" | "watched";

interface TabDef {
	key: Filter;
	label: string;
}

const TABS: TabDef[] = [
	{ key: "all", label: "全部" },
	{ key: "consolidating", label: "底部盘整" },
	{ key: "watched", label: "定投关注" },
];

const MED_VOLATILITY = 5;
const HIGH_VOLATILITY = 10;

function changeColor(value: number): string {
	if (value > 0) {
		return "text-[#6ffbbe]";
	}
	if (value < 0) {
		return "text-[#ffb4ab]";
	}
	return "text-[#8d90a0]";
}

function formatChange(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}%`;
}

function volatilityLabel(value: number): string {
	if (value >= HIGH_VOLATILITY) {
		return "高";
	}
	if (value >= MED_VOLATILITY) {
		return "中";
	}
	return "低";
}

function volatilityColor(value: number): string {
	if (value >= HIGH_VOLATILITY) {
		return "text-[#ffb4ab]";
	}
	if (value >= MED_VOLATILITY) {
		return "text-[#dae2fd]";
	}
	return "text-[#6ffbbe]";
}

function AlphaRoute() {
	const [filter, setFilter] = useState<Filter>("all");
	const [expandedId, setExpandedId] = useState<string | null>(null);

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

	return (
		<div className="min-h-full bg-[#060e20] text-[#eeefff]">
			<div className="mx-auto w-full max-w-4xl px-6 py-8">
				<header className="mb-4 flex items-end justify-between">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">
							Binance Alpha
						</h1>
						<p className="mt-1 text-[#8d90a0] text-sm">
							底部盘整候选 · 辅助定投决策
						</p>
					</div>
					{data?.updatedAt ? (
						<span className="flex items-center gap-1.5 text-[#8d90a0] text-xs">
							<Activity className="h-3.5 w-3.5" />
							更新于 {new Date(data.updatedAt).toLocaleString()}
						</span>
					) : null}
				</header>

				{failed ? (
					<div className="mb-4 rounded-lg border border-[#690005] bg-[#1a0608] px-4 py-3 text-[#ffb4ab] text-sm">
						最近一次抓取失败，以下为上次成功的数据。
					</div>
				) : null}

				<div className="mb-4 flex gap-1 border-[#1e293b] border-b">
					{TABS.map((t) => (
						<button
							className={
								t.key === filter
									? "-mb-px border-[#2563eb] border-b-2 px-3 py-2 font-medium text-[#dae2fd] text-sm"
									: "-mb-px border-transparent border-b-2 px-3 py-2 font-medium text-[#8d90a0] text-sm hover:text-[#c3c6d7]"
							}
							key={t.key}
							onClick={() => setFilter(t.key)}
							type="button"
						>
							{t.label}
						</button>
					))}
				</div>

				{alpha.isPending ? (
					<div className="flex justify-center py-16">
						<Loader2 className="h-6 w-6 animate-spin text-[#b4c5ff]" />
					</div>
				) : null}

				{alpha.isPending || hasData ? null : (
					<p className="py-16 text-center text-[#8d90a0] text-sm">
						暂无数据，等待首次抓取完成。
					</p>
				)}

				{hasData ? (
					<div className="overflow-hidden rounded-xl border border-[#1e293b]">
						<div className="grid grid-cols-[1.4fr_1fr_0.9fr_0.9fr_0.8fr_auto] gap-2 border-[#1e293b] border-b bg-[#0b1326] px-4 py-2 text-[#8d90a0] text-[10px] uppercase tracking-wider">
							<span>项目</span>
							<span className="text-right">价格</span>
							<span className="text-right">7D</span>
							<span className="text-right">30D</span>
							<span className="text-right">波动</span>
							<span className="text-right">操作</span>
						</div>
						{data.projects.map((p) => (
							<div
								className={
									p.isConsolidating
										? "border-[#1e293b] border-l-2 border-l-[#6ffbbe] bg-[#0b1326]"
										: "border-[#1e293b] bg-[#060e20]"
								}
								key={p.id}
							>
								<div className="grid grid-cols-[1.4fr_1fr_0.9fr_0.9fr_0.8fr_auto] items-center gap-2 border-[#131b2e] border-b px-4 py-3 text-sm">
									<span className="flex items-center gap-2">
										<span className="font-medium text-[#eeefff]">{p.name}</span>
										{p.isConsolidating ? (
											<span className="rounded-full bg-[#00311f] px-2 py-0.5 text-[#6ffbbe] text-[10px]">
												底部盘整
											</span>
										) : null}
									</span>
									<span className="text-right text-[#c3c6d7] tabular-nums">
										{p.price.toLocaleString()}
									</span>
									<span
										className={`text-right tabular-nums ${changeColor(p.change7d)}`}
									>
										{formatChange(p.change7d)}
									</span>
									<span
										className={`text-right tabular-nums ${changeColor(p.change30d)}`}
									>
										{formatChange(p.change30d)}
									</span>
									<span
										className={`text-right text-xs ${volatilityColor(p.consolidationSnapshot.volatility7d)}`}
									>
										{volatilityLabel(p.consolidationSnapshot.volatility7d)}
									</span>
									<span className="flex items-center justify-end gap-1">
										<button
											className="rounded-md border border-[#283044] px-2 py-1 text-[#8d90a0] text-xs hover:text-[#dae2fd]"
											onClick={() =>
												setExpandedId(expandedId === p.id ? null : p.id)
											}
											type="button"
										>
											<ChevronDown className="h-3 w-3" />
										</button>
										<button
											aria-label="定投关注"
											className="rounded-md border border-[#283044] p-1 hover:border-[#2563eb] disabled:opacity-50"
											disabled={toggleWatch.isPending}
											onClick={() =>
												toggleWatch.mutate({ alphaProjectId: p.id })
											}
											type="button"
										>
											<Star
												className={
													p.isWatched
														? "h-3.5 w-3.5 fill-[#f5c451] text-[#f5c451]"
														: "h-3.5 w-3.5 text-[#8d90a0]"
												}
											/>
										</button>
									</span>
								</div>

								{expandedId === p.id ? (
									<div className="grid grid-cols-2 gap-2 bg-[#0b1326] px-4 py-3 text-xs sm:grid-cols-4">
										<div>
											<p className="text-[#8d90a0]">30 日跌幅</p>
											<p className="text-[#eeefff]">
												{p.consolidationSnapshot.change30d.toFixed(2)}%
											</p>
										</div>
										<div>
											<p className="text-[#8d90a0]">近 7 日波动</p>
											<p className="text-[#eeefff]">
												{p.consolidationSnapshot.volatility7d.toFixed(2)}%
											</p>
										</div>
										<div>
											<p className="text-[#8d90a0]">阈值</p>
											<p className="text-[#eeefff]">
												跌幅&gt;{p.consolidationSnapshot.thresholds.drop30d}% 且
												波动&lt;
												{p.consolidationSnapshot.thresholds.volatility7d}%
											</p>
										</div>
										<div>
											<p className="text-[#8d90a0]">计算时间</p>
											<p className="text-[#eeefff]">
												{new Date(
													p.consolidationSnapshot.computedAt
												).toLocaleString()}
											</p>
										</div>
									</div>
								) : null}
							</div>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}
