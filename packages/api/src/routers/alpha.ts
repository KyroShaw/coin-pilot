import { db } from "@coin-pilot/db";
import {
	alphaProject,
	alphaScrapeStatus,
	userAlphaWatch,
} from "@coin-pilot/db/schema/alpha";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

const listInput = z
	.object({
		onlyConsolidating: z.boolean().optional(),
		onlyWatched: z.boolean().optional(),
	})
	.optional();

async function getWatchedIds(userId: string): Promise<Set<string>> {
	const rows = await db
		.select({ alphaProjectId: userAlphaWatch.alphaProjectId })
		.from(userAlphaWatch)
		.where(eq(userAlphaWatch.userId, userId));
	return new Set(rows.map((r) => r.alphaProjectId));
}

export const alphaRouter = router({
	/** 读取 Alpha 项目列表（公开），按当前用户标注 isWatched。 */
	list: publicProcedure.input(listInput).query(async ({ ctx, input }) => {
		const userId = ctx.session?.user.id;

		const projects = await db
			.select()
			.from(alphaProject)
			.where(
				input?.onlyConsolidating
					? eq(alphaProject.isConsolidating, true)
					: undefined
			)
			.orderBy(desc(alphaProject.isConsolidating), asc(alphaProject.change30d));

		const [latestStatus] = await db
			.select()
			.from(alphaScrapeStatus)
			.orderBy(desc(alphaScrapeStatus.lastRunAt))
			.limit(1);

		const [latestData] = await db
			.select({ updatedAt: alphaProject.updatedAt })
			.from(alphaProject)
			.orderBy(desc(alphaProject.updatedAt))
			.limit(1);

		const watched = userId ? await getWatchedIds(userId) : new Set<string>();
		const filtered =
			input?.onlyWatched && userId
				? projects.filter((p) => watched.has(p.id))
				: projects;

		return {
			updatedAt: latestData?.updatedAt ?? null,
			lastScrapeStatus: (latestStatus?.lastStatus ?? "success") as
				| "failed"
				| "success",
			projects: filtered.map((p) => ({
				id: p.id,
				name: p.name,
				price: p.price,
				change7d: p.change7d,
				change30d: p.change30d,
				isConsolidating: p.isConsolidating,
				consolidationSnapshot: p.consolidationSnapshot,
				isWatched: watched.has(p.id),
			})),
		};
	}),

	/** 切换「定投关注」（幂等：已关注则移除，未关注则添加）。 */
	toggleWatch: protectedProcedure
		.input(z.object({ alphaProjectId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const [existing] = await db
				.select({ id: userAlphaWatch.id })
				.from(userAlphaWatch)
				.where(
					and(
						eq(userAlphaWatch.userId, userId),
						eq(userAlphaWatch.alphaProjectId, input.alphaProjectId)
					)
				)
				.limit(1);

			if (existing) {
				await db
					.delete(userAlphaWatch)
					.where(eq(userAlphaWatch.id, existing.id));
				return { alphaProjectId: input.alphaProjectId, isWatched: false };
			}

			await db.insert(userAlphaWatch).values({
				userId,
				alphaProjectId: input.alphaProjectId,
			});
			return { alphaProjectId: input.alphaProjectId, isWatched: true };
		}),
});
