CREATE TABLE "alpha_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" double precision NOT NULL,
	"change_7d" double precision NOT NULL,
	"change_30d" double precision NOT NULL,
	"is_consolidating" boolean DEFAULT false NOT NULL,
	"consolidation_snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alpha_scrape_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_run_at" timestamp DEFAULT now() NOT NULL,
	"last_status" text NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "user_alpha_watch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"alpha_project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_alpha_watch" ADD CONSTRAINT "user_alpha_watch_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_alpha_watch" ADD CONSTRAINT "user_alpha_watch_alpha_project_id_alpha_project_id_fk" FOREIGN KEY ("alpha_project_id") REFERENCES "public"."alpha_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_alpha_watch_user_project_idx" ON "user_alpha_watch" USING btree ("user_id","alpha_project_id");