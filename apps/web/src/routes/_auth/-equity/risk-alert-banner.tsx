import { Button } from "@coin-pilot/ui/components/button";
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

interface RiskAlertBannerProps {
	containerClassName: string;
	icon: LucideIcon;
	isPending: boolean;
	message: ReactNode;
	onCoachingTip: () => void;
	textClassName: string;
}

function RiskAlertBanner({
	containerClassName,
	icon: Icon,
	isPending,
	message,
	onCoachingTip,
	textClassName,
}: RiskAlertBannerProps) {
	return (
		<div className={containerClassName}>
			<div className="flex items-center justify-between">
				<span className={textClassName}>
					<Icon className="h-4 w-4" />
					{message}
				</span>
				<Button
					disabled={isPending}
					onClick={onCoachingTip}
					size="sm"
					variant="outline"
				>
					{isPending ? "生成中…" : "查看冷静复盘"}
				</Button>
			</div>
		</div>
	);
}

interface LossAlertBannerProps {
	isPending: boolean;
	onCoachingTip: () => void;
	streak: number;
	threshold: number;
}

export function LossAlertBanner({
	isPending,
	onCoachingTip,
	streak,
	threshold,
}: LossAlertBannerProps) {
	return (
		<RiskAlertBanner
			containerClassName="mb-4 rounded-lg border border-[#690005] bg-[#1a0608] px-4 py-3"
			icon={TrendingDown}
			isPending={isPending}
			message={`连续亏损 ${streak} 笔（阈值 ${threshold}），已触发预警`}
			onCoachingTip={onCoachingTip}
			textClassName="flex items-center gap-2 text-[#ffb4ab] text-sm"
		/>
	);
}

interface ProfitAlertBannerProps {
	isPending: boolean;
	onCoachingTip: () => void;
	streak: number;
	threshold: number;
}

export function ProfitAlertBanner({
	isPending,
	onCoachingTip,
	streak,
	threshold,
}: ProfitAlertBannerProps) {
	return (
		<RiskAlertBanner
			containerClassName="mb-4 rounded-lg border border-[#005236] bg-[#00311f] px-4 py-3"
			icon={TrendingUp}
			isPending={isPending}
			message={`连续盈利 ${streak} 笔（阈值 ${threshold}），注意回撤风险`}
			onCoachingTip={onCoachingTip}
			textClassName="flex items-center gap-2 text-[#6ffbbe] text-sm"
		/>
	);
}
