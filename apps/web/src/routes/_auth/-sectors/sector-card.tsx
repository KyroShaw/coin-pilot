import { Flame, TrendingDown, TrendingUp } from "lucide-react";

import { formatSignedPercent, trendColor } from "../-shared/format";
import type { RankedSector } from "./sector-helpers";
import { heatLabel } from "./sector-helpers";

interface SectorCardProps {
	sector: RankedSector;
}

export function SectorCard({ sector }: SectorCardProps) {
	return (
		<article className="rounded-xl border border-[#1e293b] bg-[#0b1326] p-5">
			<div className="mb-3 flex items-start justify-between">
				<div>
					<h3 className="font-semibold text-[#eeefff] text-base">
						{sector.name}
					</h3>
					<p className="mt-1 text-[#8d90a0] text-xs">{sector.summary}</p>
				</div>
				<div className="text-right">
					<div
						className={`flex items-center justify-end gap-1 font-semibold ${trendColor(sector.avg)}`}
					>
						{sector.avg >= 0 ? (
							<TrendingUp className="h-4 w-4" />
						) : (
							<TrendingDown className="h-4 w-4" />
						)}
						{formatSignedPercent(sector.avg)}
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
							<span className="font-medium text-[#dae2fd]">{leader.name}</span>
							<span className="flex items-center gap-3">
								<span className="text-[#c3c6d7] tabular-nums">
									{leader.price.toLocaleString()}
								</span>
								<span
									className={`tabular-nums ${trendColor(leader.changePercent24h)}`}
								>
									{formatSignedPercent(leader.changePercent24h)}
								</span>
							</span>
						</li>
					))}
				</ul>
			</div>
		</article>
	);
}
