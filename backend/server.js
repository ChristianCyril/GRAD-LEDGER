import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOption from './config/corsOption.js'
import verifyJWT from './middleware/verifyJWT.js';
//routes
import authentication from './routes/authentication.js'
import logout from './routes/logout.js'
import admin from './routes/admin.js'

const app = express();
const PORT = process.env.PORT

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());

//public routes
app.use('/login',authentication)
app.use('/logout', logout)

app.use(verifyJWT);
//private routes
app.use('/admin/student',admin)

app.listen(PORT,()=>{
  console.log(`Server running on pot ${PORT}`)
})