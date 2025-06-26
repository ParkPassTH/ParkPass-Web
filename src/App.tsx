import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function RootRedirect() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (isInStandaloneMode()) {
      // ถ้าเป็น PWA
      if (!user) {
        navigate('/login', { replace: true });
      } else if (profile?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (profile?.role === 'owner') {
        navigate('/owner', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } else {
      // ถ้าเข้าเว็บปกติ
      if (!user) {
        navigate('/landing', { replace: true });
      } else if (profile?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (profile?.role === 'owner') {
        navigate('/owner', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [navigate, user, profile]);

  return null;
}

// User Pages
import { HomePage } from './pages/user/HomePage';
import { ParkingSpotDetail } from './pages/user/ParkingSpotDetail';
import { BookingPage } from './pages/user/BookingPage';
import { BookingsPage } from './pages/user/BookingsPage';
import { ProfilePage } from './pages/ProfilePage';

// Owner Pages
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { AddParkingSpot } from './pages/owner/AddParkingSpot';
import { EditParkingSpot } from './pages/owner/EditParkingSpot';
import { ManageAvailability } from './pages/owner/ManageAvailability';

// Admin Pages
import AdminDashboard  from './pages/admin/AdminDashboard';
import { OwnersVerify } from './pages/admin/OwnersVerify';

import { LoginPage } from './pages/LoginPage';

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: 'user' | 'owner' | 'admin';
}> = ({ children, requiredRole }) => {
  const { t } = useLanguage();
  const { user, profile, loading } = useAuth();

    useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (loading) {
      timer = setTimeout(() => {
        // เลือกอย่างใดอย่างหนึ่ง
        // window.location.reload(); // ถ้าอยาก reload อัตโนมัติ
        localStorage.clear();
        window.location.href = '/login'; // force logout อัตโนมัติ
      }, 1000); // 2 วินาที
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading]);

  if (loading) return <div>{t('loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <div>Profile not found</div>;

  // ถ้า owner ยังไม่ได้รับอนุมัติ ไม่ให้เข้า owner/*
  if (
    requiredRole === 'owner' &&
    profile.role === 'owner' &&
    (profile as any).verify_status !== 'approved'
  ) {
    return (
      <div className="p-6 text-center text-red-600 font-bold">
        Your owner account is pending admin approval. You cannot access this page yet.
      </div>
    );
    // หรือจะ redirect ไปหน้าอื่นก็ได้ เช่น <Navigate to="/" replace />
  }

  // admin เข้าทุกหน้าได้, owner เข้า owner/user, user เข้า user
  if (requiredRole && profile.role !== requiredRole && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/landing';

  return (
    <AuthProvider>

        {!hideNavbar && <Navbar />}
        <div className={hideNavbar ? '' : 'pt-16'}>
          <Routes>
            {/* เพิ่ม Route สำหรับ landing และ root */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/landing" element={<LandingPage />} />

            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* User */}
            <Route path="/home" element={
              <ProtectedRoute requiredRole="user">
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/spot/:id" element={<ParkingSpotDetail />} />
            <Route path="/book/:id" element={
              <ProtectedRoute requiredRole="user">
                <BookingPage />
              </ProtectedRoute>
            } />
            <Route path="/bookings" element={
              <ProtectedRoute requiredRole="user">
                <BookingsPage />
              </ProtectedRoute>
            } />

            {/* Owner */}
            <Route path="/owner" element={
              <ProtectedRoute requiredRole="owner">
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/owner/add-spot" element={
              <ProtectedRoute requiredRole="owner">
                <AddParkingSpot />
              </ProtectedRoute>
            } />
            <Route path="/owner/edit-spot/:id" element={
              <ProtectedRoute requiredRole="owner">
                <EditParkingSpot />
              </ProtectedRoute>
            } />
            <Route path="/owner/availability/:id" element={<ManageAvailability />} />

            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/owners-verify" element={
              <ProtectedRoute requiredRole="admin">
                <OwnersVerify />
              </ProtectedRoute>
            } />
          </Routes>
        </div>

    </AuthProvider>
  );
}

export default App;