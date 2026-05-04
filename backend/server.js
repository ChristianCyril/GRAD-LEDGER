import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOption from './config/corsOption.js'
import authRoutes from './routes/authRoutes.js'


const app = express();
const PORT = process.env.PORT

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());

//routes
app.use('/api/auth',authRoutes)

app.listen(PORT,()=>{
  console.log(`GRAD-LEDGER Server running on pot ${PORT}`)
})