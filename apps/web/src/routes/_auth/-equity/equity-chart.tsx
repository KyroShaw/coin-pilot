import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@coin-pilot/ui/components/card";
import { Loader2 } from "lucide-react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type Granularity = "day" | "week";
type Preset = "7d" | "30d" | "90d" | "all";

const PRESETS: Preset[] = ["7d", "30d", "90d", "all"];

function lineColor(points: { cumulativePnl: number }[]): string {
	const last = points.at(-1);
	if (!last) {
		return "#8d90a0";
	}
	return last.cumulativePnl >= 0 ? "#6ffbbe" : "#ffb4ab";
}

interface ChartDatum {
	date: string;
	pnl: number;
}

interface EquityChartProps {
	chartData: ChartDatum[];
	granularity: Granularity;
	isPending: boolean;
	points: { cumulativePnl: number }[];
	preset: Preset;
	setGranularity: (value: Granularity) => void;
	setPreset: (value: Preset) => void;
}

export function EquityChart({
	chartData,
	granularity,
	isPending,
	points,
	preset,
	setGranularity,
	setPreset,
}: EquityChartProps) {
	return (
		<Card className="mb-4 border-[#1e293b] bg-[#0b1326]">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-[#eeefff] text-base">盈亏曲线</CardTitle>
				<div className="flex items-center gap-2">
					<div className="flex rounded-md border border-[#283044]">
						<button
							className={
								granularity === "day"
									? "px-2 py-1 text-[#dae2fd] text-xs"
									: "px-2 py-1 text-[#8d90a0] text-xs"
							}
							onClick={() => setGranularity("day")}
							type="button"
						>
							按天
						</button>
						<button
							className={
								granularity === "week"
									? "px-2 py-1 text-[#dae2fd] text-xs"
									: "px-2 py-1 text-[#8d90a0] text-xs"
							}
							onClick={() => setGranularity("week")}
							type="button"
						>
							按周
						</button>
					</div>
					<div className="flex gap-1">
						{PRESETS.map((p) => (
							<button
								className={
									preset === p
										? "rounded px-2 py-1 text-[#dae2fd] text-xs"
										: "rounded px-2 py-1 text-[#8d90a0] text-xs"
								}
								key={p}
								onClick={() => setPreset(p)}
								type="button"
							>
								{p}
							</button>
						))}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{isPending ? (
					<div className="flex h-[260px] items-center justify-center">
						<Loader2 className="h-6 w-6 animate-spin text-[#b4c5ff]" />
					</div>
				) : null}
				{isPending || chartData.length > 0 ? null : (
					<p className="py-16 text-center text-[#8d90a0] text-sm">
						暂无订单数据，请先在「订单复盘」页同步。
					</p>
				)}
				{chartData.length > 0 ? (
					<ResponsiveContainer height={260} width="100%">
						<LineChart data={chartData}>
							<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
							<XAxis dataKey="date" stroke="#8d90a0" tick={{ fontSize: 11 }} />
							<YAxis stroke="#8d90a0" tick={{ fontSize: 11 }} width={48} />
							<Tooltip
								contentStyle={{
									backgroundColor: "#0b1326",
									border: "1px solid #1e293b",
									color: "#eeefff",
								}}
							/>
							<Line
								dataKey="pnl"
								dot={false}
								stroke={lineColor(points)}
								strokeWidth={2}
								type="monotone"
							/>
						</LineChart>
					</ResponsiveContainer>
				) : null}
			</CardContent>
		</Card>
	);
}
