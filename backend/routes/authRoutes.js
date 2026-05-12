import { Router } from 'express'
import {
  loginSuperAdmin, loginOrgUser, logout, refreshAccessToken,
  forgotPassword, resetPassword, changePassword
} from '../controller/authController.js'
import {authenticate} from '../middleware/authenticate.js'

const router = Router();

router.post('/super-admin/login', loginSuperAdmin);
router.post('/org/login',         loginOrgUser);
router.get('/refresh',           refreshAccessToken);
router.get('/logout',            logout);
router.post('/forgot-password',   forgotPassword);
router.post('/reset-password',    resetPassword);
router.post('/change-password',   authenticate, changePassword);

export default router;