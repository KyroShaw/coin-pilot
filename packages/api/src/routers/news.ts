import { db } from "@coin-pilot/db";
import { newsItem } from "@coin-pilot/db/schema/news";
import { TRPCError } from "@trpc/server";
import { and, arrayContains, desc, eq, lt, or } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { runNewsRefresh } from "../services/news";

const DEFAULT_LIMIT = 20;
const CURSOR_SEP = "__";

const listInput = z
	.object({
		tag: z.enum(["macro", "regulation", "market"]).optional(),
		limit: z.number().int().min(1).max(50).default(DEFAULT_LIMIT),
		cursor: z.string().nullish(),
	})
	.optional();

interface Cursor {
	id: string;
	publishedAt: Date;
}

function decodeCursor(raw: string | null | undefined): Cursor | null {
	if (!raw) {
		return null;
	}
	const [iso, id] = raw.split(CURSOR_SEP);
	if (!(iso && id)) {
		return null;
	}
	const publishedAt = new Date(iso);
	if (Number.isNaN(publishedAt.getTime())) {
		return null;
	}
	return { id, publishedAt };
}

function encodeCursor(item: { id: string; publishedAt: Date }): string {
	return `${item.publishedAt.toISOString()}${CURSOR_SEP}${item.id}`;
}

export const newsRouter = router({
	/** 倒序读取消息列表，支持标签筛选与基于 (publishedAt,id) 的游标分页。 */
	list: protectedProcedure.input(listInput).query(async ({ input }) => {
		const limit = input?.limit ?? DEFAULT_LIMIT;
		const cursor = decodeCursor(input?.cursor);

		const tagCond = input?.tag
			? arrayContains(newsItem.tags, [input.tag])
			: undefined;
		const cursorCond = cursor
			? or(
					lt(newsItem.publishedAt, cursor.publishedAt),
					and(
						eq(newsItem.publishedAt, cursor.publishedAt),
						lt(newsItem.id, cursor.id)
					)
				)
			: undefined;

		const rows = await db
			.select()
			.from(newsItem)
			.where(and(tagCond, cursorCond))
			.orderBy(desc(newsItem.publishedAt), desc(newsItem.id))
			.limit(limit + 1);

		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;
		const last = items.at(-1);

		const [latest] = await db
			.select({ updatedAt: newsItem.updatedAt })
			.from(newsItem)
			.orderBy(desc(newsItem.updatedAt))
			.limit(1);

		return {
			items: items.map((item) => ({
				id: item.id,
				source: item.source,
				url: item.url,
				title: item.title,
				publishedAt: item.publishedAt,
				tags: item.tags,
				aiSummary: item.aiSummary,
			})),
			nextCursor: hasMore && last ? encodeCursor(last) : null,
			updatedAt: latest?.updatedAt ?? null,
		};
	}),

	/** 手动触发拉取流水线（幂等；生产中主要由调度调用）。 */
	refresh: protectedProcedure.mutation(async () => {
		try {
			return await runNewsRefresh();
		} catch (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: error instanceof Error ? error.message : "新闻刷新失败",
			});
		}
	}),
});
