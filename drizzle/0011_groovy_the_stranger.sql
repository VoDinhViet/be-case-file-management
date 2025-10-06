ALTER TABLE "cases" ADD COLUMN "article" varchar(50);--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "status" varchar(50) DEFAULT 'PENDING' NOT NULL;