import { Button } from "@coin-pilot/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@coin-pilot/ui/components/card";
import { Input } from "@coin-pilot/ui/components/input";
import { Label } from "@coin-pilot/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/equity")({
	component: EquityRoute,
});

type Granularity = "day" | "week";
type Preset = "7d" | "30d" | "90d" | "all";

const PRESETS: Preset[] = ["7d", "30d", "90d", "all"];
const MIN_THRESHOLD = 2;
const MAX_THRESHOLD = 10;

function lineColor(points: { cumulativePnl: number }[]): string {
	const last = points.at(-1);
	if (!last) {
		return "#8d90a0";
	}
	return last.cumulativePnl >= 0 ? "#6ffbbe" : "#ffb4ab";
}

function EquityRoute() {
	const [granularity, setGranularity] = useState<Granularity>("day");
	const [preset, setPreset] = useState<Preset>("90d");
	const [coaching, setCoaching] = useState<string | null>(null);
	const [lossInput, setLossInput] = useState(3);
	const [profitInput, setProfitInput] = useState(5);

	const curve = useQuery(
		trpc.equity.curve.queryOptions({ preset, granularity })
	);
	const status = useQuery(trpc.alert.status.queryOptions());
	const thresholds = useQuery(trpc.settings.getThreshold.queryOptions());

	useEffect(() => {
		if (thresholds.data) {
			setLossInput(thresholds.data.lossThreshold);
			setProfitInput(thresholds.data.profitThreshold);
		}
	}, [thresholds.data]);

	const coachingTip = useMutation(
		trpc.alert.coachingTip.mutationOptions({
			onSuccess: (res) => setCoaching(res.text),
			onError: (error) => toast.error(error.message),
		})
	);

	const updateThreshold = useMutation(
		trpc.settings.updateThreshold.mutationOptions({
			onSuccess: () => {
				toast.success("已保存阈值");
				status.refetch();
				thresholds.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const points = curve.data?.points ?? [];
	const chartData = points.map((p) => ({
		date: new Date(p.ts).toLocaleDateString(),
		pnl: Number(p.cumulativePnl.toFixed(2)),
	}));
	const loss = status.data?.loss;
	const profit = status.data?.profit;

	return (
		<div className="min-h-full bg-[#060e20] text-[#eeefff]">
			<div className="mx-auto w-full max-w-4xl px-6 py-8">
				<h1 className="mb-1 font-semibold text-2xl tracking-tight">资金曲线</h1>
				<p className="mb-4 text-[#8d90a0] text-sm">账户盈亏曲线与风险预警</p>

				{loss?.triggered ? (
					<div className="mb-4 rounded-lg border border-[#690005] bg-[#1a0608] px-4 py-3">
						<div className="flex items-center justify-between">
							<span className="flex items-center gap-2 text-[#ffb4ab] text-sm">
								<TrendingDown className="h-4 w-4" />
								连续亏损 {loss.streak} 笔（阈值 {loss.threshold}），已触发预警
							</span>
							<Button
								disabled={coachingTip.isPending}
								onClick={() => coachingTip.mutate({ type: "loss" })}
								size="sm"
								variant="outline"
							>
								{coachingTip.isPending ? "生成中…" : "查看冷静复盘"}
							</Button>
						</div>
					</div>
				) : null}

				{profit?.triggered ? (
					<div className="mb-4 rounded-lg border border-[#005236] bg-[#00311f] px-4 py-3">
						<div className="flex items-center justify-between">
							<span className="flex items-center gap-2 text-[#6ffbbe] text-sm">
								<TrendingUp className="h-4 w-4" />
								连续盈利 {profit.streak} 笔（阈值 {profit.threshold}
								），注意回撤风险
							</span>
							<Button
								disabled={coachingTip.isPending}
								onClick={() => coachingTip.mutate({ type: "profit" })}
								size="sm"
								variant="outline"
							>
								{coachingTip.isPending ? "生成中…" : "查看冷静复盘"}
							</Button>
						</div>
					</div>
				) : null}

				{coaching ? (
					<div className="mb-4 rounded-lg border border-[#1e293b] bg-[#0b1326] p-4">
						<pre className="whitespace-pre-wrap font-sans text-[#c3c6d7] text-sm leading-relaxed">
							{coaching}
						</pre>
					</div>
				) : null}

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
						{curve.isPending ? (
							<div className="flex h-[260px] items-center justify-center">
								<Loader2 className="h-6 w-6 animate-spin text-[#b4c5ff]" />
							</div>
						) : null}
						{curve.isPending || chartData.length > 0 ? null : (
							<p className="py-16 text-center text-[#8d90a0] text-sm">
								暂无订单数据，请先在「订单复盘」页同步。
							</p>
						)}
						{chartData.length > 0 ? (
							<ResponsiveContainer height={260} width="100%">
								<LineChart data={chartData}>
									<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
									<XAxis
										dataKey="date"
										stroke="#8d90a0"
										tick={{ fontSize: 11 }}
									/>
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

				<Card className="border-[#1e293b] bg-[#0b1326]">
					<CardHeader>
						<CardTitle className="text-[#eeefff] text-base">预警阈值</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap items-end gap-4">
							<div className="space-y-1">
								<Label className="text-[#8d90a0] text-xs" htmlFor="loss">
									连续亏损阈值
								</Label>
								<Input
									className="w-24"
									id="loss"
									max={MAX_THRESHOLD}
									min={MIN_THRESHOLD}
									onChange={(e) => setLossInput(Number(e.target.value))}
									step={1}
									type="number"
									value={lossInput}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-[#8d90a0] text-xs" htmlFor="profit">
									连续盈利阈值
								</Label>
								<Input
									className="w-24"
									id="profit"
									max={MAX_THRESHOLD}
									min={MIN_THRESHOLD}
									onChange={(e) => setProfitInput(Number(e.target.value))}
									step={1}
									type="number"
									value={profitInput}
								/>
							</div>
							<Button
								disabled={updateThreshold.isPending}
								onClick={() =>
									updateThreshold.mutate({
										lossThreshold: lossInput,
										profitThreshold: profitInput,
									})
								}
							>
								保存
							</Button>
						</div>
						<p className="mt-2 text-[#8d90a0] text-xs">阈值范围 2–10 笔。</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
