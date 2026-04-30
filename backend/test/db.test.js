import prisma from "../config/prisma.js"
import { PrismaClient } from "@prisma/client"

afterAll(async () => {
  await prisma.$disconnect()
})

// ─── Test 1: successful connection ──────────────────────────────
describe('Prisma Client Connection', () => {
  it('should connect successfully to certificate_test database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow()
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined()
  })

  // ─── Test 2: wrong credentials ────────────────────────────────
  it('should throw a clear error when credentials are wrong', async () => {
    const badPrisma = new PrismaClient({
      datasources: {
        db: { url: 'postgresql://wronguser:wrongpassword@localhost:5432/certificate_test' }
      }
    })

    await expect(async () => {
      await badPrisma.$connect()
      await badPrisma.$queryRaw`SELECT 1`
    }).rejects.toThrow()

    await badPrisma.$disconnect()
  })

  // ─── Test 3: seeded students are returned ─────────────────────
  it('should return seeded student records from prisma.student.findMany()', async () => {
    const students = await prisma.student.findMany({include: { user: true }})

    expect(Array.isArray(students)).toBe(true)
    expect(students.length).toBeGreaterThan(0)

    students.forEach(student => {
      expect(student.student_id).toBeDefined()
      expect(student.user.first_name).toBeDefined()
      expect(student.user.last_name).toBeDefined()
    })
  })

  // ─── Test 4: every academic record has a valid student ────────
  it('should return academic records where every student_id exists in the students table', async () => {
    const [academicRecords, students] = await Promise.all([
      prisma.academicRecord.findMany(),
      prisma.student.findMany({ select: { user_id : true } })
    ])

    expect(academicRecords.length).toBeGreaterThan(0)

    const studentIds = new Set(students.map(s => s.user_id ))

    academicRecords.forEach(record => {
      expect(studentIds.has(record.student_user_id)).toBe(true)
    })
  })
})