import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Activity,
	Flame,
	Loader2,
	TrendingDown,
	TrendingUp,
} from "lucide-react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/sectors")({
	component: SectorsRoute,
});

interface Leader {
	changePercent24h: number;
	name: string;
	price: number;
	symbol: string;
}

const HIGH_HEAT = 70;
const WARM_HEAT = 40;

function avgChange(leaders: Leader[]): number {
	if (leaders.length === 0) {
		return 0;
	}
	const sum = leaders.reduce((acc, l) => acc + l.changePercent24h, 0);
	return sum / leaders.length;
}

function changeColor(value: number): string {
	if (value > 0) {
		return "text-[#6ffbbe]";
	}
	if (value < 0) {
		return "text-[#ffb4ab]";
	}
	return "text-[#8d90a0]";
}

function tileClass(value: number): string {
	if (value > 0) {
		return "border-[#005236] bg-[#00311f]";
	}
	if (value < 0) {
		return "border-[#690005] bg-[#410004]";
	}
	return "border-[#283044] bg-[#131b2e]";
}

function heatLabel(score: number): string {
	if (score >= HIGH_HEAT) {
		return "High Heat";
	}
	if (score >= WARM_HEAT) {
		return "Warm";
	}
	return "Cool";
}

function formatChange(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}%`;
}

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
						<section className="mb-8">
							<h2 className="mb-3 font-medium text-[#c3c6d7] text-sm uppercase tracking-wider">
								Sector Rotation Heatmap (24h)
							</h2>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
								{ranked.map((sector) => (
									<div
										className={`flex flex-col justify-between rounded-lg border p-4 ${tileClass(sector.avg)}`}
										key={sector.id}
									>
										<div className="flex items-start justify-between">
											<span className="font-medium text-[#eeefff] text-sm">
												{sector.name}
											</span>
											<span className="text-[#8d90a0] text-xs">
												#{sector.rank}
											</span>
										</div>
										<div className="mt-4 flex items-end justify-between">
											<span
												className={`font-semibold text-lg ${changeColor(sector.avg)}`}
											>
												{formatChange(sector.avg)}
											</span>
											<span className="text-[#8d90a0] text-xs">
												热度 {Math.round(sector.heatScore)}
											</span>
										</div>
									</div>
								))}
							</div>
						</section>

						<section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
							{ranked.map((sector) => (
								<article
									className="rounded-xl border border-[#1e293b] bg-[#0b1326] p-5"
									key={sector.id}
								>
									<div className="mb-3 flex items-start justify-between">
										<div>
											<h3 className="font-semibold text-[#eeefff] text-base">
												{sector.name}
											</h3>
											<p className="mt-1 text-[#8d90a0] text-xs">
												{sector.summary}
											</p>
										</div>
										<div className="text-right">
											<div
												className={`flex items-center justify-end gap-1 font-semibold ${changeColor(sector.avg)}`}
											>
												{sector.avg >= 0 ? (
													<TrendingUp className="h-4 w-4" />
												) : (
													<TrendingDown className="h-4 w-4" />
												)}
												{formatChange(sector.avg)}
											</div>
											<span className="mt-1 inline-flex items-center gap-1 text-[#8d90a0] text-xs">
												<Flame className="h-3 w-3" />
												{heatLabel(sector.heatScore)}
											</span>
										</div>
									</div>

									<div className="border-[#1e293b] border-t pt-3">
										<p className="mb-2 text-[#8d90a0] text-[10px] uppercase tracking-wider">
											Leading Tokens
										</p>
										<ul className="space-y-1.5">
											{sector.leaders.map((leader) => (
												<li
													className="flex items-center justify-between text-sm"
													key={leader.symbol}
												>
													<span className="font-medium text-[#dae2fd]">
														{leader.name}
													</span>
													<span className="flex items-center gap-3">
														<span className="text-[#c3c6d7] tabular-nums">
															{leader.price.toLocaleString()}
														</span>
														<span
															className={`tabular-nums ${changeColor(leader.changePercent24h)}`}
														>
															{formatChange(leader.changePercent24h)}
														</span>
													</span>
												</li>
											))}
										</ul>
									</div>
								</article>
							))}
						</section>
					</>
				) : null}
			</div>
		</div>
	);
}
