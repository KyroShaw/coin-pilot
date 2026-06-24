import { createHmac } from "node:crypto";

import { db } from "@coin-pilot/db";
import { binanceCredential } from "@coin-pilot/db/schema/binance";
import { closedOrder } from "@coin-pilot/db/schema/order";
import { eq } from "drizzle-orm";

import { BinanceApiError } from "../lib/binance";
import { decrypt } from "../lib/crypto";

const FUTURES_API_BASE = "https://fapi.binance.com";
const INCOME_PATH = "/fapi/v1/income";
const REQUEST_TIMEOUT_MS = 12_000;
const RECV_WINDOW_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7; // Binance 历史接口单次时间跨度限制，按 7 天分片
const TOTAL_DAYS = 90;
const INCOME_LIMIT = 1000;

interface DecryptedCredential {
	apiKey: string;
	secretKey: string;
}

/** 读取并解密用户凭据（仅内存，不外泄）。未绑定返回 null。 */
async function loadCredential(
	userId: string
): Promise<DecryptedCredential | null> {
	const [cred] = await db
		.select()
		.from(binanceCredential)
		.where(eq(binanceCredential.userId, userId))
		.limit(1);
	if (!cred) {
		return null;
	}
	return {
		apiKey: decrypt({
			iv: cred.apiKeyIv,
			authTag: cred.apiKeyAuthTag,
			ciphertext: cred.apiKeyCipher,
		}),
		secretKey: decrypt({
			iv: cred.secretKeyIv,
			authTag: cred.secretKeyAuthTag,
			ciphertext: cred.secretKeyCipher,
		}),
	};
}

interface IncomeItem {
	income?: string;
	symbol?: string;
	time?: number;
	tradeId?: string | number;
}

async function fetchIncomeWindow(
	cred: DecryptedCredential,
	startTime: number,
	endTime: number
): Promise<IncomeItem[]> {
	const query = `incomeType=REALIZED_PNL&startTime=${startTime}&endTime=${endTime}&limit=${INCOME_LIMIT}&recvWindow=${RECV_WINDOW_MS}&timestamp=${Date.now()}`;
	const signature = createHmac("sha256", cred.secretKey)
		.update(query)
		.digest("hex");
	const url = `${FUTURES_API_BASE}${INCOME_PATH}?${query}&signature=${signature}`;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			headers: { "X-MBX-APIKEY": cred.apiKey },
			signal: controller.signal,
		});
		if (!response.ok) {
			throw new BinanceApiError("拉取 Binance 订单历史失败，请稍后重试");
		}
		const body = (await response.json().catch(() => null)) as
			| IncomeItem[]
			| null;
		return Array.isArray(body) ? body : [];
	} catch (error) {
		if (error instanceof BinanceApiError) {
			throw error;
		}
		throw new BinanceApiError("连接 Binance 失败，请检查网络后重试");
	} finally {
		clearTimeout(timer);
	}
}

/**
 * 同步近 90 天合约已平仓订单（基于 REALIZED_PNL income，跨币种、7 天分片）。
 * 幂等：(userId, exchangeOrderId) 唯一，重复同步不产生重复行。
 * 注：income 不含开/平仓价与方向，entry/exit/side 为占位，后续可用 userTrades 补全。
 */
export async function syncClosedOrders(userId: string): Promise<{
	syncedCount: number;
	total: number;
	lastSyncedAt: Date;
}> {
	const cred = await loadCredential(userId);
	if (!cred) {
		throw new BinanceApiError("尚未绑定 Binance API Key");
	}

	const now = Date.now();
	const start = now - TOTAL_DAYS * DAY_MS;
	let total = 0;
	let synced = 0;

	for (let from = start; from < now; from += WINDOW_DAYS * DAY_MS) {
		const to = Math.min(from + WINDOW_DAYS * DAY_MS, now);
		const items = await fetchIncomeWindow(cred, from, to);
		total += items.length;

		const rows = items
			.filter((it) => it.symbol && it.time !== undefined)
			.map((it) => ({
				userId,
				exchangeOrderId: String(it.tradeId ?? `${it.symbol}-${it.time}`),
				symbol: it.symbol as string,
				side: "LONG" as const,
				pnl: Number(it.income ?? 0),
				closedAt: new Date(it.time as number),
			}));

		if (rows.length > 0) {
			const inserted = await db
				.insert(closedOrder)
				.values(rows)
				.onConflictDoNothing({
					target: [closedOrder.userId, closedOrder.exchangeOrderId],
				})
				.returning({ id: closedOrder.id });
			synced += inserted.length;
		}
	}

	return { syncedCount: synced, total, lastSyncedAt: new Date() };
}
