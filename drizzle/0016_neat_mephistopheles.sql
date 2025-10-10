CREATE TABLE "case_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"group_id" uuid,
	"title" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "case_fields" RENAME COLUMN "value" TO "field_value";--> statement-breakpoint
ALTER TABLE "case_fields" ALTER COLUMN "field_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "group_id" uuid ;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "field_label" varchar(100) ;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "field_name" varchar(100);--> statement-breakpoint
ALTER TABLE "case_groups" ADD CONSTRAINT "case_groups_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_groups" ADD CONSTRAINT "case_groups_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_fields" ADD CONSTRAINT "case_fields_group_id_case_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."case_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_fields" ADD CONSTRAINT "case_fields_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_fields" ADD CONSTRAINT "case_fields_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."case_groups"("id") ON DELETE cascade ON UPDATE no action;