import { formatSignedPercent, trendColor } from "../-shared/format";
import type { RankedSector } from "./sector-helpers";
import { tileClass } from "./sector-helpers";

interface SectorHeatmapProps {
	ranked: RankedSector[];
}

export function SectorHeatmap({ ranked }: SectorHeatmapProps) {
	return (
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
							<span className="text-[#8d90a0] text-xs">#{sector.rank}</span>
						</div>
						<div className="mt-4 flex items-end justify-between">
							<span
								className={`font-semibold text-lg ${trendColor(sector.avg)}`}
							>
								{formatSignedPercent(sector.avg)}
							</span>
							<span className="text-[#8d90a0] text-xs">
								热度 {Math.round(sector.heatScore)}
							</span>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
