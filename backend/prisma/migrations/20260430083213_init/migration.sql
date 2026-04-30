/*
  Warnings:

  - The values [issue,revoke] on the enum `Action` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `refresh_token` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Action_new" AS ENUM ('issued', 'revoked', 'batch_issued', 'credentials_resent');
ALTER TABLE "ActivityLog" ALTER COLUMN "action" TYPE "Action_new" USING ("action"::text::"Action_new");
ALTER TYPE "Action" RENAME TO "Action_old";
ALTER TYPE "Action_new" RENAME TO "Action";
DROP TYPE "Action_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "refresh_token";

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
