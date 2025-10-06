ALTER TABLE "cases" ADD COLUMN "applicable_law" varchar(255) ;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "number_of_defendants" varchar(50) ;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "crime_type" varchar(100) ;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "end_date" timestamp;--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "article";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "started_at";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "ended_at";