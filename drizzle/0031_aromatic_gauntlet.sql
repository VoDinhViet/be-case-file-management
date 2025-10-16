-- Set NULL cho các userId không tồn tại trong bảng users
UPDATE "cases" 
SET "user_id" = NULL 
WHERE "user_id" IS NOT NULL 
  AND "user_id" NOT IN (SELECT "id" FROM "users");

-- Thêm foreign key constraint với ON DELETE SET NULL
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;