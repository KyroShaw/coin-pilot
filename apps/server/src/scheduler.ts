import { runSectorRefresh } from "@coin-pilot/api/services/sector";
import { env } from "@coin-pilot/env/server";

let sectorRefreshing = false;

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
