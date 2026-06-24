import { createFileRoute } from "@tanstack/react-router";

import { EquityChart } from "./-equity/equity-chart";
import {
	LossAlertBanner,
	ProfitAlertBanner,
} from "./-equity/risk-alert-banner";
import { ThresholdForm } from "./-equity/threshold-form";
import { useEquity } from "./-equity/use-equity";

export const Route = createFileRoute("/_auth/equity")({
	component: EquityRoute,
});

function EquityRoute() {
	const {
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
	} = useEquity();

	return (
		<div className="min-h-full bg-[#060e20] text-[#eeefff]">
			<div className="mx-auto w-full max-w-4xl px-6 py-8">
				<h1 className="mb-1 font-semibold text-2xl tracking-tight">资金曲线</h1>
				<p className="mb-4 text-[#8d90a0] text-sm">账户盈亏曲线与风险预警</p>

				{loss?.triggered ? (
					<LossAlertBanner
						isPending={coachingTip.isPending}
						onCoachingTip={() => coachingTip.mutate({ type: "loss" })}
						streak={loss.streak}
						threshold={loss.threshold}
					/>
				) : null}

				{profit?.triggered ? (
					<ProfitAlertBanner
						isPending={coachingTip.isPending}
						onCoachingTip={() => coachingTip.mutate({ type: "profit" })}
						streak={profit.streak}
						threshold={profit.threshold}
					/>
				) : null}

				{coaching ? (
					<div className="mb-4 rounded-lg border border-[#1e293b] bg-[#0b1326] p-4">
						<pre className="whitespace-pre-wrap font-sans text-[#c3c6d7] text-sm leading-relaxed">
							{coaching}
						</pre>
					</div>
				) : null}

				<EquityChart
					chartData={chartData}
					granularity={granularity}
					isPending={curve.isPending}
					points={points}
					preset={preset}
					setGranularity={setGranularity}
					setPreset={setPreset}
				/>

				<ThresholdForm
					isPending={updateThreshold.isPending}
					onSave={(values) => updateThreshold.mutate(values)}
					thresholds={thresholds.data}
				/>
			</div>
		</div>
	);
}
