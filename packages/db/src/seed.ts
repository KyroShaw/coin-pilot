import { randomUUID } from "node:crypto";

import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";

// 与 drizzle.config 一致：从 server 的 .env 读取 DATABASE_URL
dotenv.config({ path: "../../apps/server/.env" });

// biome-ignore lint/performance/noNamespaceImport: drizzle 需要完整 schema 命名空间用于关系映射
import * as schema from "./schema";
import {
	newsItem,
	sectorLeader,
	sectorRefreshLog,
	sectorSnapshot,
} from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error("缺少 DATABASE_URL");
}

const db = drizzle(DATABASE_URL, { schema });

const HOUR_MS = 60 * 60 * 1000;

interface SectorDef {
	name: string;
	summary: string;
	symbols: string[];
}

// 板块成分（真实 Binance USDT 交易对；缺失的会在构建龙头时自动跳过）
const SECTORS: SectorDef[] = [
	{
		name: "L1 公链",
		summary: "主流公链整体走强，BTC 主导地位带动板块情绪。",
		symbols: [
			"BTCUSDT",
			"ETHUSDT",
			"SOLUSDT",
			"BNBUSDT",
			"ADAUSDT",
			"AVAXUSDT",
		],
	},
	{
		name: "Layer 2",
		summary: "L2 扩容板块资金活跃，ARB/OP 领涨。",
		symbols: ["ARBUSDT", "OPUSDT", "MATICUSDT", "STRKUSDT"],
	},
	{
		name: "DeFi",
		summary: "DeFi 蓝筹温和反弹，借贷与 DEX 龙头领先。",
		symbols: ["UNIUSDT", "AAVEUSDT", "LINKUSDT", "MKRUSDT", "LDOUSDT"],
	},
	{
		name: "AI & 数据",
		summary: "AI 叙事持续发酵，算力与数据代币热度高。",
		symbols: ["FETUSDT", "RENDERUSDT", "TAOUSDT", "GRTUSDT"],
	},
	{
		name: "Meme",
		summary: "Meme 板块波动剧烈，散户情绪主导。",
		symbols: ["DOGEUSDT", "SHIBUSDT", "PEPEUSDT", "WIFUSDT"],
	},
	{
		name: "RWA",
		summary: "现实世界资产代币化关注度上升。",
		symbols: ["ONDOUSDT", "LINKUSDT", "PENDLEUSDT"],
	},
];

interface NewsDef {
	hoursAgo: number;
	source: string;
	summary: string;
	tags: string[];
	title: string;
	url: string;
}

const NEWS: NewsDef[] = [
	{
		hoursAgo: 1,
		source: "Reuters",
		title: "美联储官员暗示年内或维持高利率以抑制通胀",
		url: "https://www.reuters.com/markets/",
		tags: ["macro", "market"],
		summary: "高利率预期升温，短期或压制风险资产与加密市场流动性。",
	},
	{
		hoursAgo: 2,
		source: "CoinDesk",
		title: "美国 SEC 就某交易所未注册证券业务发起诉讼",
		url: "https://www.coindesk.com/policy/",
		tags: ["regulation", "market"],
		summary: "监管不确定性上升，相关代币与平台币短期承压。",
	},
	{
		hoursAgo: 3,
		source: "Bloomberg",
		title: "现货比特币 ETF 单周净流入创近月新高",
		url: "https://www.bloomberg.com/crypto",
		tags: ["market"],
		summary: "机构资金持续流入，对 BTC 中期价格形成支撑。",
	},
	{
		hoursAgo: 4,
		source: "The Block",
		title: "以太坊主网下一次升级提案进入测试网阶段",
		url: "https://www.theblock.co/",
		tags: ["market"],
		summary: "升级预期利好 ETH 生态，关注 L2 板块联动。",
	},
	{
		hoursAgo: 6,
		source: "Cointelegraph",
		title: "欧盟 MiCA 框架补充细则落地，稳定币发行要求趋严",
		url: "https://cointelegraph.com/tags/regulation",
		tags: ["regulation", "macro"],
		summary: "合规门槛提高，利好头部合规稳定币，中小发行方承压。",
	},
	{
		hoursAgo: 8,
		source: "Reuters",
		title: "美国最新 CPI 数据略低于预期，市场风险偏好回升",
		url: "https://www.reuters.com/markets/us/",
		tags: ["macro", "market"],
		summary: "通胀降温利好风险资产，加密市场情绪短线转暖。",
	},
	{
		hoursAgo: 10,
		source: "CoinDesk",
		title: "某主流公链生态基金宣布新一轮开发者激励计划",
		url: "https://www.coindesk.com/tech/",
		tags: ["market"],
		summary: "生态激励有望提升链上活跃度，利好相关 L1 代币。",
	},
	{
		hoursAgo: 12,
		source: "The Block",
		title: "AI 概念代币板块单日交易量环比显著放大",
		url: "https://www.theblock.co/category/markets",
		tags: ["market"],
		summary: "AI 叙事资金轮动明显，板块短期热度与波动同步上升。",
	},
	{
		hoursAgo: 15,
		source: "Bloomberg",
		title: "香港推进虚拟资产现货 ETF 二级市场扩容",
		url: "https://www.bloomberg.com/asia",
		tags: ["regulation", "market"],
		summary: "亚洲合规通道扩展，利好区域加密资金入场。",
	},
	{
		hoursAgo: 18,
		source: "Cointelegraph",
		title: "稳定币总市值回升至年内高位",
		url: "https://cointelegraph.com/tags/stablecoin",
		tags: ["market", "macro"],
		summary: "稳定币供给扩张通常预示场内购买力增强，中性偏多。",
	},
	{
		hoursAgo: 20,
		source: "Reuters",
		title: "主要经济体央行维持谨慎宽松基调",
		url: "https://www.reuters.com/markets/rates-bonds/",
		tags: ["macro"],
		summary: "宏观流动性边际改善，对加密等风险资产构成温和支撑。",
	},
	{
		hoursAgo: 23,
		source: "The Block",
		title: "某 Layer 2 网络 TVL 创历史新高",
		url: "https://www.theblock.co/category/defi",
		tags: ["market"],
		summary: "L2 资金沉淀增加，利好扩容板块龙头估值。",
	},
];

