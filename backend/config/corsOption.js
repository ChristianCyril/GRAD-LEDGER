const whiteList = ['http://localhost:5173','https://grad-ledger.vercel.app'];
const corsOption = {
  origin: (origin,callback)=>{
    if(whiteList.includes(origin) || !origin){
      callback(null,true);
    }else{
      callback(new Error('Not Allowed By cors'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

export default corsOption;