import {
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/** 用户风险预警阈值（每用户一行）。阈值范围 2-10 由应用层 zod 校验。 */
export const alertSetting = pgTable(
	"alert_setting",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		lossThreshold: integer("loss_threshold").notNull().default(3),
		profitThreshold: integer("profit_threshold").notNull().default(5),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [uniqueIndex("alert_setting_user_idx").on(table.userId)]
);
