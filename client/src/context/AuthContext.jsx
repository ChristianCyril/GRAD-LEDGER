import { createContext,useState } from "react";
import { api } from "../api/axios";
//import { useNavigate } from "react-router-dom";
const AuthContext = createContext({});

export const AuthProvider = ({children})=>{
  const [auth, setAuth] = useState({});
  //const navigate = useNavigate();
  
  const logout = async ()=>{
    try{
      //navigate('/login')
      await api.get('/logout')
       setAuth({});
    }catch(error){
      console.log(error)
    }  
  }

  return(
    <AuthContext.Provider value={{auth,setAuth,logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;