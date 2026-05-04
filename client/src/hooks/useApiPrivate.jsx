import { useEffect } from "react";
import { apiPrivate,api } from "../api/axios";
import useAuth from "./useAuth";
//import { useNavigate } from "react-router-dom";

const useApiPrivate = () => {
 //const navigate = useNavigate();
  const { auth, setAuth } = useAuth();
  useEffect(() => {
    //request interceptor which atatches access token and role to every request
    const requestIntercept = apiPrivate.interceptors.request.use(
      (config) => {
        if (!config.headers['Authorization'] ) {
          config.headers['Authorization'] = `Bearer ${auth?.accessToken}` // if it exist acces it. if it does not return undefined without crashing app
        }
        return config
      },
      (error) => {
        return Promise.reject(error);  //sends error to the nearest error in try catch
      }
    );

    //respose interceptor
    const responseIntercept = apiPrivate.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        const originalRequest = error?.config
        if (error?.response?.status === 401 && !originalRequest?._retry) { //_retry currently undefined since it has not been set
          originalRequest._retry = true
          try {
            const response = await api.get('/api/auth/refresh')
            const newAccessToken = response.data.accessToken
            setAuth((prev) => ({ ...prev, accessToken: newAccessToken }));
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return apiPrivate(originalRequest);
          } catch (refreshError) {
            setAuth({});
           // navigate('/login');
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    // Without this duplicate interceptors stack up
    return () => {
      apiPrivate.interceptors.request.eject(requestIntercept);
      apiPrivate.interceptors.response.eject(responseIntercept);
    }

  }, [auth,setAuth]);

  return apiPrivate;
}

export default useApiPrivate;