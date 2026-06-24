import { db } from "@coin-pilot/db";
import { sectorLeader, sectorSnapshot } from "@coin-pilot/db/schema/sector";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const DEFAULT_LIMIT = 10;
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 超过 30 分钟未刷新视为过期

const getAllInput = z
	.object({ limit: z.number().int().min(5).max(20).optional() })
	.optional();

export const sectorRouter = router({
	/** 读取最新成功快照的板块榜与龙头（只读缓存，不触发外部调用）。 */
	getAll: protectedProcedure.input(getAllInput).query(async ({ input }) => {
		const limit = input?.limit ?? DEFAULT_LIMIT;

		// 最新批次（仅成功刷新才会写入快照行）
		const [latest] = await db
			.select({
				snapshotId: sectorSnapshot.snapshotId,
				createdAt: sectorSnapshot.createdAt,
			})
			.from(sectorSnapshot)
			.orderBy(desc(sectorSnapshot.createdAt))
			.limit(1);

		if (!latest) {
			return { updatedAt: null, stale: true, sectors: [] };
		}

		const sectors = await db
			.select()
			.from(sectorSnapshot)
			.where(eq(sectorSnapshot.snapshotId, latest.snapshotId))
			.orderBy(asc(sectorSnapshot.rank))
			.limit(limit);

		const sectorIds = sectors.map((s) => s.id);
		const leaders = sectorIds.length
			? await db
					.select()
					.from(sectorLeader)
					.where(inArray(sectorLeader.sectorSnapshotId, sectorIds))
			: [];

		const leadersBySector = new Map<string, typeof leaders>();
		for (const leader of leaders) {
			const list = leadersBySector.get(leader.sectorSnapshotId) ?? [];
			list.push(leader);
			leadersBySector.set(leader.sectorSnapshotId, list);
		}

		return {
			updatedAt: latest.createdAt,
			stale: Date.now() - latest.createdAt.getTime() > STALE_THRESHOLD_MS,
			sectors: sectors.map((s) => ({
				id: s.id,
				name: s.name,
				rank: s.rank,
				heatScore: s.heatScore,
				summary: s.summary,
				leaders: (leadersBySector.get(s.id) ?? []).map((l) => ({
					symbol: l.symbol,
					name: l.name,
					price: l.price,
					changePercent24h: l.changePercent24h,
				})),
			})),
		};
	}),
});
