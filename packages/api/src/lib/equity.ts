export type Granularity = "day" | "week";

export interface OrderPoint {
	closedAt: Date;
	pnl: number;
}

export interface EquityPoint {
	bucketPnl: number;
	cumulativePnl: number;
	ts: Date;
}

export interface StreakResult {
	lossStreak: number;
	profitStreak: number;
}

/**
 * 从最近一笔向前统计「末端连续同号」序列长度。
 * 单笔正负以已实现盈亏判定；0 盈亏中断连续。最近一笔的符号决定哪个 streak 增长，
 * 反向符号或 0 立即中断，另一个 streak 保持 0。
 */
export function detectStreaks(orders: OrderPoint[]): StreakResult {
	const sorted = [...orders].sort(
		(a, b) => b.closedAt.getTime() - a.closedAt.getTime()
	);
	let lossStreak = 0;
	let profitStreak = 0;
	for (const o of sorted) {
		if (o.pnl < 0) {
			if (profitStreak > 0) {
				break;
			}
			lossStreak++;
		} else if (o.pnl > 0) {
			if (lossStreak > 0) {
				break;
			}
			profitStreak++;
		} else {
			break;
		}
	}
	return { lossStreak, profitStreak };
}

/** 将平仓时间归并到桶起点（UTC）：day 取当日 0 点，week 取周一 0 点。 */
function bucketStart(date: Date, granularity: Granularity): Date {
	const dt = new Date(date);
	dt.setUTCHours(0, 0, 0, 0);
	if (granularity === "week") {
		const day = dt.getUTCDay(); // 0=周日
		const diffToMonday = (day + 6) % 7;
		dt.setUTCDate(dt.getUTCDate() - diffToMonday);
	}
	return dt;
}

/**
 * 按平仓时间升序累计已实现盈亏，按粒度聚合到时间桶。
 * 每桶输出区间增量 bucketPnl 与期末累计 cumulativePnl。
 */
export function buildEquityCurve(
	orders: OrderPoint[],
	granularity: Granularity
): EquityPoint[] {
	const buckets = new Map<number, { bucketPnl: number; ts: Date }>();
	for (const o of orders) {
		const bs = bucketStart(o.closedAt, granularity);
		const key = bs.getTime();
		const existing = buckets.get(key) ?? { ts: bs, bucketPnl: 0 };
		existing.bucketPnl += o.pnl;
		buckets.set(key, existing);
	}

	const ordered = [...buckets.values()].sort(
		(a, b) => a.ts.getTime() - b.ts.getTime()
	);
	let cumulative = 0;
	return ordered.map((b) => {
		cumulative += b.bucketPnl;
		return { ts: b.ts, cumulativePnl: cumulative, bucketPnl: b.bucketPnl };
	});
}
