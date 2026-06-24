import { describe, expect, it } from "vitest";

import { buildEquityCurve, detectStreaks, type OrderPoint } from "./equity";

function order(pnl: number, iso: string): OrderPoint {
	return { pnl, closedAt: new Date(iso) };
}

describe("detectStreaks", () => {
	it("末端连续亏损计为 lossStreak，profitStreak 为 0", () => {
		const orders = [
			order(50, "2026-06-01T00:00:00Z"),
			order(-10, "2026-06-02T00:00:00Z"),
			order(-20, "2026-06-03T00:00:00Z"),
			order(-30, "2026-06-04T00:00:00Z"),
		];
		expect(detectStreaks(orders)).toEqual({ lossStreak: 3, profitStreak: 0 });
	});

	it("末端连续盈利计为 profitStreak", () => {
		const orders = [
			order(-5, "2026-06-01T00:00:00Z"),
			order(10, "2026-06-02T00:00:00Z"),
			order(20, "2026-06-03T00:00:00Z"),
		];
		expect(detectStreaks(orders)).toEqual({ lossStreak: 0, profitStreak: 2 });
	});

	it("0 盈亏中断连续", () => {
		const orders = [
			order(-10, "2026-06-01T00:00:00Z"),
			order(0, "2026-06-02T00:00:00Z"),
			order(-30, "2026-06-03T00:00:00Z"),
		];
		expect(detectStreaks(orders)).toEqual({ lossStreak: 1, profitStreak: 0 });
	});

	it("空数组返回全 0", () => {
		expect(detectStreaks([])).toEqual({ lossStreak: 0, profitStreak: 0 });
	});
});

describe("buildEquityCurve", () => {
	it("按天聚合并累计盈亏", () => {
		const orders = [
			order(100, "2026-06-01T03:00:00Z"),
			order(-40, "2026-06-01T10:00:00Z"),
			order(60, "2026-06-02T05:00:00Z"),
		];
		const points = buildEquityCurve(orders, "day");
		expect(points).toHaveLength(2);
		expect(points[0]?.bucketPnl).toBeCloseTo(60);
		expect(points[0]?.cumulativePnl).toBeCloseTo(60);
		expect(points[1]?.bucketPnl).toBeCloseTo(60);
		expect(points[1]?.cumulativePnl).toBeCloseTo(120);
	});

	it("按周聚合归并到同一周", () => {
		const orders = [
			order(30, "2026-06-01T00:00:00Z"), // 周一
			order(20, "2026-06-03T00:00:00Z"), // 同周三
		];
		const points = buildEquityCurve(orders, "week");
		expect(points).toHaveLength(1);
		expect(points[0]?.cumulativePnl).toBeCloseTo(50);
	});
});
