import {
	doublePrecision,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * 已平仓订单。(userId, exchangeOrderId) 唯一保证多次同步幂等。
 * F-006 资金曲线复用此表（基于 closedAt / pnl 计算）。
 */
export const closedOrder = pgTable(
	"closed_order",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		exchangeOrderId: text("exchange_order_id").notNull(),
		symbol: text("symbol").notNull(),
		side: text("side").notNull(), // "LONG" | "SHORT"
		entryPrice: doublePrecision("entry_price").notNull().default(0),
		exitPrice: doublePrecision("exit_price").notNull().default(0),
		quantity: doublePrecision("quantity").notNull().default(0),
		pnl: doublePrecision("pnl").notNull(),
		openedAt: timestamp("opened_at"),
		closedAt: timestamp("closed_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("closed_order_user_exchange_idx").on(
			table.userId,
			table.exchangeOrderId
		),
		index("closed_order_user_closed_at_idx").on(table.userId, table.closedAt),
	]
);

/** 用户为某笔订单录入的开/平仓逻辑，(userId, orderId) 唯一。 */
export const orderRationale = pgTable(
	"order_rationale",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		orderId: uuid("order_id")
			.notNull()
			.references(() => closedOrder.id, { onDelete: "cascade" }),
		entryRationale: text("entry_rationale").notNull().default(""),
		exitRationale: text("exit_rationale").notNull().default(""),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("order_rationale_user_order_idx").on(
			table.userId,
			table.orderId
		),
	]
);

/** AI 复盘报告（Markdown 全文，含三维度），生成后落库复用。 */
export const reviewReport = pgTable("review_report", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	orderIds: jsonb("order_ids").$type<string[]>().notNull(),
	markdown: text("markdown").notNull(),
	model: text("model").notNull(),
	generatedAt: timestamp("generated_at").defaultNow().notNull(),
});
