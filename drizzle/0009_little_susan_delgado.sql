ALTER TABLE "users" ALTER COLUMN "referral_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_by" uuid;