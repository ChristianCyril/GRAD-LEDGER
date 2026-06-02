import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOption from './config/corsOption.js'
import authRoutes from './routes/authRoutes.js'
import orgRoutes from './routes/orgRoutes.js'
import superAdminRoutes from './routes/superAdminRoutes.js'
import orgSuperAdminRoutes from './routes/orgSuperAdminRoutes.js'
import certificateRoutes from './routes/certificateRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import verificationRoutes from './routes/verificationRoute.js'
import studentRoutes from './routes/studentRoutes.js'


const app = express();
const PORT = process.env.PORT

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());

//routes
app.use('/api/auth',authRoutes)
app.use('/api/organisations',orgRoutes)
app.use('/api/super-admin',superAdminRoutes)
app.use('/api/org-super-admin',orgSuperAdminRoutes)
app.use('/api/certificates',certificateRoutes)
app.use('/api/audit',auditRoutes)
app.use('/api/verify',verificationRoutes)
app.use('/api/students',studentRoutes)

app.listen(PORT,()=>{
  console.log(`GRAD-LEDGER Server running on pot ${PORT}`)
})