import {Router} from 'express'
import {verifyById,verifyByPDF} from '../controller/verificationController.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = Router()
router.post('/pdf',upload.single('certificate_pdf'),verifyByPDF)
router.get('/:id',verifyById)

export default router