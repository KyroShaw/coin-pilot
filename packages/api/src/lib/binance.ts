import { createHmac } from "node:crypto";

import { db } from "@coin-pilot/db";
import { binanceCredential } from "@coin-pilot/db/schema/binance";
import { eq } from "drizzle-orm";

import { decrypt } from "./crypto";

const BINANCE_API_BASE = "https://api.binance.com";
const ACCOUNT_PATH = "/api/v3/account";
const REQUEST_TIMEOUT_MS = 10_000;
const RECV_WINDOW_MS = 5000;

/**
 * Binance 账户信息（仅取本项目关心的字段）。
 * canTrade / canWithdraw 用于「最小只读权限」校验。
 */
export interface BinanceAccountInfo {
	accountType: string;
	canDeposit: boolean;
	canTrade: boolean;
	canWithdraw: boolean;
	permissions: string[];
	updateTime: number;
}

/** 对外友好、对内不含敏感数据的 Binance 调用错误。 */
export class BinanceApiError extends Error {
	readonly code?: number;
	constructor(message: string, code?: number) {
		super(message);
		this.name = "BinanceApiError";
		this.code = code;
	}
}

function sign(query: string, secretKey: string): string {
	return createHmac("sha256", secretKey).update(query).digest("hex");
}

function friendlyMessage(code: number | undefined, fallback: string): string {
	switch (code) {
		case -2014:
		case -2015:
			return "API Key 无效或权限/IP 受限，请检查 Key 配置";
		case -1022:
			return "签名校验失败，请确认 Secret Key 是否正确";
		case -1021:
			return "本地时间与 Binance 服务器时间偏差过大，请校准系统时间";
		default:
			return fallback;
	}
}

/**
 * 用明文 apiKey/secretKey 调用 Binance 账户接口做连通性 + 权限读取。
 * 仅在内存中短暂使用明文，调用方不得记录日志或回传前端。
 */
export async function fetchBinanceAccount(
	apiKey: string,
	secretKey: string
): Promise<BinanceAccountInfo> {
	const timestamp = Date.now();
	const query = `recvWindow=${RECV_WINDOW_MS}&timestamp=${timestamp}`;
	const signature = sign(query, secretKey);
	const url = `${BINANCE_API_BASE}${ACCOUNT_PATH}?${query}&signature=${signature}`;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	let response: Response;
	try {
		response = await fetch(url, {
			method: "GET",
			headers: { "X-MBX-APIKEY": apiKey },
			signal: controller.signal,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new BinanceApiError("连接 Binance 超时，请稍后重试");
		}
		throw new BinanceApiError("无法连接 Binance，请检查网络后重试");
	} finally {
		clearTimeout(timer);
	}

	const body = (await response.json().catch(() => null)) as
		| (Partial<BinanceAccountInfo> & { code?: number; msg?: string })
		| null;

	if (!response.ok || body === null) {
		const code = body?.code;
		throw new BinanceApiError(
			friendlyMessage(code, "绑定校验失败，请确认 API Key 信息"),
			code
		);
	}

	return {
		canTrade: body.canTrade ?? false,
		canWithdraw: body.canWithdraw ?? false,
		canDeposit: body.canDeposit ?? false,
		accountType: body.accountType ?? "UNKNOWN",
		permissions: body.permissions ?? [],
		updateTime: body.updateTime ?? Date.now(),
	};
}

/**
 * 读取并解密某用户已绑定的凭据，调用 Binance 账户接口。
 * 供 F-001 绑定后复用与后续 feature（订单复盘等）共享。
 * 未绑定时抛出 BinanceApiError。
 */
export async function getBinanceAccountForUser(
	userId: string
): Promise<BinanceAccountInfo> {
	const [credential] = await db
		.select()
		.from(binanceCredential)
		.where(eq(binanceCredential.userId, userId))
		.limit(1);

	if (!credential) {
		throw new BinanceApiError("尚未绑定 Binance API Key");
	}

	const apiKey = decrypt({
		iv: credential.apiKeyIv,
		authTag: credential.apiKeyAuthTag,
		ciphertext: credential.apiKeyCipher,
	});
	const secretKey = decrypt({
		iv: credential.secretKeyIv,
		authTag: credential.secretKeyAuthTag,
		ciphertext: credential.secretKeyCipher,
	});

	return fetchBinanceAccount(apiKey, secretKey);
}

const TICKER_24HR_PATH = "/api/v3/ticker/24hr";

/** 公开 24h 行情（仅取本项目关心字段）。 */
export interface BinanceTicker {
	lastPrice: number;
	priceChangePercent: number;
	quoteVolume: number;
	symbol: string;
}

/**
 * 拉取全市场 24h ticker（公开接口，无需鉴权），筛选 USDT 计价交易对。
 * 用于板块行情采集；失败抛出 BinanceApiError。
 */
export async function fetchUsdtTickers(): Promise<BinanceTicker[]> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	let response: Response;
	try {
		response = await fetch(`${BINANCE_API_BASE}${TICKER_24HR_PATH}`, {
			method: "GET",
			signal: controller.signal,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new BinanceApiError("拉取 Binance 行情超时，请稍后重试");
		}
		throw new BinanceApiError("无法连接 Binance 行情接口");
	} finally {
		clearTimeout(timer);
	}

	if (!response.ok) {
		throw new BinanceApiError("拉取 Binance 行情失败");
	}

	const raw = (await response.json().catch(() => null)) as Array<{
		symbol?: string;
		lastPrice?: string;
		priceChangePercent?: string;
		quoteVolume?: string;
	}> | null;

	if (!Array.isArray(raw)) {
		throw new BinanceApiError("Binance 行情响应格式异常");
	}

	return raw
		.filter((t) => typeof t.symbol === "string" && t.symbol.endsWith("USDT"))
		.map((t) => ({
			symbol: t.symbol as string,
			lastPrice: Number(t.lastPrice ?? 0),
			priceChangePercent: Number(t.priceChangePercent ?? 0),
			quoteVolume: Number(t.quoteVolume ?? 0),
		}));
}
