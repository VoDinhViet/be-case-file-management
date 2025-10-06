CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"title" varchar NOT NULL,
	"body" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_expo" varchar(512);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_token_expo_unique" UNIQUE("token_expo");