import { createFileRoute } from "@tanstack/react-router";
import { Activity, Loader2 } from "lucide-react";
import { useState } from "react";

import { AlphaRow } from "./-alpha/alpha-row";
import { AlphaTabs } from "./-alpha/alpha-tabs";
import { type Filter, useAlpha } from "./-alpha/use-alpha";

export const Route = createFileRoute("/_auth/alpha")({
	component: AlphaRoute,
});

function AlphaRoute() {
	const [filter, setFilter] = useState<Filter>("all");
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const { alpha, failed, hasData, toggleWatch } = useAlpha(filter);

	const data = alpha.data;

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

				<AlphaTabs filter={filter} onChange={setFilter} />

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
						{data?.projects.map((p) => (
							<AlphaRow
								isExpanded={expandedId === p.id}
								key={p.id}
								onToggleExpand={() =>
									setExpandedId(expandedId === p.id ? null : p.id)
								}
								onToggleWatch={() =>
									toggleWatch.mutate({ alphaProjectId: p.id })
								}
								project={p}
								watchPending={toggleWatch.isPending}
							/>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}
