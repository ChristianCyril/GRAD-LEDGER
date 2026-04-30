import prisma from "../config/prisma.js";

const handleSearchStudent = async (req, res) => {
  if (!req.query.search.trim()) return res.sendStatus(400)
  const query = req.query.search.trim()
  try {
    const students = await prisma.student.findMany({
      where: {
        AND: [
          {
            OR: [
              { user: { first_name: { contains: query, mode: 'insensitive' } } },
              { user: { last_name: { contains: query, mode: 'insensitive' } } },
              { student_id: { contains: query, mode: 'insensitive' } }
            ]
          },
          {
            academic_records: {
              some: { clearance_status: 'Cleared' }
            }
          }
        ]
      },
      include: {
        user: true, // Necessary to see the names in the result
        academic_records: {
          where: { clearance_status: 'Cleared' },
          include: {
            programme: true // Optional: adds programme details to the records
          }
        }
      }
    });
 
    if(students.length === 0) return res.status(200).json({message:"No students found matching criteria"})
    
    return res.status(200).json(students)

  } catch (error) {
    console.error(error);
  }
}
export default handleSearchStudent