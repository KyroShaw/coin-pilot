import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { db } from "@coin-pilot/db";
import {
	sectorLeader,
	sectorRefreshLog,
	sectorSnapshot,
} from "@coin-pilot/db/schema/sector";
import { z } from "zod";

import { type BinanceTicker, fetchUsdtTickers } from "../lib/binance";
import { anthropic, REASONING_MODEL } from "../lib/claude";

const USDT_SUFFIX_RE = /USDT$/;
const MAX_TICKERS_FOR_AI = 120;
const MIN_SECTORS = 5;
const MAX_LEADERS_PER_SECTOR = 3;
const AI_MAX_TOKENS = 4096;

// 结构化输出 schema：保持简单（结构化输出不支持数值/长度约束，范围在代码侧校验）
const sectorClassification = z.object({
	sectors: z.array(
		z.object({
			name: z.string(),
			heatScore: z.number(),
			summary: z.string(),
			memberSymbols: z.array(z.string()),
		})
	),
});

type SectorClassification = z.infer<typeof sectorClassification>;

function buildPrompt(tickers: BinanceTicker[]): string {
	const lines = tickers
		.map(
			(t) =>
				`${t.symbol} 涨跌幅${t.priceChangePercent.toFixed(2)}% 成交额${Math.round(t.quoteVolume)}`
		)
		.join("\n");

	return [
		"你是加密市场分析助手。下面是 Binance USDT 交易对的 24h 行情（按成交额排序）：",
		lines,
		"",
		"请将这些币种归类为当前的热门板块（如 L1 公链、DeFi、Meme、AI、RWA、Layer2 等），",
		`至少 ${MIN_SECTORS} 个板块。每个板块给出：name（板块名）、heatScore（0-100 热度评分，越热越高）、`,
		"summary（一句话中文热度说明）、memberSymbols（归入该板块的交易对，取自上面列表）。",
		"只输出结构化结果。",
	].join("\n");
}

/** 调用 Claude 对行情做板块归类与热度评分（结构化输出 + zod 校验）。 */
async function classifySectors(
	tickers: BinanceTicker[]
): Promise<SectorClassification> {
	const top = [...tickers]
		.sort((a, b) => b.quoteVolume - a.quoteVolume)
		.slice(0, MAX_TICKERS_FOR_AI);

	const response = await anthropic.messages.parse({
		model: REASONING_MODEL,
		max_tokens: AI_MAX_TOKENS,
		thinking: { type: "adaptive" },
		output_config: {
			effort: "medium",
			format: zodOutputFormat(sectorClassification),
		},
		messages: [{ role: "user", content: buildPrompt(top) }],
	});

	const parsed = response.parsed_output;
	if (!parsed || parsed.sectors.length < MIN_SECTORS) {
		throw new Error("AI 板块归类结果不足，跳过本次刷新");
	}
	return parsed;
}

interface LeaderRow {
	changePercent24h: number;
	name: string;
	price: number;
	symbol: string;
}

/** 为板块成分币种匹配最新行情并选出龙头（按成交额，至少 1 个）。 */
function selectLeaders(
	memberSymbols: string[],
	tickerMap: Map<string, BinanceTicker>
): LeaderRow[] {
	const matched = memberSymbols
		.map((symbol) => tickerMap.get(symbol))
		.filter((t): t is BinanceTicker => t !== undefined)
		.sort((a, b) => b.quoteVolume - a.quoteVolume)
		.slice(0, MAX_LEADERS_PER_SECTOR);

	return matched.map((t) => ({
		symbol: t.symbol,
		name: t.symbol.replace(USDT_SUFFIX_RE, ""),
		price: t.lastPrice,
		changePercent24h: t.priceChangePercent,
	}));
}

/**
 * 刷新作业：采集行情 → AI 归类 → 龙头匹配 → 统一 snapshotId 落库。
 * 失败时记录日志并保留上一成功快照（不删除旧数据），向上抛错由调用方处理。
 */
export async function runSectorRefresh(): Promise<{ snapshotId: string }> {
	try {
		const tickers = await fetchUsdtTickers();
		const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));
		const classification = await classifySectors(tickers);

		// 仅保留至少有 1 个有效龙头的板块，按热度降序排名
		const ranked = classification.sectors
			.map((s) => ({
				...s,
				leaders: selectLeaders(s.memberSymbols, tickerMap),
			}))
			.filter((s) => s.leaders.length > 0)
			.sort((a, b) => b.heatScore - a.heatScore);

		if (ranked.length < MIN_SECTORS) {
			throw new Error("有效板块（含龙头）不足 5 个，跳过本次刷新");
		}

		const snapshotId = crypto.randomUUID();

		await db.transaction(async (tx) => {
			for (let i = 0; i < ranked.length; i++) {
				const sector = ranked[i];
				if (!sector) {
					continue;
				}
				const [snapshot] = await tx
					.insert(sectorSnapshot)
					.values({
						snapshotId,
						name: sector.name,
						rank: i + 1,
						heatScore: sector.heatScore,
						summary: sector.summary,
					})
					.returning({ id: sectorSnapshot.id });

				if (!snapshot) {
					continue;
				}

				await tx.insert(sectorLeader).values(
					sector.leaders.map((leader) => ({
						sectorSnapshotId: snapshot.id,
						symbol: leader.symbol,
						name: leader.name,
						price: leader.price,
						changePercent24h: leader.changePercent24h,
					}))
				);
			}

			await tx.insert(sectorRefreshLog).values({
				snapshotId,
				status: "success",
				source: "job",
			});
		});

		return { snapshotId };
	} catch (error) {
		const message = error instanceof Error ? error.message : "未知错误";
		await db.insert(sectorRefreshLog).values({
			status: "failed",
			source: "job",
			message,
		});
		throw error;
	}
}
