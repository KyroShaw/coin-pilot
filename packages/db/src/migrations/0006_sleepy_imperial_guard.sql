CREATE TABLE "closed_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"exchange_order_id" text NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"entry_price" double precision DEFAULT 0 NOT NULL,
	"exit_price" double precision DEFAULT 0 NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"pnl" double precision NOT NULL,
	"opened_at" timestamp,
	"closed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_rationale" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"entry_rationale" text DEFAULT '' NOT NULL,
	"exit_rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"order_ids" jsonb NOT NULL,
	"markdown" text NOT NULL,
	"model" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "closed_order" ADD CONSTRAINT "closed_order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_rationale" ADD CONSTRAINT "order_rationale_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_rationale" ADD CONSTRAINT "order_rationale_order_id_closed_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."closed_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "closed_order_user_exchange_idx" ON "closed_order" USING btree ("user_id","exchange_order_id");--> statement-breakpoint
CREATE INDEX "closed_order_user_closed_at_idx" ON "closed_order" USING btree ("user_id","closed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_rationale_user_order_idx" ON "order_rationale" USING btree ("user_id","order_id");