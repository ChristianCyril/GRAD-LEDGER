-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('UNIVERSITY', 'COLLEGE', 'PROFESSIONAL_BODY', 'TRAINING_INSTITUTE');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CERTIFICATE_ISSUED', 'CERTIFICATE_REVOKED', 'ADMIN_CREATED', 'ADMIN_ENABLED', 'ADMIN_DISABLED', 'ORG_PROFILE_UPDATED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_SUPER_ADMIN', 'ORG_ADMIN');

-- CreateEnum
CREATE TYPE "OrgUserRole" AS ENUM ('ORG_SUPER_ADMIN', 'ORG_ADMIN');

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "website" TEXT,
    "logo_url" TEXT,
    "official_email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "disabled_at" TIMESTAMP(3),
    "doc_incorporation" TEXT,
    "doc_letter_of_intent" TEXT,
    "doc_accreditation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUser" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "role" "OrgUserRole" NOT NULL,
    "full_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "issued_by_id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "year_of_entry" INTEGER NOT NULL,
    "year_of_graduation" INTEGER NOT NULL,
    "gpa" DOUBLE PRECISION NOT NULL,
    "certificate_hash" TEXT NOT NULL,
    "cloudinary_url" TEXT NOT NULL,
    "tx_hash" TEXT,
    "status" "CertStatus" NOT NULL DEFAULT 'PENDING',
    "revoke_reason" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_role" "UserRole" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_code_key" ON "Organisation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_official_email_key" ON "Organisation"("official_email");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUser_email_key" ON "OrgUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_org_id_matricule_key" ON "Student"("org_id", "matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Student_org_id_email_key" ON "Student"("org_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificate_hash_key" ON "Certificate"("certificate_hash");

-- CreateIndex
CREATE INDEX "Certificate_org_id_idx" ON "Certificate"("org_id");

-- CreateIndex
CREATE INDEX "Certificate_student_id_idx" ON "Certificate"("student_id");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_student_id_org_id_program_year_of_graduation_key" ON "Certificate"("student_id", "org_id", "program", "year_of_graduation");

-- CreateIndex
CREATE INDEX "AuditLog_org_id_idx" ON "AuditLog"("org_id");

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_user_role_idx" ON "RefreshToken"("user_id", "user_role");

-- AddForeignKey
ALTER TABLE "OrgUser" ADD CONSTRAINT "OrgUser_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "OrgUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "OrgUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
