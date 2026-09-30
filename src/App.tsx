import React, { lazy, Suspense, useState, useEffect } from 'react';
import { ViewMode, SessionUser } from './types';
import { ApiService } from './services/api';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar } from './components/Navbar';
import { TopToolbar } from './components/TopToolbar';
import { CneHomePage } from './components/CneHomePage';
import { scheduleIdlePrefetch } from './services/routePrefetch';

const LoginModal = lazy(() => import('./components/LoginModal').then((m) => ({ default: m.LoginModal })));
const ChangePasswordModal = lazy(() => import('./components/ChangePasswordModal').then((m) => ({ default: m.ChangePasswordModal })));
const ForgotPasswordModal = lazy(() => import('./components/ForgotPasswordModal').then((m) => ({ default: m.ForgotPasswordModal })));
const CNEPostTestModal = lazy(() => import('./components/cne/CNEPostTestModal').then((m) => ({ default: m.CNEPostTestModal })));
const MyCNERecords = lazy(() => import('./components/MyCNERecords').then((m) => ({ default: m.MyCNERecords })));
const CNECalendar = lazy(() => import('./components/CNECalendar').then((m) => ({ default: m.CNECalendar })));
const CNESchedule = lazy(() => import('./components/CNESchedule').then((m) => ({ default: m.CNESchedule })));
const LearningResourcesPage = lazy(() => import('./components/cne/LearningResourcesPage').then((m) => ({ default: m.LearningResourcesPage })));
const Gallery = lazy(() => import('./components/Gallery').then((m) => ({ default: m.Gallery })));
const AdminAreas = lazy(() => import('./components/AdminAreas').then((m) => ({ default: m.AdminAreas })));
const AdminRoles = lazy(() => import('./components/AdminRoles').then((m) => ({ default: m.AdminRoles })));
const AdminReports = lazy(() => import('./components/AdminReports').then((m) => ({ default: m.AdminReports })));
const AdminContent = lazy(() => import('./components/AdminContent').then((m) => ({ default: m.AdminContent })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[220px] flex items-center justify-center text-sm font-medium text-slate-500">
    Loading…
  </div>
);

const AppContent: React.FC = () => {
  const [user, setUser] = useState<SessionUser | null>(() => ApiService.getSessionUser());
  const [activeView, setActiveView] = useState<ViewMode>('dashboard');

  // Root-level QR Post-Test Deep-Link State
  const [rootQrToken, setRootQrToken] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('postTest');
      return token && token.trim() ? token.trim() : null;
    } catch (e) {
      return null;
    }
  });

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const { success, info } = useToast();

  useEffect(() => {
    return scheduleIdlePrefetch(Boolean(user && user.employeeId));
  }, [user?.employeeId]);

  const handleCloseRootQrPostTest = () => {
    setRootQrToken(null);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('postTest')) {
        url.searchParams.delete('postTest');
        const newSearch = url.searchParams.toString();
        const newUrl = url.pathname + (newSearch ? `?${newSearch}` : '') + url.hash;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (e) {}
  };

  const handleLoginSuccess = (loggedInUser: SessionUser) => {
    setUser(loggedInUser);
    setIsLoginOpen(false);
    success(`Welcome, ${loggedInUser.name}`, 'Authentication Successful');
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setIsLoginOpen(false);
    setActiveView('dashboard');
    info('You have been signed out.', 'Session Ended');
  };

  const handleNavigate = (view: ViewMode) => {
    // If not logged in and attempting to access staff/admin protected views, prompt login
    if (!user || !user.employeeId) {
      if (['my-cne-records', 'admin-areas', 'admin-roles', 'admin-content', 'admin-reports'].includes(view)) {
        info('Please log in with your Employee ID to access this section.', 'Authentication Required');
        setIsLoginOpen(true);
        return;
      }
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Fixed Navigation Bar */}
      <Navbar
        user={user}
        onOpenLogin={() => setIsLoginOpen(true)}
        onChangePasswordClick={() => setIsChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      {/* Persistent Static Top Toolbar for Primary Navigation (Authenticated Users Only) */}
      {user && user.employeeId && (
        <TopToolbar
          user={user}
          activeView={activeView}
          onSelectView={handleNavigate}
        />
      )}

      <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Main Content Area */}
        <main className="w-full">
          <Suspense fallback={<PageLoadingFallback />}>
          {(!user || !user.employeeId || activeView === 'dashboard') && (
            <CneHomePage
              user={user}
              onNavigate={handleNavigate}
            />
          )}

          {user && user.employeeId && activeView === 'my-cne-records' && (
            <MyCNERecords user={user} />
          )}

          {user && user.employeeId && activeView === 'calendar' && <CNECalendar />}

          {user && user.employeeId && activeView === 'cne-schedule' && (
            <CNESchedule user={user} />
          )}

          {user && user.employeeId && activeView === 'learning-resources' && (
            <LearningResourcesPage user={user} />
          )}

          {user && user.employeeId && activeView === 'gallery' && <Gallery user={user} />}

          {/* Admin Protected Views */}
          {activeView === 'admin-areas' && user?.role === 'ADMIN' && (
            <AdminAreas user={user} />
          )}

          {activeView === 'admin-roles' && user?.role === 'ADMIN' && (
            <AdminRoles user={user} />
          )}

          {activeView === 'admin-content' && user?.role === 'ADMIN' && (
            <AdminContent user={user} />
          )}

          {activeView === 'admin-reports' && user?.role === 'ADMIN' && (
            <AdminReports user={user} />
          )}
          </Suspense>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Nursing Informatics | Nursing Services | AIIMS Rishikesh</span>
          <span>Clinical Nursing Education (CNE) Portal</span>
        </div>
      </footer>

      {/* Global Modals */}
      <Suspense fallback={null}>
      {isLoginOpen && (
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          onOpenForgotPassword={() => {
            setIsLoginOpen(false);
            setIsForgotPasswordOpen(true);
          }}
        />
      )}

      {isChangePasswordOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          forced={false}
          onClose={() => setIsChangePasswordOpen(false)}
          user={user}
          onPasswordChanged={(updatedUser) => {
            if (updatedUser) {
              setUser(updatedUser);
            } else {
              const stored = ApiService.getSessionUser();
              if (stored) {
                setUser(stored);
              }
            }
            setIsChangePasswordOpen(false);
          }}
        />
      )}

      {isForgotPasswordOpen && (
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
          onBackToLogin={() => {
            setIsForgotPasswordOpen(false);
            setIsLoginOpen(true);
          }}
        />
      )}

      {/* Root-Level QR Post-Test Deep-Link Modal */}
      {rootQrToken && (
        <CNEPostTestModal
          qrToken={rootQrToken}
          user={user}
          onClose={handleCloseRootQrPostTest}
        />
      )}
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