interface Ticker {
	lastPrice: number;
	priceChangePercent: number;
	quoteVolume: number;
}

async function fetchTickers(): Promise<Map<string, Ticker>> {
	const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
	if (!res.ok) {
		throw new Error(`Binance 行情拉取失败: ${res.status}`);
	}
	const raw = (await res.json()) as Array<{
		symbol: string;
		lastPrice: string;
		priceChangePercent: string;
		quoteVolume: string;
	}>;
	const map = new Map<string, Ticker>();
	for (const t of raw) {
		map.set(t.symbol, {
			lastPrice: Number(t.lastPrice),
			priceChangePercent: Number(t.priceChangePercent),
			quoteVolume: Number(t.quoteVolume),
		});
	}
	return map;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

const USDT_RE = /USDT$/;

async function seedSectors(tickers: Map<string, Ticker>): Promise<number> {
	const snapshotId = randomUUID();

	const built = SECTORS.map((sector) => {
		const leaders = sector.symbols
			.map((symbol) => ({ symbol, ticker: tickers.get(symbol) }))
			.filter(
				(x): x is { symbol: string; ticker: Ticker } => x.ticker !== undefined
			)
			.sort((a, b) => b.ticker.quoteVolume - a.ticker.quoteVolume)
			.slice(0, 3);
		const avg =
			leaders.reduce((acc, l) => acc + l.ticker.priceChangePercent, 0) /
			(leaders.length || 1);
		return {
			...sector,
			leaders,
			heatScore: clamp(50 + avg * 3, 5, 99),
		};
	})
		.filter((s) => s.leaders.length > 0)
		.sort((a, b) => b.heatScore - a.heatScore);

	for (let i = 0; i < built.length; i++) {
		const sector = built[i];
		const [snapshot] = await db
			.insert(sectorSnapshot)
			.values({
				snapshotId,
				name: sector.name,
				rank: i + 1,
				heatScore: sector.heatScore,
				summary: sector.summary,
			})
			.returning({ id: sectorSnapshot.id });

		await db.insert(sectorLeader).values(
			sector.leaders.map((l) => ({
				sectorSnapshotId: snapshot.id,
				symbol: l.symbol,
				name: l.symbol.replace(USDT_RE, ""),
				price: l.ticker.lastPrice,
				changePercent24h: l.ticker.priceChangePercent,
			}))
		);
	}

	await db.insert(sectorRefreshLog).values({
		snapshotId,
		status: "success",
		source: "seed",
	});

	return built.length;
}

async function seedNews(): Promise<number> {
	const now = Date.now();
	const rows = NEWS.map((n, i) => ({
		externalId: `seed-news-${i + 1}`,
		source: n.source,
		url: n.url,
		title: n.title,
		publishedAt: new Date(now - n.hoursAgo * HOUR_MS),
		tags: n.tags,
		aiSummary: n.summary,
	}));
	const inserted = await db
		.insert(newsItem)
		.values(rows)
		.onConflictDoNothing({ target: newsItem.externalId })
		.returning({ id: newsItem.id });
	return inserted.length;
}

async function main(): Promise<void> {
	const tickers = await fetchTickers();
	const sectors = await seedSectors(tickers);
	const news = await seedNews();
	process.stdout.write(`已灌入 ${sectors} 个板块快照、${news} 条新闻\n`);
	process.exit(0);
}

main().catch((error) => {
	process.stderr.write(
		`seed 失败: ${error instanceof Error ? error.message : error}\n`
	);
	process.exit(1);
});
