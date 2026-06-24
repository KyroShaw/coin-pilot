import { ChevronDown, Star } from "lucide-react";

import type { RouterOutputs } from "@/utils/trpc";

import { formatSignedPercent, trendColor } from "../-shared/format";
import { volatilityColor, volatilityLabel } from "./volatility";

type AlphaProject = RouterOutputs["alpha"]["list"]["projects"][number];

interface AlphaRowProps {
	isExpanded: boolean;
	onToggleExpand: () => void;
	onToggleWatch: () => void;
	project: AlphaProject;
	watchPending: boolean;
}

export function AlphaRow({
	isExpanded,
	onToggleExpand,
	onToggleWatch,
	project,
	watchPending,
}: AlphaRowProps) {
	const p = project;

	return (
		<div
			className={
				p.isConsolidating
					? "border-[#1e293b] border-l-2 border-l-[#6ffbbe] bg-[#0b1326]"
					: "border-[#1e293b] bg-[#060e20]"
			}
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
				<span className={`text-right tabular-nums ${trendColor(p.change7d)}`}>
					{formatSignedPercent(p.change7d)}
				</span>
				<span className={`text-right tabular-nums ${trendColor(p.change30d)}`}>
					{formatSignedPercent(p.change30d)}
				</span>
				<span
					className={`text-right text-xs ${volatilityColor(p.consolidationSnapshot.volatility7d)}`}
				>
					{volatilityLabel(p.consolidationSnapshot.volatility7d)}
				</span>
				<span className="flex items-center justify-end gap-1">
					<button
						className="rounded-md border border-[#283044] px-2 py-1 text-[#8d90a0] text-xs hover:text-[#dae2fd]"
						onClick={onToggleExpand}
						type="button"
					>
						<ChevronDown className="h-3 w-3" />
					</button>
					<button
						aria-label="定投关注"
						className="rounded-md border border-[#283044] p-1 hover:border-[#2563eb] disabled:opacity-50"
						disabled={watchPending}
						onClick={onToggleWatch}
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

			{isExpanded ? (
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
							跌幅&gt;{p.consolidationSnapshot.thresholds.drop30d}% 且 波动&lt;
							{p.consolidationSnapshot.thresholds.volatility7d}%
						</p>
					</div>
					<div>
						<p className="text-[#8d90a0]">计算时间</p>
						<p className="text-[#eeefff]">
							{new Date(p.consolidationSnapshot.computedAt).toLocaleString()}
						</p>
					</div>
				</div>
			) : null}
		</div>
	);
}
