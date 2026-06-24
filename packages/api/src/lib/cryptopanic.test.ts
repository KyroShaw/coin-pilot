import { beforeAll, describe, expect, it } from "vitest";

// 单测隔离 env 校验（cryptopanic 模块顶层导入 @coin-pilot/env）
beforeAll(() => {
	process.env.SKIP_ENV_VALIDATION = "true";
});

describe("cryptopanic mapTags", () => {
	it("监管关键词归入 regulation + market", async () => {
		const { mapTags } = await import("./cryptopanic");
		const tags = mapTags("SEC files lawsuit against exchange", "CoinDesk");
		expect(tags).toContain("regulation");
		expect(tags).toContain("market");
	});

	it("宏观关键词归入 macro + market", async () => {
		const { mapTags } = await import("./cryptopanic");
		const tags = mapTags(
			"Fed signals interest rate cut amid inflation",
			"Reuters"
		);
		expect(tags).toContain("macro");
		expect(tags).toContain("market");
	});

	it("无关键词仅 market 兜底", async () => {
		const { mapTags } = await import("./cryptopanic");
		expect(mapTags("Bitcoin rallies to new high", "CryptoNews")).toEqual([
			"market",
		]);
	});
});

describe("cryptopanic urlHash", () => {
	it("规范化后相同 url 哈希一致（忽略大小写/尾斜杠/空白）", async () => {
		const { urlHash } = await import("./cryptopanic");
		expect(urlHash("https://A.com/post/ ")).toBe(urlHash("https://a.com/post"));
	});

	it("不同 url 哈希不同", async () => {
		const { urlHash } = await import("./cryptopanic");
		expect(urlHash("https://a.com/1")).not.toBe(urlHash("https://a.com/2"));
	});
});
