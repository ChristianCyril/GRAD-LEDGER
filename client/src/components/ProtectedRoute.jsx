import { Navigate ,Outlet} from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ roles}) {
  const { auth} = useAuth();
  const user = auth.user
  const token = auth.accessToken

  if (!user || !token) {
    return <Navigate to={getLoginPath(user?.role)} replace />;
  }

  if (!roles.includes(user?.role)) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return <Outlet/>;
}

const getDashboardPath = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':     return '/super-admin/dashboard';
    case 'ORG_SUPER_ADMIN': return '/org-super-admin/dashboard';
    case 'ORG_ADMIN':       return '/org-admin/dashboard';
    default:                return '/';
  }
};

const getLoginPath = (role) => {
  switch (role) {
    case 'SUPER_ADMIN': return '/super-admin-login';
    default:            return '/org-login';
  }
};