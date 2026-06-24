CREATE TABLE "news_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"ai_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "news_item_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE INDEX "news_item_published_at_idx" ON "news_item" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "news_item_tags_idx" ON "news_item" USING gin ("tags");