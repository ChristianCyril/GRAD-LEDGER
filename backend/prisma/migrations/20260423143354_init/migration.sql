/*
  Warnings:

  - You are about to drop the column `student_id` on the `AcademicRecord` table. All the data in the column will be lost.
  - The primary key for the `Admin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `admin_id` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Admin` table. All the data in the column will be lost.
  - The primary key for the `Student` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `first_name` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the `PortalCredential` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[student_id]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `student_user_id` to the `AcademicRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AcademicRecord" DROP CONSTRAINT "AcademicRecord_student_id_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "PortalCredential" DROP CONSTRAINT "PortalCredential_student_id_fkey";

-- DropIndex
DROP INDEX "Admin_email_key";

-- AlterTable
ALTER TABLE "AcademicRecord" DROP COLUMN "student_id",
ADD COLUMN     "student_user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_pkey",
DROP COLUMN "admin_id",
DROP COLUMN "created_at",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "refresh_token",
DROP COLUMN "role",
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "Admin_pkey" PRIMARY KEY ("user_id");

-- AlterTable
ALTER TABLE "Student" DROP CONSTRAINT "Student_pkey",
DROP COLUMN "first_name",
DROP COLUMN "last_name",
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "Student_pkey" PRIMARY KEY ("user_id");

-- DropTable
DROP TABLE "PortalCredential";

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "refresh_token" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_student_id_key" ON "Student"("student_id");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicRecord" ADD CONSTRAINT "AcademicRecord_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "Student"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
