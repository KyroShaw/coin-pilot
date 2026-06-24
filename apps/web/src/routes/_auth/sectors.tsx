import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@coin-pilot/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/sectors")({
	component: SectorsRoute,
});

function changeClass(value: number): string {
	if (value > 0) {
		return "text-green-600";
	}
	if (value < 0) {
		return "text-red-600";
	}
	return "text-muted-foreground";
}

function formatChange(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}%`;
}

function SectorsRoute() {
	const sectors = useQuery(trpc.sector.getAll.queryOptions());

	if (sectors.isLoading) {
		return (
			<div className="flex justify-center py-10">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	const data = sectors.data;
	const hasData = data && data.sectors.length > 0;

	return (
		<div className="mx-auto w-full max-w-3xl py-10">
			<div className="mb-4 flex items-baseline justify-between">
				<h1 className="font-bold text-2xl">板块轮动</h1>
				{data?.updatedAt ? (
					<span className="text-muted-foreground text-sm">
						更新于 {new Date(data.updatedAt).toLocaleString()}
					</span>
				) : null}
			</div>

			{data?.stale ? (
				<div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
					{hasData
						? "数据可能已过期（最近一次刷新超过 30 分钟或刷新失败），以下为上次结果。"
						: "暂无板块数据，等待首次刷新完成。"}
				</div>
			) : null}

			{hasData ? (
				<ul className="space-y-3">
					{data.sectors.map((sector) => (
						<li key={sector.id}>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										<span>
											<span className="text-muted-foreground">
												#{sector.rank}
											</span>{" "}
											{sector.name}
										</span>
										<span className="rounded-full bg-secondary px-2 py-0.5 font-normal text-xs">
											热度 {Math.round(sector.heatScore)}
										</span>
									</CardTitle>
									<p className="text-muted-foreground text-sm">
										{sector.summary}
									</p>
								</CardHeader>
								<CardContent>
									<div className="flex flex-wrap gap-2">
										{sector.leaders.map((leader) => (
											<div
												className="rounded-md border px-3 py-2 text-sm"
												key={leader.symbol}
											>
												<div className="font-medium">{leader.name}</div>
												<div className="flex items-center gap-2">
													<span>{leader.price.toLocaleString()}</span>
													<span
														className={changeClass(leader.changePercent24h)}
													>
														{formatChange(leader.changePercent24h)}
													</span>
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
