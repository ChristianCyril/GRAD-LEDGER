import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { api } from '../api/axios'
import {useAuth} from '../hooks/useAuth'
import { useState } from 'react';


function PersistLogin() {
  const { auth, setAuth, } = useAuth();
  const [isloading, setIsLoading] = useState(!auth.user)
  useEffect(() => {
    const refreshAccessToken = async () => {
      try {
        const response = await api.get('/api/auth/refresh');
        setAuth(response.data.data);
      } catch (error) {
        console.log(error);   // Refresh token invalid or expired -- leave auth empty
        // ProtectedRoute will redirect to login
      }finally{
        setIsLoading(false)
      }
    }
    if(!auth.accessToken) refreshAccessToken();
  }, []);


  return isloading ? null : <Outlet />;
}

export default PersistLogin;