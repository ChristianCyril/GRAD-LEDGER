import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorise } from "../middleware/authorise.js";
import {
  getPendingOrganisations, getAllOrganisations,
  getOrganisationById, approveOrganisation,
  rejectOrganisation, disableOrganisation,
  enableOrganisation, getAnalytics
} from '../controller/superAdminController.js'

const router = Router()
router.use(authenticate, authorise('SUPER_ADMIN'))

router.get('/organisations/pending',getPendingOrganisations)
router.get('/analytics',authenticate,getAnalytics)
router.get('/organisations',getAllOrganisations)
router.get('/organisations/:id',getOrganisationById)
router.patch('/organisations/:id/approve',approveOrganisation)
router.patch('/organisations/:id/reject',rejectOrganisation)
router.patch('/organisations/:id/disable',disableOrganisation)
router.patch('/organisations/:id/enable',enableOrganisation)

export default router