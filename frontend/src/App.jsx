import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectPage from './pages/ProjectPage';
import AdsReport from './pages/AdsReport';
import AdminPanel from './pages/AdminPanel';
import MarketingManagement from './pages/MarketingManagement';
import MarketingDashboard from './pages/MarketingDashboard';
import AdminRolePanel from './pages/AdminRolePanel';

// Components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false, marketingOnly = false }) => {
  const { user, loading, isAdmin, hasMarketingAccess } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (marketingOnly && !hasMarketingAccess) {
    return <Navigate to="/projects" replace />;
  }

  return children;
};

// Default redirect based on user role
const DefaultRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  if (user.role === 'marketing') {
    return <Navigate to="/marketing-dashboard" replace />;
  }

  // Normal users and admins go to projects
  return <Navigate to="/projects" replace />;
};

// Public Route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DefaultRedirect />} />
        <Route path="projects" element={<Projects />} />
        <Route path="project/:projectId" element={<ProjectPage />} />
        <Route path="project/:projectId/ads" element={<AdsReport />} />
        <Route path="marketing-dashboard" element={
          <ProtectedRoute marketingOnly>
            <MarketingDashboard />
          </ProtectedRoute>
        } />
        <Route path="marketing" element={
          <ProtectedRoute marketingOnly>
            <MarketingManagement />
          </ProtectedRoute>
        } />
        <Route path="admin" element={
          <ProtectedRoute adminOnly>
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="admin-panel" element={
          <ProtectedRoute adminOnly>
            <AdminRolePanel />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

