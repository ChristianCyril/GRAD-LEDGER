import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorise } from "../middleware/authorise.js";
import {registerOrganisation,updateOrgProfile} from '../controller/orgController.js'

const router = Router()

router.post('/register',registerOrganisation)
router.patch('/profile',authenticate,authorise('ORG_SUPER_ADMIN'),updateOrgProfile)

export default router