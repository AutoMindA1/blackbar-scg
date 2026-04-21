-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('operator', 'expert', 'admin');

-- AlterTable: change role column from TEXT to UserRole enum
-- Existing values ('operator') cast cleanly to the new enum.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'operator'::"UserRole";
