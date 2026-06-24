import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Loader2 } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { SectorCard } from "./-sectors/sector-card";
import { SectorHeatmap } from "./-sectors/sector-heatmap";
import { avgChange } from "./-sectors/sector-helpers";

export const Route = createFileRoute("/_auth/sectors")({
	component: SectorsRoute,
});

function SectorsRoute() {
	const sectors = useQuery(trpc.sector.getAll.queryOptions());

	if (sectors.isLoading) {
		return (
			<div className="flex min-h-full items-center justify-center bg-[#060e20] py-20">
				<Loader2 className="h-6 w-6 animate-spin text-[#b4c5ff]" />
			</div>
		);
	}

	const data = sectors.data;
	const hasData = data !== undefined && data.sectors.length > 0;
	const ranked = data
		? data.sectors.map((s) => ({ ...s, avg: avgChange(s.leaders) }))
		: [];

	return (
		<div className="min-h-full bg-[#060e20] text-[#eeefff]">
			<div className="mx-auto w-full max-w-5xl px-6 py-8">
				<header className="mb-6 flex items-end justify-between">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">
							Market Pulse
						</h1>
						<p className="mt-1 text-[#8d90a0] text-sm">
							实时板块轮动与热度概览
						</p>
					</div>
					{data?.updatedAt ? (
						<span className="flex items-center gap-1.5 text-[#8d90a0] text-xs">
							<Activity className="h-3.5 w-3.5" />
							更新于 {new Date(data.updatedAt).toLocaleString()}
						</span>
					) : null}
				</header>

				{data?.stale ? (
					<div className="mb-6 rounded-lg border border-[#690005] bg-[#1a0608] px-4 py-3 text-[#ffb4ab] text-sm">
						{hasData
							? "数据可能已过期（最近一次刷新超过 30 分钟或刷新失败），以下为上次结果。"
							: "暂无板块数据，等待首次刷新完成。"}
					</div>
				) : null}

				{hasData ? (
					<>
						<SectorHeatmap ranked={ranked} />

						<section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							{ranked.map((sector) => (
								<SectorCard key={sector.id} sector={sector} />
							))}
						</section>
					</>
				) : null}
			</div>
		</div>
	);
}
