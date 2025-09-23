ALTER TABLE "template_fields"
    ALTER COLUMN "is_required" DROP DEFAULT;

-- Đổi sang boolean, cast từ text
ALTER TABLE "template_fields"
    ALTER COLUMN "is_required" TYPE boolean
        USING is_required::boolean;

-- Nếu muốn default true (hoặc false), set lại
ALTER TABLE "template_fields"
    ALTER COLUMN "is_required" SET DEFAULT false;
