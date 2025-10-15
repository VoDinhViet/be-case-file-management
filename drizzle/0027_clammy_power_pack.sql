ALTER TABLE "case_plans" DROP CONSTRAINT "case_plans_case_id_cases_id_fk";
--> statement-breakpoint
ALTER TABLE "case_plans" ALTER COLUMN "exhibits" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "case_plans" ADD CONSTRAINT "case_plans_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;