ALTER TABLE "case_plans" ADD COLUMN "next_investigation_purpose" text;--> statement-breakpoint
ALTER TABLE "case_plans" ADD COLUMN "next_investigation_content" jsonb DEFAULT '[]'::jsonb NOT NULL;