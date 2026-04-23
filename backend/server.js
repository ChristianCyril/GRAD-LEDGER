import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOption from './config/corsOption.js'

const app = express();
const PORT = process.env.PORT

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());

app.listen(PORT,()=>{
  console.log(`Server running on pot ${PORT}`)
})