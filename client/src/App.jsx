import { Route, Routes } from "react-router-dom";
import OrgLogin from "./pages/org/general/OrgLogin";
import ForgotPassword from "./pages/org/general/ForgotPassword";
import ResetPassword from "./pages/org/general/ResetPassword";
import DashboardOrgAdmin from "./pages/org/orgAdmin/DashboardOrgAdmin";
import DashboardOrgSuper from "./pages/org/orgSuperAdmin/DashboardOrgSuper";
import PersistLogin from "./components/PersistLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import SuperAdminLogin from "./pages/superAdmin/SuperAdminLogin";
import SuperAdminDashboard from "./pages/superAdmin/SuperAdminDashboard";

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<HomePage />} />
      <Route path='/org-login' element={<OrgLogin />} />
      <Route path='/super-admin-login' element={<SuperAdminLogin />} />
      <Route path='/forgot-password' element={<ForgotPassword />} />
      <Route path='/reset-password' element={<ResetPassword />} />

      <Route element={<PersistLogin />}>
        <Route element={<ProtectedRoute roles={['ORG_SUPER_ADMIN']} />}>
          <Route path='/org-super-admin/dashboard' element={<DashboardOrgSuper />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ORG_ADMIN']} />}>
          <Route path='/org-admin/dashboard' element={<DashboardOrgAdmin />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ORG_SUPER_ADMIN', 'ORG_ADMIN']} />}>
        </Route>

        <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
          <Route path='/super-admin/dashboard' element={<SuperAdminDashboard />}/>
        </Route>
      </Route>
    </Routes>
  );
}
