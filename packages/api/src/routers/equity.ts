import { db } from "@coin-pilot/db";
import { alertSetting } from "@coin-pilot/db/schema/alert";
import { closedOrder } from "@coin-pilot/db/schema/order";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { buildEquityCurve, detectStreaks } from "../lib/equity";
import { generateCoachingTip } from "../services/coaching";

const DEFAULT_LOSS = 3;
const DEFAULT_PROFIT = 5;
const STREAK_WINDOW = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const PRESET_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
const MIN_THRESHOLD = 2;
const MAX_THRESHOLD = 10;

async function getThresholds(
	userId: string
): Promise<{ lossThreshold: number; profitThreshold: number }> {
	const [row] = await db
		.select({
			lossThreshold: alertSetting.lossThreshold,
			profitThreshold: alertSetting.profitThreshold,
		})
		.from(alertSetting)
		.where(eq(alertSetting.userId, userId))
		.limit(1);
	return {
		lossThreshold: row?.lossThreshold ?? DEFAULT_LOSS,
		profitThreshold: row?.profitThreshold ?? DEFAULT_PROFIT,
	};
}

export const equityRouter = router({
	/** 资金曲线：累计已实现盈亏，按天/周聚合（当前用户）。 */
	curve: protectedProcedure
		.input(
			z.object({
				preset: z.enum(["7d", "30d", "90d", "all"]).default("90d"),
				granularity: z.enum(["day", "week"]).default("day"),
			})
		)
		.query(async ({ ctx, input }) => {
			const conds = [eq(closedOrder.userId, ctx.session.user.id)];
			if (input.preset !== "all") {
				const days = PRESET_DAYS[input.preset] ?? 90;
				conds.push(
					gte(closedOrder.closedAt, new Date(Date.now() - days * DAY_MS))
				);
			}
			const orders = await db
				.select({ pnl: closedOrder.pnl, closedAt: closedOrder.closedAt })
				.from(closedOrder)
				.where(and(...conds))
				.orderBy(asc(closedOrder.closedAt));

			return { points: buildEquityCurve(orders, input.granularity) };
		}),
});

export const alertRouter = router({
	/** 连续盈亏预警状态（末端 streak vs 用户阈值）。 */
	status: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const orders = await db
			.select({ pnl: closedOrder.pnl, closedAt: closedOrder.closedAt })
			.from(closedOrder)
			.where(eq(closedOrder.userId, userId))
			.orderBy(desc(closedOrder.closedAt))
			.limit(STREAK_WINDOW);

		const { lossStreak, profitStreak } = detectStreaks(orders);
		const { lossThreshold, profitThreshold } = await getThresholds(userId);

		return {
			loss: {
				streak: lossStreak,
				threshold: lossThreshold,
				triggered: lossStreak >= lossThreshold,
			},
			profit: {
				streak: profitStreak,
				threshold: profitThreshold,
				triggered: profitStreak >= profitThreshold,
			},
		};
	}),

	/** AI 冷静复盘提示（仅预警触发后按需调用）。 */
	coachingTip: protectedProcedure
		.input(z.object({ type: z.enum(["loss", "profit"]) }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await generateCoachingTip(ctx.session.user.id, input.type);
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "冷静提示生成失败",
				});
			}
		}),
});

const thresholdSchema = z.number().int().min(MIN_THRESHOLD).max(MAX_THRESHOLD);

export const settingsRouter = router({
	/** 读取阈值（未配置回落默认 3 / 5）。 */
	getThreshold: protectedProcedure.query(({ ctx }) =>
		getThresholds(ctx.session.user.id)
	),

	/** 更新阈值（2-10，按 userId upsert）。 */
	updateThreshold: protectedProcedure
		.input(
			z.object({
				lossThreshold: thresholdSchema,
				profitThreshold: thresholdSchema,
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			await db
				.insert(alertSetting)
				.values({
					userId,
					lossThreshold: input.lossThreshold,
					profitThreshold: input.profitThreshold,
				})
				.onConflictDoUpdate({
					target: alertSetting.userId,
					set: {
						lossThreshold: input.lossThreshold,
						profitThreshold: input.profitThreshold,
						updatedAt: new Date(),
					},
				});
			return {
				lossThreshold: input.lossThreshold,
				profitThreshold: input.profitThreshold,
			};
		}),
});
