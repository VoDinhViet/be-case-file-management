CREATE TABLE "source_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"tasks" jsonb DEFAULT '[]' NOT NULL,
	"note" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"investigation_result" text,
	"exhibits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_investigation_purpose" text,
	"next_investigation_content" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"participating_forces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"budget" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"group_id" uuid,
	"field_label" varchar(100) NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"field_type" varchar(50) DEFAULT 'text' NOT NULL,
	"field_value" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"placeholder" varchar(255),
	"options" jsonb DEFAULT '[]'::jsonb,
	"default_value" varchar(255),
	"is_editable" boolean DEFAULT true NOT NULL,
	"index" integer DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid,
	"source_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid,
	"applicable_law" varchar(255),
	"number_of_defendants" varchar(50),
	"crime_type" varchar(100),
	"name" varchar(255),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"description" text,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "source_phases" ADD CONSTRAINT "source_phases_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_phases" ADD CONSTRAINT "source_phases_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_plans" ADD CONSTRAINT "source_plans_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_plans" ADD CONSTRAINT "source_plans_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_fields" ADD CONSTRAINT "source_fields_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_fields" ADD CONSTRAINT "source_fields_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."source_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_groups" ADD CONSTRAINT "source_groups_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;