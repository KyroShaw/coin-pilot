import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

type Granularity = "day" | "week";
type Preset = "7d" | "30d" | "90d" | "all";

export function useEquity() {
	const [granularity, setGranularity] = useState<Granularity>("day");
	const [preset, setPreset] = useState<Preset>("90d");
	const [coaching, setCoaching] = useState<string | null>(null);

	const curve = useQuery(
		trpc.equity.curve.queryOptions({ preset, granularity })
	);
	const status = useQuery(trpc.alert.status.queryOptions());
	const thresholds = useQuery(trpc.settings.getThreshold.queryOptions());

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

	return {
		chartData,
		coaching,
		coachingTip,
		curve,
		granularity,
		loss,
		points,
		preset,
		profit,
		setGranularity,
		setPreset,
		thresholds,
		updateThreshold,
	};
}
