import { runAlphaScrape } from "@coin-pilot/api/services/alpha";
import { runNewsRefresh } from "@coin-pilot/api/services/news";
import { runSectorRefresh } from "@coin-pilot/api/services/sector";
import { env } from "@coin-pilot/env/server";

const DAY_MS = 24 * 60 * 60 * 1000;

let sectorRefreshing = false;
let newsRefreshing = false;
let alphaScraping = false;

/**
 * 触发一次板块刷新，带并发互斥（同一时刻仅一个刷新在跑）。
 * 已在运行时返回 { skipped: true }。
 */
export async function triggerSectorRefresh(): Promise<{
	snapshotId?: string;
	skipped?: boolean;
}> {
	if (sectorRefreshing) {
		return { skipped: true };
	}
	sectorRefreshing = true;
	try {
		return await runSectorRefresh();
	} finally {
		sectorRefreshing = false;
	}
}

/** 启动板块刷新定时器（间隔来自 env，默认 25 分钟 ≤ 30 分钟）。 */
export function startSectorScheduler(): void {
	setInterval(() => {
		triggerSectorRefresh().catch((error) => {
			console.warn(
				"[sector] 刷新失败:",
				error instanceof Error ? error.message : error
			);
		});
	}, env.SECTOR_REFRESH_INTERVAL_MS);
}

/**
 * 触发一次新闻刷新流水线，带并发互斥。已在运行时返回 { skipped: true }。
 */
export async function triggerNewsRefresh(): Promise<{
	fetched?: number;
	inserted?: number;
	summarized?: number;
	skipped?: boolean;
}> {
	if (newsRefreshing) {
		return { skipped: true };
	}
	newsRefreshing = true;
	try {
		return await runNewsRefresh();
	} finally {
		newsRefreshing = false;
	}
}

/** 启动新闻刷新定时器（复用 SECTOR_REFRESH_INTERVAL_MS，≤ 30 分钟）。 */
export function startNewsScheduler(): void {
	setInterval(() => {
		triggerNewsRefresh().catch((error) => {
			console.warn(
				"[news] 刷新失败:",
				error instanceof Error ? error.message : error
			);
		});
	}, env.SECTOR_REFRESH_INTERVAL_MS);
}

/**
 * 触发一次 Alpha 抓取作业，带并发互斥。已在运行时返回 { skipped: true }。
 */
export async function triggerAlphaScrape(): Promise<{
	count?: number;
	skipped?: boolean;
}> {
	if (alphaScraping) {
		return { skipped: true };
	}
	alphaScraping = true;
	try {
		return await runAlphaScrape();
	} finally {
		alphaScraping = false;
	}
}

/** 启动 Alpha 每日抓取定时器（每日一次，满足 ≤ 24 小时刷新）。 */
export function startAlphaScheduler(): void {
	setInterval(() => {
		triggerAlphaScrape().catch((error) => {
			console.warn(
				"[alpha] 抓取失败:",
				error instanceof Error ? error.message : error
			);
		});
	}, DAY_MS);
}
