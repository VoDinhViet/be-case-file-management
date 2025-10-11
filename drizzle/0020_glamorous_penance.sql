ALTER TABLE "template_fields" DROP CONSTRAINT "template_fields_group_id_template_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."template_groups"("id") ON DELETE cascade ON UPDATE no action;