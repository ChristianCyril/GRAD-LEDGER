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

app.listen(PORT,()=>{
  console.log(`GRAD-LEDGER Server running on pot ${PORT}`)
})