import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorise } from "../middleware/authorise.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {registerOrganisation,updateOrgProfile,getOrgProfile} from '../controller/orgController.js'

const router = Router()

router.post('/register', upload.fields([
  { name: 'doc_incorporation', maxCount: 1 },
  { name: 'doc_letter_of_intent', maxCount: 1 },
  { name: 'doc_accreditation', maxCount: 1 }
]), registerOrganisation)
router.patch('/profile',authenticate,authorise('ORG_SUPER_ADMIN'),updateOrgProfile)
router.get('/profile',authenticate,authorise('ORG_SUPER_ADMIN'),getOrgProfile)

export default router