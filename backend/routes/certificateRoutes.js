import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorise } from '../middleware/authorise.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  issueCertificate,
  retryCertificate,
  resendCertificateEmail,
  getOrgCertificates,
  getCertificateById,
  revokeCertificate,
  unrevokeCertificate
} from '../controller/certificateController.js';

const router = Router();

// All certificate routes require authentication and one of the two org roles
router.use(authenticate, authorise('ORG_SUPER_ADMIN', 'ORG_ADMIN'));

router.post('/', upload.single('certificate_pdf'), issueCertificate);
router.get('/', getOrgCertificates);
router.get('/:id', getCertificateById);
router.post('/:id/retry', retryCertificate);
router.post('/:id/resend-email', resendCertificateEmail);
router.post('/:id/revoke', revokeCertificate);
router.post('/:id/unrevoke',unrevokeCertificate);

export default router;