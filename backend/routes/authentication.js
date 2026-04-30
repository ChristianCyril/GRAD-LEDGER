import express from 'express';
import handleAuthentication from '../controller/authenticationController.js';

const router = express.Router()
router.post('/',handleAuthentication);

export default router