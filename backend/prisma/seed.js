import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {

  // 1. Super Admin
  await prisma.superAdmin.create({
    data: {
      email:         'superadmin@certchain.com',
      password_hash: await bcrypt.hash('SuperAdmin@123', 10)
    }
  });

  // 2. Organisation
  const org = await prisma.organisation.create({
    data: {
      name:           'University of Yaoundé I',
      code:           'UY1',
      type:           'UNIVERSITY',
      country:        'Cameroon',
      city:           'Yaoundé',
      website:        'https://www.uy1.cm',
      official_email: 'info@uy1.cm',
      phone:          '+237677000001',
      address:        'BP 337 Yaoundé',
      status:         'APPROVED',
      doc_incorporation:    'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
      doc_letter_of_intent: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
      doc_accreditation:    'https://res.cloudinary.com/demo/raw/upload/sample.pdf'
    }
  });

  // 3. Org Super Admin (OrgUser with role ORG_SUPER_ADMIN)
  await prisma.orgUser.create({
    data: {
      org_id:        org.id,
      role:          'ORG_SUPER_ADMIN',
      full_name:     'Dr. Jean Paul Mbarga',
      job_title:     'Registrar',
      email:         'registrar@uy1.cm',
      phone:         '+237677000002',
      password_hash: await bcrypt.hash('OrgSuper@1234', 10),
      status:        'ACTIVE'
    }
  });

  // 4. Org Admin (OrgUser with role ORG_ADMIN)
  await prisma.orgUser.create({
    data: {
      org_id:        org.id,
      role:          'ORG_ADMIN',
      full_name:     'Marie Claire Ngo',
      job_title:     'Deputy Registrar',
      email:         'marie@uy1.cm',
      phone:         '+237677000003',
      password_hash: await bcrypt.hash('Admin@123', 10),
      status:        'ACTIVE'
    }
  });

  // 5. Student (no auth — data record only)
  await prisma.student.create({
    data: {
      org_id:    org.id,
      full_name: 'John Doe',
      matricule: 'UY1-2021-0001',
      email:     'john.doe@email.com'
    }
  });

  console.log('✅ Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());