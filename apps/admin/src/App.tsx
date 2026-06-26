import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/contexts/AuthContext';
import { ToastProvider } from '@shared/components/Toast';
import ProtectedRoute from '@shared/components/ProtectedRoute';
import PublicRoute from '@shared/components/PublicRoute';
import Layout from './components/Layout';
import LoginPage from '@shared/pages/auth/LoginPage';
import RegisterPage from '@shared/pages/auth/RegisterPage';
import ForgotPasswordPage from '@shared/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@shared/pages/auth/ResetPasswordPage';
import DashboardPage from '@shared/pages/dashboard/DashboardPage';
import OrganizationsPage from '@shared/pages/organizations/OrganizationsPage';
import OrganizationDetailPage from '@shared/pages/organizations/OrganizationDetailPage';
import UsersPage from '@shared/pages/users/UsersPage';
import RolesPage from '@shared/pages/roles/RolesPage';
import SubscriptionsPage from '@shared/pages/subscriptions/SubscriptionsPage';
import PlansPage from '@shared/pages/plans/PlansPage';
import UsagePage from '@shared/pages/usage/UsagePage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/usage" element={<UsagePage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
