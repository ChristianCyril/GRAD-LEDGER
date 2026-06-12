import { useEffect } from "react";
import { apiPrivate, api } from "../api/axios";
import { useAuth } from "../hooks/useAuth";

let refreshPromise = null;

const requestNewAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = api
      .get("/api/auth/refresh")
      .then((res) => res.data.data)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const useApiPrivate = () => {
  const { auth, setAuth } = useAuth();

  useEffect(() => {
    const requestIntercept = apiPrivate.interceptors.request.use(
      (config) => {
        if (!config.headers["Authorization"] && auth?.accessToken) {
          config.headers["Authorization"] = `Bearer ${auth.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = apiPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error?.config;

        if (error?.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const { accessToken, user } = await requestNewAccessToken();

            setAuth((prev) => ({
              ...prev,
              accessToken,
              user: user ?? prev.user,
            }));

            originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
            return apiPrivate(originalRequest);
          } catch (refreshError) {
            setAuth({});
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      apiPrivate.interceptors.request.eject(requestIntercept);
      apiPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [auth?.accessToken, setAuth]);

  return apiPrivate;
};

export default useApiPrivate;