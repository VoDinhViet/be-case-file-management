ALTER TABLE "template_fields"
ALTER COLUMN "options" TYPE jsonb
USING "options"::jsonb;