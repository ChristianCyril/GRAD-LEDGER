/*
  Warnings:

  - A unique constraint covering the columns `[user_id,device_id]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `device_id` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "device_id" TEXT NOT NULL,
ADD COLUMN     "user_agent" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_user_id_device_id_key" ON "RefreshToken"("user_id", "device_id");
