import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorise } from "../middleware/authorise.js";
import { createAdmin, getAdmins, enableAdmin, disableAdmin } from '../controller/orgSuperAdminController.js'

const router = Router()
router.use(authenticate, authorise('ORG_SUPER_ADMIN'))

router.route('/')
  .post(createAdmin)
  .get(getAdmins)

router.patch('/:id/enable', enableAdmin)
router.patch('/:id/disable', disableAdmin)

export default router