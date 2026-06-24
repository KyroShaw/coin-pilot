CREATE TABLE "sector_leader" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector_snapshot_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"price" double precision NOT NULL,
	"change_percent_24h" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sector_refresh_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sector_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	"heat_score" double precision NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sector_leader" ADD CONSTRAINT "sector_leader_sector_snapshot_id_sector_snapshot_id_fk" FOREIGN KEY ("sector_snapshot_id") REFERENCES "public"."sector_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sector_leader_snapshot_idx" ON "sector_leader" USING btree ("sector_snapshot_id");--> statement-breakpoint
CREATE INDEX "sector_snapshot_snapshot_id_idx" ON "sector_snapshot" USING btree ("snapshot_id");