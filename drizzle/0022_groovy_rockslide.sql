ALTER TABLE "cases" DROP CONSTRAINT "cases_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "template_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;