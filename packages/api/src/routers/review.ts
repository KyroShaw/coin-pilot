import { db } from "@coin-pilot/db";
import { reviewReport } from "@coin-pilot/db/schema/order";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { generateReview } from "../services/review";

export const reviewRouter = router({
	/**
	 * 生成复盘报告（opus 流式内部生成 + 落库）。
	 * 注：当前为 mutation 返回完整 Markdown；浏览器逐字流式后续可加 SSE/subscription。
	 */
	generate: protectedProcedure
		.input(z.object({ orderIds: z.array(z.string().uuid()).min(1).max(50) }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await generateReview(ctx.session.user.id, input.orderIds);
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "复盘报告生成失败",
				});
			}
		}),

	/** 读取本人报告 Markdown（供查看/导出）。 */
	export: protectedProcedure
		.input(z.object({ reportId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const [report] = await db
				.select({
					markdown: reviewReport.markdown,
					generatedAt: reviewReport.generatedAt,
				})
				.from(reviewReport)
				.where(
					and(
						eq(reviewReport.id, input.reportId),
						eq(reviewReport.userId, ctx.session.user.id)
					)
				)
				.limit(1);

			if (!report) {
				throw new TRPCError({ code: "NOT_FOUND", message: "报告不存在" });
			}
			return report;
		}),
});
