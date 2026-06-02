import {Router} from 'express'
import { authenticate } from '../middleware/authenticate.js';
import { authorise } from '../middleware/authorise.js';
import { searchStudents } from '../controller/studentController.js';

const router = Router()
router.use(authenticate, authorise('ORG_SUPER_ADMIN','ORG_ADMIN'))

router.get('/search',searchStudents)
export default router 