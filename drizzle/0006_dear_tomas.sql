DROP TABLE "roles" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(32) DEFAULT 'staff' NOT NULL;