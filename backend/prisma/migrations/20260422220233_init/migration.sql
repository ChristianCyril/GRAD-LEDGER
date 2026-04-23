/*
  Warnings:

  - You are about to drop the column `classification` on the `AcademicRecord` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `AcademicRecord` table. All the data in the column will be lost.
  - You are about to drop the column `faculty` on the `AcademicRecord` table. All the data in the column will be lost.
  - You are about to drop the column `final_grade` on the `AcademicRecord` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `AcademicRecord` table. All the data in the column will be lost.
  - You are about to drop the column `mode_of_study` on the `AcademicRecord` table. All the data in the column will be lost.
  - You are about to drop the column `programme` on the `AcademicRecord` table. All the data in the column will be lost.
  - You are about to drop the column `specialization` on the `AcademicRecord` table. All the data in the column will be lost.
  - The `clearance_status` column on the `AcademicRecord` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `certificate_status` column on the `AcademicRecord` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `student_id` on the `Certificate` table. All the data in the column will be lost.
  - The `status` column on the `Certificate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `email` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `photo_url` on the `Student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[record_id]` on the table `Certificate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hash]` on the table `Certificate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tx_hash]` on the table `Certificate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `PortalCredential` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `programme_id` to the `AcademicRecord` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ClearanceStatus" AS ENUM ('Cleared', 'Not_Cleared');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('Issued', 'Not_Issued');

-- CreateEnum
CREATE TYPE "CertificateRecordStatus" AS ENUM ('Pending', 'Issued', 'Revoked');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'student');

-- CreateEnum
CREATE TYPE "Action" AS ENUM ('issued', 'revoke');

-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_student_id_fkey";

-- AlterTable
ALTER TABLE "AcademicRecord" DROP COLUMN "classification",
DROP COLUMN "department",
DROP COLUMN "faculty",
DROP COLUMN "final_grade",
DROP COLUMN "level",
DROP COLUMN "mode_of_study",
DROP COLUMN "programme",
DROP COLUMN "specialization",
ADD COLUMN     "programme_id" TEXT NOT NULL,
DROP COLUMN "clearance_status",
ADD COLUMN     "clearance_status" "ClearanceStatus" NOT NULL DEFAULT 'Not_Cleared',
DROP COLUMN "certificate_status",
ADD COLUMN     "certificate_status" "CertificateStatus" NOT NULL DEFAULT 'Not_Issued';

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'admin';

-- AlterTable
ALTER TABLE "Certificate" DROP COLUMN "student_id",
ADD COLUMN     "tx_hash" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "CertificateRecordStatus" NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "PortalCredential" ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'student';

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "email",
DROP COLUMN "photo_url";

-- CreateTable
CREATE TABLE "Faculty" (
    "faculty_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("faculty_id")
);

-- CreateTable
CREATE TABLE "Department" (
    "department_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("department_id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "programme_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("programme_id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "log_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" "Action" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_record_id_key" ON "Certificate"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_hash_key" ON "Certificate"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_tx_hash_key" ON "Certificate"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "PortalCredential_email_key" ON "PortalCredential"("email");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "Faculty"("faculty_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("department_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicRecord" ADD CONSTRAINT "AcademicRecord_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "Programme"("programme_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
