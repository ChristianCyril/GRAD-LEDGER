import express from 'express'
import handleSearchStudent from '../controller/adminController.js'
import verifyRole from '../middleware/verifyRole.js'

const router = express.Router()

router.get('/',verifyRole('admin'),handleSearchStudent)

export default router;