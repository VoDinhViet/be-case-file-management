DROP TABLE "case_files" CASCADE;--> statement-breakpoint
ALTER TABLE "template_groups" ADD COLUMN "is_editable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "template_groups" ADD COLUMN "index" integer DEFAULT 0 NOT NULL;