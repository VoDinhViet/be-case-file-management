ALTER TABLE "users" DROP CONSTRAINT "users_token_expo_unique";--> statement-breakpoint
ALTER TABLE "case_fields" ALTER COLUMN "case_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ALTER COLUMN "group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ALTER COLUMN "field_label" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "case_fields" ALTER COLUMN "field_name" DROP NOT NULL;