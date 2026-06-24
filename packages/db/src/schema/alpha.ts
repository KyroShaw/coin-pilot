import {
	boolean,
	doublePrecision,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/** 盘整判断依据快照（写入前端展示用）。 */
export interface ConsolidationSnapshot {
	change30d: number;
	computedAt: string;
	thresholds: { drop30d: number; volatility7d: number };
	volatility7d: number;
}

/** Binance Alpha 项目快照（每日抓取整体更新）。 */
export const alphaProject = pgTable("alpha_project", {
	id: uuid("id").primaryKey().defaultRandom(),
	// name 作为自然键：刷新按 name upsert，保持项目 id 稳定，避免级联删除用户关注
	name: text("name").notNull().unique(),
	price: doublePrecision("price").notNull(),
	change7d: doublePrecision("change_7d").notNull(),
	change30d: doublePrecision("change_30d").notNull(),
	isConsolidating: boolean("is_consolidating").notNull().default(false),
	consolidationSnapshot: jsonb("consolidation_snapshot")
		.$type<ConsolidationSnapshot>()
		.notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

/** 最近一次抓取状态（单行，供降级展示与告警）。 */
export const alphaScrapeStatus = pgTable("alpha_scrape_status", {
	id: uuid("id").primaryKey().defaultRandom(),
	lastRunAt: timestamp("last_run_at").defaultNow().notNull(),
	lastStatus: text("last_status").notNull(), // "success" | "failed"
	lastError: text("last_error"),
});

/** 用户「定投关注」关系，(userId, alphaProjectId) 唯一保证幂等。 */
export const userAlphaWatch = pgTable(
	"user_alpha_watch",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		alphaProjectId: uuid("alpha_project_id")
			.notNull()
			.references(() => alphaProject.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("user_alpha_watch_user_project_idx").on(
			table.userId,
			table.alphaProjectId
		),
	]
);
