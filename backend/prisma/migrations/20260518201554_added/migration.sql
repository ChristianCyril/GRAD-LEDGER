-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'PENDING');

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "issuance_email_status" "EmailStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OrgUser" ADD COLUMN     "reg_email_status" "EmailStatus" NOT NULL DEFAULT 'PENDING';
