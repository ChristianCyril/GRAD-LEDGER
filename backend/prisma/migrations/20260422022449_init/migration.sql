-- CreateTable
CREATE TABLE "Student" (
    "student_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "nationality" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "AcademicRecord" (
    "record_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "faculty" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "specialization" TEXT,
    "level" TEXT NOT NULL,
    "mode_of_study" TEXT NOT NULL,
    "entry_year" INTEGER NOT NULL,
    "graduation_year" INTEGER NOT NULL,
    "final_gpa" DOUBLE PRECISION,
    "final_grade" TEXT,
    "classification" TEXT NOT NULL,
    "clearance_status" TEXT NOT NULL DEFAULT 'Not Cleared',
    "certificate_status" TEXT NOT NULL DEFAULT 'Not Issued',

    CONSTRAINT "AcademicRecord_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "admin_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "cert_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("cert_id")
);

-- CreateTable
CREATE TABLE "PortalCredential" (
    "credential_id" SERIAL NOT NULL,
    "student_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalCredential_pkey" PRIMARY KEY ("credential_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PortalCredential_student_id_key" ON "PortalCredential"("student_id");

-- AddForeignKey
ALTER TABLE "AcademicRecord" ADD CONSTRAINT "AcademicRecord_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "AcademicRecord"("record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalCredential" ADD CONSTRAINT "PortalCredential_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;
