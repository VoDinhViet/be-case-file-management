ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "case_files" ADD COLUMN "legal_article" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "case_files" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "case_files" ADD COLUMN "number_of_defendants" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "case_files" ADD COLUMN "start_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "case_files" ADD COLUMN "end_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "case_files" ADD COLUMN "officerInCharge" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "username";