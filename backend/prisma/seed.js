import pkg from '@prisma/client';
const { PrismaClient, ClearanceStatus, CertificateStatus, UserRole } = pkg;
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Password@1234', 10);

  console.log('Starting seed process...');

  // ─── 1. Faculties ───────────────────────────────────────────────
  await prisma.faculty.createMany({
    data: [
      { faculty_id: 'FAC001', name: 'Faculty of Engineering' },
      { faculty_id: 'FAC002', name: 'Faculty of Science' },
      { faculty_id: 'FAC003', name: 'Faculty of Business' },
      { faculty_id: 'FAC004', name: 'Faculty of Arts & Humanities' },
    ],
    skipDuplicates: true,
  });

  // ─── 2. Departments ─────────────────────────────────────────────
  await prisma.department.createMany({
    data: [
      { department_id: 'DEP001', name: 'Computer Engineering', faculty_id: 'FAC001' },
      { department_id: 'DEP002', name: 'Electrical Engineering', faculty_id: 'FAC001' },
      { department_id: 'DEP003', name: 'Computer Science', faculty_id: 'FAC002' },
      { department_id: 'DEP004', name: 'Mathematics', faculty_id: 'FAC002' },
      { department_id: 'DEP005', name: 'Business Administration', faculty_id: 'FAC003' },
      { department_id: 'DEP006', name: 'Accounting & Finance', faculty_id: 'FAC003' },
      { department_id: 'DEP007', name: 'English & Literary Studies', faculty_id: 'FAC004' },
      { department_id: 'DEP008', name: 'History & International Studies', faculty_id: 'FAC004' },
    ],
    skipDuplicates: true,
  });

  // ─── 3. Programmes ──────────────────────────────────────────────
  await prisma.programme.createMany({
    data: [
      { programme_id: 'PRG001', name: 'BSc Computer Engineering', department_id: 'DEP001' },
      { programme_id: 'PRG002', name: 'MEng Computer Engineering', department_id: 'DEP001' },
      { programme_id: 'PRG003', name: 'BSc Electrical Engineering', department_id: 'DEP002' },
      { programme_id: 'PRG004', name: 'MEng Electrical Engineering', department_id: 'DEP002' },
      { programme_id: 'PRG005', name: 'BSc Computer Science', department_id: 'DEP003' },
      { programme_id: 'PRG006', name: 'MSc Computer Science', department_id: 'DEP003' },
      { programme_id: 'PRG007', name: 'BSc Mathematics', department_id: 'DEP004' },
      { programme_id: 'PRG008', name: 'MSc Mathematics', department_id: 'DEP004' },
      { programme_id: 'PRG009', name: 'BSc Business Administration', department_id: 'DEP005' },
      { programme_id: 'PRG010', name: 'MBA Business Administration', department_id: 'DEP005' },
      { programme_id: 'PRG011', name: 'BSc Accounting & Finance', department_id: 'DEP006' },
      { programme_id: 'PRG012', name: 'MSc Accounting & Finance', department_id: 'DEP006' },
      { programme_id: 'PRG013', name: 'BA English & Literary Studies', department_id: 'DEP007' },
      { programme_id: 'PRG014', name: 'MA English & Literary Studies', department_id: 'DEP007' },
      { programme_id: 'PRG015', name: 'BA History & Intl Studies', department_id: 'DEP008' },
      { programme_id: 'PRG016', name: 'MA History & Intl Studies', department_id: 'DEP008' },
    ],
    skipDuplicates: true,
  });

  // ─── 4. Admin ───────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'seignoucyril@gmail.com' },
    update: {},
    create: {
      email: 'seignoucyril@gmail.com',
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      role: UserRole.admin,
      admin: { create: {} }
    },
  });

  // ─── 5. Students Dataset ─────────────────────────────────────────
  const students = [
    { student_id: 'STU001', first_name: 'Jean-Pierre', last_name: 'Ndoumbe', phone: '+237670123456', nationality: 'Cameroonian', dob: '2000-03-12', programme_id: 'PRG001', entry: 2019, grad: 2023, gpa: 3.75, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU002', first_name: 'Christelle', last_name: 'Kamga', phone: '+237690123456', nationality: 'Cameroonian', dob: '1999-07-22', programme_id: 'PRG003', entry: 2018, grad: 2022, gpa: 3.50, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU003', first_name: 'Emmanuel', last_name: 'Ewane', phone: '+237671234567', nationality: 'Cameroonian', dob: '2001-01-05', programme_id: 'PRG005', entry: 2020, grad: 2024, gpa: 3.90, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU004', first_name: 'Marie-Noelle', last_name: 'Atangana', phone: '+237691234567', nationality: 'Cameroonian', dob: '2000-11-18', programme_id: 'PRG007', entry: 2019, grad: 2023, gpa: 3.20, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU005', first_name: 'Dieudonné', last_name: 'Mbarga', phone: '+237672345678', nationality: 'Cameroonian', dob: '1999-05-30', programme_id: 'PRG009', entry: 2018, grad: 2022, gpa: 3.10, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU006', first_name: 'Sali', last_name: 'Amadou', phone: '+237692345678', nationality: 'Cameroonian', dob: '2001-08-14', programme_id: 'PRG011', entry: 2020, grad: 2024, gpa: 3.65, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU007', first_name: 'Kofi', last_name: 'Asante', phone: '+2334523456789', nationality: 'Ghanaian', dob: '2000-02-27', programme_id: 'PRG013', entry: 2019, grad: 2023, gpa: 3.40, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU008', first_name: 'Blessing', last_name: 'Nwosu', phone: '+2348067890123', nationality: 'Nigerian', dob: '2000-09-03', programme_id: 'PRG015', entry: 2019, grad: 2023, gpa: 3.55, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU009', first_name: 'Samuel', last_name: 'Tchounga', phone: '+237673456789', nationality: 'Cameroonian', dob: '1999-12-10', programme_id: 'PRG001', entry: 2018, grad: 2022, gpa: 2.95, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU010', first_name: 'Abiba', last_name: 'Fofana', phone: '+237693456789', nationality: 'Cameroonian', dob: '2001-04-16', programme_id: 'PRG003', entry: 2020, grad: 2024, gpa: 3.80, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU011', first_name: 'Emery', last_name: 'Ngu', phone: '+237674567890', nationality: 'Cameroonian', dob: '2000-06-21', programme_id: 'PRG005', entry: 2019, grad: 2023, gpa: 2.60, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU012', first_name: 'Akosua', last_name: 'Boateng', phone: '+2334545678901', nationality: 'Ghanaian', dob: '2001-10-08', programme_id: 'PRG007', entry: 2020, grad: 2024, gpa: 2.40, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU013', first_name: 'Francis', last_name: 'Tanyi', phone: '+237694567890', nationality: 'Cameroonian', dob: '1999-03-14', programme_id: 'PRG009', entry: 2018, grad: 2022, gpa: 2.70, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU014', first_name: 'Aminata', last_name: 'Diallo', phone: '+2242256789012', nationality: 'Guinean', dob: '2000-07-29', programme_id: 'PRG011', entry: 2019, grad: 2023, gpa: 2.85, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU015', first_name: 'Blaise', last_name: 'Ebollo', phone: '+237675678901', nationality: 'Cameroonian', dob: '2001-02-11', programme_id: 'PRG013', entry: 2020, grad: 2024, gpa: null, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU016', first_name: 'Efua', last_name: 'Amponsah', phone: '+2334556789012', nationality: 'Ghanaian', dob: '2000-05-07', programme_id: 'PRG015', entry: 2019, grad: 2023, gpa: 2.50, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU017', first_name: 'Serge', last_name: 'Abena', phone: '+237695678901', nationality: 'Cameroonian', dob: '1999-11-25', programme_id: 'PRG003', entry: 2018, grad: 2022, gpa: 2.30, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU018', first_name: 'Mariam', last_name: 'Coulibaly', phone: '+2232267890123', nationality: 'Malian', dob: '2001-09-19', programme_id: 'PRG001', entry: 2020, grad: 2024, gpa: null, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU019', first_name: 'Boris', last_name: 'Teke', phone: '+237676789012', nationality: 'Cameroonian', dob: '2000-01-31', programme_id: 'PRG005', entry: 2019, grad: 2023, gpa: 2.75, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU020', first_name: 'Abena', last_name: 'Owusu', phone: '+2334567890123', nationality: 'Ghanaian', dob: '2001-06-15', programme_id: 'PRG009', entry: 2020, grad: 2024, gpa: 2.90, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU021', first_name: 'Nathalie', last_name: 'Biloa', phone: '+237696789012', nationality: 'Cameroonian', dob: '1997-04-22', programme_id: 'PRG002', entry: 2022, grad: 2024, gpa: 3.85, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU022', first_name: 'Cyrille', last_name: 'Mbi', phone: '+237677890123', nationality: 'Cameroonian', dob: '1996-08-10', programme_id: 'PRG004', entry: 2021, grad: 2023, gpa: 3.70, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU023', first_name: 'Clarisse', last_name: 'Fouda', phone: '+237697890123', nationality: 'Cameroonian', dob: '1997-12-03', programme_id: 'PRG006', entry: 2022, grad: 2024, gpa: 3.95, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU024', first_name: 'Patrick', last_name: 'Suh', phone: '+237678901234', nationality: 'Cameroonian', dob: '1995-05-17', programme_id: 'PRG008', entry: 2021, grad: 2023, gpa: 3.60, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU025', first_name: 'Florette', last_name: 'Etonde', phone: '+237698901234', nationality: 'Cameroonian', dob: '1996-09-28', programme_id: 'PRG010', entry: 2022, grad: 2024, gpa: 3.45, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU026', first_name: 'Hervé', last_name: 'Beti', phone: '+237679012345', nationality: 'Cameroonian', dob: '1997-02-14', programme_id: 'PRG012', entry: 2021, grad: 2023, gpa: 3.75, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU027', first_name: 'Chidi', last_name: 'Okeke', phone: '+2348078901236', nationality: 'Nigerian', dob: '1995-11-06', programme_id: 'PRG014', entry: 2021, grad: 2023, gpa: 3.55, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU028', first_name: 'Yaa', last_name: 'Darko', phone: '+2334501234567', nationality: 'Ghanaian', dob: '1996-07-23', programme_id: 'PRG016', entry: 2022, grad: 2024, gpa: 3.80, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU029', first_name: 'Raissa', last_name: 'Mbu', phone: '+237699012345', nationality: 'Cameroonian', dob: '1997-03-09', programme_id: 'PRG002', entry: 2021, grad: 2023, gpa: 3.65, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU030', first_name: 'Gaston', last_name: 'Bakary', phone: '+237670234567', nationality: 'Cameroonian', dob: '1995-10-31', programme_id: 'PRG006', entry: 2021, grad: 2023, gpa: 3.50, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU031', first_name: 'Viviane', last_name: 'Mbia', phone: '+237690234567', nationality: 'Cameroonian', dob: '1996-06-18', programme_id: 'PRG004', entry: 2022, grad: 2024, gpa: 2.80, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU032', first_name: 'Abiba', last_name: 'Seidu', phone: '+2334523456780', nationality: 'Ghanaian', dob: '1997-01-25', programme_id: 'PRG008', entry: 2021, grad: 2023, gpa: 2.65, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU033', first_name: 'Kevin', last_name: 'Awono', phone: '+237671345678', nationality: 'Cameroonian', dob: '1995-08-12', programme_id: 'PRG010', entry: 2021, grad: 2023, gpa: null, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU034', first_name: 'Esi', last_name: 'Hayford', phone: '+2334534567891', nationality: 'Ghanaian', dob: '1996-04-07', programme_id: 'PRG012', entry: 2022, grad: 2024, gpa: 2.90, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU035', first_name: 'Michel', last_name: 'Yombbi', phone: '+237691345678', nationality: 'Cameroonian', dob: '1997-11-20', programme_id: 'PRG014', entry: 2021, grad: 2023, gpa: 2.70, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU036', first_name: 'Afia', last_name: 'Mensah', phone: '+2334545678902', nationality: 'Ghanaian', dob: '1995-02-28', programme_id: 'PRG016', entry: 2021, grad: 2023, gpa: 2.55, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU037', first_name: 'Oluwaseun', last_name: 'Bello', phone: '+2348034567893', nationality: 'Nigerian', dob: '1996-09-15', programme_id: 'PRG002', entry: 2022, grad: 2024, gpa: null, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU038', first_name: 'Nana', last_name: 'Acheampong', phone: '+2334556789013', nationality: 'Ghanaian', dob: '1997-05-02', programme_id: 'PRG006', entry: 2022, grad: 2024, gpa: 2.45, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU039', first_name: 'Cédric', last_name: 'Mbiapa', phone: '+237672456789', nationality: 'Cameroonian', dob: '1995-12-24', programme_id: 'PRG010', entry: 2022, grad: 2024, gpa: 2.85, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU040', first_name: 'Fiifi', last_name: 'Bonsu', phone: '+2334567890124', nationality: 'Ghanaian', dob: '1996-03-19', programme_id: 'PRG012', entry: 2021, grad: 2023, gpa: 2.60, clearance: ClearanceStatus.Not_Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU041', first_name: 'Colette', last_name: 'Ngono', phone: '+237692456789', nationality: 'Cameroonian', dob: '2000-08-08', programme_id: 'PRG005', entry: 2019, grad: 2023, gpa: 3.30, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
    { student_id: 'STU042', first_name: 'Arnold', last_name: 'Fossuo', phone: '+237673567890', nationality: 'Cameroonian', dob: '1999-04-13', programme_id: 'PRG007', entry: 2018, grad: 2022, gpa: 3.15, clearance: ClearanceStatus.Cleared, cert_status: CertificateStatus.Not_Issued },
  ];

  for (const s of students) {
    const cleanFirst = s.first_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    const cleanLast = s.last_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    const email = `${cleanFirst}.${cleanLast}${s.student_id.slice(-2)}@gmail.com`;

    await prisma.user.upsert({
      where: { email: email },
      update: {},
      create: {
        first_name: s.first_name,
        last_name: s.last_name,
        email: email,
        password: await bcrypt.hash('Student@1234', 10),
        role: UserRole.student,
        student: {
          create: {
            student_id: s.student_id,
            phone_number: s.phone,
            nationality: s.nationality,
            date_of_birth: s.dob ? new Date(s.dob) : null,
            academic_records: {
              create: {
                record_id: `REC-${s.student_id}`,
                programme_id: s.programme_id,
                entry_year: s.entry,
                graduation_year: s.grad,
                final_gpa: s.gpa,
                clearance_status: s.clearance,
                certificate_status: s.cert_status,
              }
            }
          }
        }
      }
    });
  }

  console.log(`Seed completed: ${students.length} students and 1 admin created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });