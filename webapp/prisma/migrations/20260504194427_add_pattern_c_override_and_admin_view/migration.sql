-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "pattern_c_override" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_request_admin_view" BOOLEAN NOT NULL DEFAULT false;

