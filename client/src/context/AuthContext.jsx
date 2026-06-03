import { createContext, useState } from "react";
import { api } from "../api/axios";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({});
  const navigate = useNavigate()

  const logout = async () => {
    try {
      await api.get('/api/auth/logout')
      const currentRole = auth.user?.role
      if (currentRole === 'SUPER_ADMIN') {
        navigate('/super-admin-login')
      } else {
        navigate('/org-login')
      }
      setAuth({ user: { role: currentRole } })
    } catch (error) {
      console.log(error)
      const currentRole = auth.user?.role
      setAuth({ user: { role: currentRole } })
    }
  }

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;