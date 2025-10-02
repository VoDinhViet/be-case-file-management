CREATE INDEX "full_name_idx" ON "users" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "role_idx" ON "users" USING btree ("role");