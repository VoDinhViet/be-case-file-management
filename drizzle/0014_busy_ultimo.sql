CREATE TABLE "case_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"tasks" jsonb DEFAULT '[]' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "applicable_law" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "number_of_defendants" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "crime_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "case_phases" ADD CONSTRAINT "case_phases_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;