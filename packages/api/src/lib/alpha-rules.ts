import type { ConsolidationSnapshot } from "@coin-pilot/db/schema/alpha";

/** 底部盘整阈值（可调）：30 日跌幅 > 30%，近 7 日波动 < 10%。 */
export const CONSOLIDATION_THRESHOLDS = {
	drop30d: 30,
	volatility7d: 10,
} as const;

/**
 * 由近 7 日价格序列计算波动率 (%)：(max - min) / min * 100。
 * 序列为空或 min<=0 时返回 0。
 */
export function computeVolatility7d(prices: number[]): number {
	const valid = prices.filter((p) => Number.isFinite(p) && p > 0);
	if (valid.length === 0) {
		return 0;
	}
	const max = Math.max(...valid);
	const min = Math.min(...valid);
	if (min <= 0) {
		return 0;
	}
	return ((max - min) / min) * 100;
}

export interface ConsolidationResult {
	isConsolidating: boolean;
	snapshot: ConsolidationSnapshot;
}

/**
 * 判定底部盘整：change30d < -drop30d% 且 volatility7d < volatility7d%。
 * computedAt 由调用方传入（便于测试与可复现），输出判断依据快照。
 */
export function evaluateConsolidation(
	change30d: number,
	volatility7d: number,
	computedAt: string
): ConsolidationResult {
	const isConsolidating =
		change30d < -CONSOLIDATION_THRESHOLDS.drop30d &&
		volatility7d < CONSOLIDATION_THRESHOLDS.volatility7d;

	return {
		isConsolidating,
		snapshot: {
			change30d,
			volatility7d,
			thresholds: { ...CONSOLIDATION_THRESHOLDS },
			computedAt,
		},
	};
}
