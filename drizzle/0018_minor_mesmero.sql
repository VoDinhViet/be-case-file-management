ALTER TABLE "case_fields" DROP CONSTRAINT "case_fields_case_id_cases_id_fk";
--> statement-breakpoint
ALTER TABLE "case_fields" DROP CONSTRAINT "case_fields_group_id_case_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "case_fields" DROP CONSTRAINT "case_fields_field_id_template_fields_id_fk";
--> statement-breakpoint
ALTER TABLE "case_groups" DROP CONSTRAINT "case_groups_case_id_cases_id_fk";
--> statement-breakpoint
-- ALTER TABLE "case_fields" ALTER COLUMN "field_label" SET NOT NULL;--> statement-breakpoint
-- ALTER TABLE "case_fields" ALTER COLUMN "field_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "field_type" varchar(50) DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "is_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "placeholder" varchar(255);--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "options" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "default_value" varchar(255);--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "is_editable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "case_groups" ADD COLUMN "index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" DROP COLUMN "field_id";