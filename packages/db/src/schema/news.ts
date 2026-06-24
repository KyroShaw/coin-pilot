import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * 宏观/加密热点消息。externalId 为去重键（CryptoPanic 消息 id，
 * 无 id 时由服务层回退为规范化 url 哈希）。aiSummary 为一句话影响摘要缓存，
 * IS NULL 表示待生成。tags 为内部标签集合（macro/regulation/market）。
 */
export const newsItem = pgTable(
	"news_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		externalId: text("external_id").notNull().unique(),
		source: text("source").notNull(),
		url: text("url").notNull(),
		title: text("title").notNull(),
		publishedAt: timestamp("published_at").notNull(),
		tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
		aiSummary: text("ai_summary"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("news_item_published_at_idx").on(table.publishedAt.desc()),
		index("news_item_tags_idx").using("gin", table.tags),
	]
);
