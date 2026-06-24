import { db } from "@coin-pilot/db";
import { closedOrder, orderRationale } from "@coin-pilot/db/schema/order";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { BinanceApiError } from "../lib/binance";
import { syncClosedOrders } from "../services/order";

const DEFAULT_LIMIT = 50;
const CURSOR_SEP = "__";
const MAX_RATIONALE = 2000;

interface Cursor {
	closedAt: Date;
	id: string;
}

function decodeCursor(raw: string | null | undefined): Cursor | null {
	if (!raw) {
		return null;
	}
	const [iso, id] = raw.split(CURSOR_SEP);
	if (!(iso && id)) {
		return null;
	}
	const closedAt = new Date(iso);
	if (Number.isNaN(closedAt.getTime())) {
		return null;
	}
	return { closedAt, id };
}

function encodeCursor(item: { closedAt: Date; id: string }): string {
	return `${item.closedAt.toISOString()}${CURSOR_SEP}${item.id}`;
}

export const orderRouter = router({
	/** 同步近 90 天合约已平仓订单（幂等入库）。 */
	sync: protectedProcedure.mutation(async ({ ctx }) => {
		try {
			return await syncClosedOrders(ctx.session.user.id);
		} catch (error) {
			const message =
				error instanceof BinanceApiError ? error.message : "订单同步失败";
			throw new TRPCError({ code: "BAD_REQUEST", message });
		}
	}),

	/** 列表（按用户隔离、closedAt 倒序、游标分页）。 */
	list: protectedProcedure
		.input(
			z
				.object({
					cursor: z.string().nullish(),
					limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const limit = input?.limit ?? DEFAULT_LIMIT;
			const cursor = decodeCursor(input?.cursor);

			const cursorCond = cursor
				? or(
						lt(closedOrder.closedAt, cursor.closedAt),
						and(
							eq(closedOrder.closedAt, cursor.closedAt),
							lt(closedOrder.id, cursor.id)
						)
					)
				: undefined;

			const rows = await db
				.select()
				.from(closedOrder)
				.where(and(eq(closedOrder.userId, userId), cursorCond))
				.orderBy(desc(closedOrder.closedAt), desc(closedOrder.id))
				.limit(limit + 1);

			const hasMore = rows.length > limit;
			const items = hasMore ? rows.slice(0, limit) : rows;
			const last = items.at(-1);

			const ids = items.map((o) => o.id);
			const rationaleRows = ids.length
				? await db
						.select({ orderId: orderRationale.orderId })
						.from(orderRationale)
						.where(
							and(
								eq(orderRationale.userId, userId),
								inArray(orderRationale.orderId, ids)
							)
						)
				: [];
			const withRationale = new Set(rationaleRows.map((r) => r.orderId));

			return {
				items: items.map((o) => ({
					id: o.id,
					symbol: o.symbol,
					side: o.side,
					entryPrice: o.entryPrice,
					exitPrice: o.exitPrice,
					pnl: o.pnl,
					closedAt: o.closedAt,
					hasRationale: withRationale.has(o.id),
				})),
				nextCursor: hasMore && last ? encodeCursor(last) : null,
			};
		}),

	/** 录入/更新某笔订单的开/平仓逻辑（按 (userId, orderId) upsert，仅本人）。 */
	saveRationale: protectedProcedure
		.input(
			z.object({
				orderId: z.string().uuid(),
				entryRationale: z.string().max(MAX_RATIONALE),
				exitRationale: z.string().max(MAX_RATIONALE),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// 校验订单归属当前用户，防止越权
			const [owned] = await db
				.select({ id: closedOrder.id })
				.from(closedOrder)
				.where(
					and(eq(closedOrder.id, input.orderId), eq(closedOrder.userId, userId))
				)
				.limit(1);
			if (!owned) {
				throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
			}

			await db
				.insert(orderRationale)
				.values({
					userId,
					orderId: input.orderId,
					entryRationale: input.entryRationale,
					exitRationale: input.exitRationale,
				})
				.onConflictDoUpdate({
					target: [orderRationale.userId, orderRationale.orderId],
					set: {
						entryRationale: input.entryRationale,
						exitRationale: input.exitRationale,
						updatedAt: new Date(),
					},
				});

			return { saved: true as const, orderId: input.orderId };
		}),
});
