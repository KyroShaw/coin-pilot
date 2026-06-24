import { describe, expect, it } from "vitest";

import { computeVolatility7d, evaluateConsolidation } from "./alpha-rules";

const AT = "2026-06-24T00:00:00.000Z";

describe("computeVolatility7d", () => {
	it("按 (max-min)/min 计算波动率百分比", () => {
		expect(computeVolatility7d([100, 110, 105])).toBeCloseTo(10);
	});

	it("空序列或单点返回 0", () => {
		expect(computeVolatility7d([])).toBe(0);
		expect(computeVolatility7d([100])).toBe(0);
	});

	it("过滤非法价格", () => {
		expect(computeVolatility7d([0, -5, 100, 120])).toBeCloseTo(20);
	});
});

describe("evaluateConsolidation 临界值", () => {
	it("跌幅与波动均满足 → 盘整", () => {
		const r = evaluateConsolidation(-35, 8, AT);
		expect(r.isConsolidating).toBe(true);
		expect(r.snapshot.thresholds.drop30d).toBe(30);
		expect(r.snapshot.thresholds.volatility7d).toBe(10);
	});

	it("跌幅恰为 -30%（不严格小于）→ 不盘整", () => {
		expect(evaluateConsolidation(-30, 5, AT).isConsolidating).toBe(false);
	});

	it("波动恰为 10%（不严格小于）→ 不盘整", () => {
		expect(evaluateConsolidation(-40, 10, AT).isConsolidating).toBe(false);
	});

	it("跌幅不足 → 不盘整", () => {
		expect(evaluateConsolidation(-20, 3, AT).isConsolidating).toBe(false);
	});

	it("临界内侧（-30.1% / 9.99%）→ 盘整", () => {
		expect(evaluateConsolidation(-30.1, 9.99, AT).isConsolidating).toBe(true);
	});
});
