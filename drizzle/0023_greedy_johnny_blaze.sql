ALTER TABLE "notifications" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "title" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "body" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "case_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "type" varchar(50) DEFAULT 'SYSTEM' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;