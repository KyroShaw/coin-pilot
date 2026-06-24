import {
	doublePrecision,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * 板块快照。同一次刷新批次的所有板块共享一个 snapshotId，
 * 读取时取最新成功批次，保证板块与龙头时间一致。
 */
export const sectorSnapshot = pgTable(
	"sector_snapshot",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		snapshotId: uuid("snapshot_id").notNull(),
		name: text("name").notNull(),
		rank: integer("rank").notNull(),
		heatScore: doublePrecision("heat_score").notNull(),
		summary: text("summary").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("sector_snapshot_snapshot_id_idx").on(table.snapshotId)]
);

/** 板块龙头币种，归属某条板块快照。 */
export const sectorLeader = pgTable(
	"sector_leader",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sectorSnapshotId: uuid("sector_snapshot_id")
			.notNull()
			.references(() => sectorSnapshot.id, { onDelete: "cascade" }),
		symbol: text("symbol").notNull(),
		name: text("name").notNull(),
		price: doublePrecision("price").notNull(),
		changePercent24h: doublePrecision("change_percent_24h").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("sector_leader_snapshot_idx").on(table.sectorSnapshotId)]
);

/** 刷新日志，用于验证刷新周期与排障。 */
export const sectorRefreshLog = pgTable("sector_refresh_log", {
	id: uuid("id").primaryKey().defaultRandom(),
	snapshotId: uuid("snapshot_id"),
	status: text("status").notNull(), // "success" | "failed"
	source: text("source").notNull(), // "binance" | "claude" | "job"
	message: text("message"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
