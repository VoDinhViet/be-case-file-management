ALTER TABLE "case_plans" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "case_plans" ADD COLUMN "end_date" timestamp;--> statement-breakpoint
ALTER TABLE "case_plans" ADD COLUMN "budget" varchar(255);