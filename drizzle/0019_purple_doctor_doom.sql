ALTER TABLE "template_groups" DROP CONSTRAINT "template_groups_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "template_fields" ALTER COLUMN "field_label" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "template_fields" ALTER COLUMN "field_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "template_groups" ADD CONSTRAINT "template_groups_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;