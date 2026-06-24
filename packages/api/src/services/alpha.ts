import { db } from "@coin-pilot/db";
import { alphaProject, alphaScrapeStatus } from "@coin-pilot/db/schema/alpha";

import { computeVolatility7d, evaluateConsolidation } from "../lib/alpha-rules";

// Binance Alpha 无稳定官方 API，端点/结构可能变动；解析层集中以便变更时替换。
// 注意：此 URL/字段需对照线上实际结构核验（见 specs 风险点 A1 / OQ-3）。
const ALPHA_SOURCE_URL =
	"https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list";
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 800;
const USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** 抓取并归一化后的 Alpha 项目（写库前）。 */
export interface AlphaInput {
	change7d: number;
	change30d: number;
	name: string;
	price: number;
	prices7d?: number[];
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function isRetryable(status: number): boolean {
	return status === 429 || status >= 500;
}

interface RawAlphaToken {
	name?: string;
	percentChange7d?: number | string;
	percentChange30d?: number | string;
	price?: number | string;
	symbol?: string;
}

function normalize(raw: RawAlphaToken[]): AlphaInput[] {
	return raw
		.map((t) => ({
			name: t.name ?? t.symbol ?? "",
			price: Number(t.price ?? Number.NaN),
			change7d: Number(t.percentChange7d ?? Number.NaN),
			change30d: Number(t.percentChange30d ?? Number.NaN),
		}))
		.filter(
			(p) =>
				p.name.length > 0 &&
				Number.isFinite(p.price) &&
				Number.isFinite(p.change7d) &&
				Number.isFinite(p.change30d)
		);
}

async function fetchAlphaOnce(): Promise<AlphaInput[]> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(ALPHA_SOURCE_URL, {
			headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
			signal: controller.signal,
		});
		if (!response.ok) {
			const error = new Error(`Alpha 抓取 ${response.status}`);
			(error as Error & { status?: number }).status = response.status;
			throw error;
		}
		const body = (await response.json()) as { data?: RawAlphaToken[] };
		const normalized = normalize(body.data ?? []);
		if (normalized.length === 0) {
			throw new Error("Alpha 抓取结果为空或字段缺失");
		}
		return normalized;
	} finally {
		clearTimeout(timer);
	}
}

/** 抓取 Binance Alpha 项目，对 429/5xx 指数退避重试（最多 3 次）。 */
export async function scrapeAlphaProjects(): Promise<AlphaInput[]> {
	let lastError: unknown;
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			return await fetchAlphaOnce();
		} catch (error) {
			lastError = error;
			const status = (error as Error & { status?: number }).status;
			if (status !== undefined && !isRetryable(status)) {
				throw error;
			}
			if (attempt < MAX_RETRIES - 1) {
				await delay(BASE_BACKOFF_MS * 2 ** attempt);
			}
		}
	}
	throw lastError instanceof Error ? lastError : new Error("Alpha 抓取失败");
}

/**
 * 抓取作业：抓取 → 盘整规则计算 → 按 name upsert（保持 id 稳定、不丢关注）。
 * 失败时记录 failed 状态并保留上次快照，向上抛错由调用方处理。
 * 7 日波动优先用价格序列计算，无序列时回退用 |change7d| 作为近似。
 */
export async function runAlphaScrape(): Promise<{ count: number }> {
	try {
		const inputs = await scrapeAlphaProjects();
		const computedAt = new Date().toISOString();

		await db.transaction(async (tx) => {
			for (const p of inputs) {
				const volatility7d = p.prices7d
					? computeVolatility7d(p.prices7d)
					: Math.abs(p.change7d);
				const { isConsolidating, snapshot } = evaluateConsolidation(
					p.change30d,
					volatility7d,
					computedAt
				);
				await tx
					.insert(alphaProject)
					.values({
						name: p.name,
						price: p.price,
						change7d: p.change7d,
						change30d: p.change30d,
						isConsolidating,
						consolidationSnapshot: snapshot,
					})
					.onConflictDoUpdate({
						target: alphaProject.name,
						set: {
							price: p.price,
							change7d: p.change7d,
							change30d: p.change30d,
							isConsolidating,
							consolidationSnapshot: snapshot,
							updatedAt: new Date(),
						},
					});
			}
			await tx.insert(alphaScrapeStatus).values({ lastStatus: "success" });
		});

		return { count: inputs.length };
	} catch (error) {
		await db.insert(alphaScrapeStatus).values({
			lastStatus: "failed",
			lastError: error instanceof Error ? error.message : "未知错误",
		});
		throw error;
	}
}
