ALTER TABLE "session" ALTER COLUMN "hash" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_by" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_by" SET DATA TYPE varchar;