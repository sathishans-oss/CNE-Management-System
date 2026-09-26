import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { ViewMode, SessionUser } from './types';
import { ApiService } from './services/api';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar } from './components/Navbar';
import { TopToolbar } from './components/TopToolbar';
import { CneHomePage } from './components/CneHomePage';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { CNEPostTestModal } from './components/cne/CNEPostTestModal';
import { MyCNERecords } from './components/MyCNERecords';
import { CNECalendar } from './components/CNECalendar';
import { CNESchedule } from './components/CNESchedule';
import { LearningResourcesPage } from './components/cne/LearningResourcesPage';
import { Gallery } from './components/Gallery';
import { AdminAreas } from './components/AdminAreas';
import { AdminRoles } from './components/AdminRoles';
import { AdminReports } from './components/AdminReports';
import { AdminContent } from './components/AdminContent';

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

  // Forced password change mode flag (first login or reset requiring password setup)
  const isForcedPasswordChange = Boolean(user && (user.mustChangePassword || user.isFirstLogin));

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const { success, info } = useToast();

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
    if (loggedInUser.mustChangePassword || loggedInUser.isFirstLogin) {
      setIsChangePasswordOpen(true);
    } else {
      success(`Welcome, ${loggedInUser.name}`, 'Authentication Successful');
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setIsLoginOpen(false);
    setActiveView('dashboard');
    info('You have been signed out.', 'Session Ended');
  };

  const handleNavigate = (view: ViewMode) => {
    if (isForcedPasswordChange) {
      info('Please set your personal password before continuing to the CNE Portal.', 'Password Setup Required');
      return;
    }
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
      {user && user.employeeId && !isForcedPasswordChange && (
        <TopToolbar
          user={user}
          activeView={activeView}
          onSelectView={handleNavigate}
        />
      )}

      <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Main Content Area */}
        <main className="w-full">
          {isForcedPasswordChange ? (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-amber-200 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Personal Password Setup Required</h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                You must set your personal password before continuing to the CNE Portal.
              </p>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Set Personal Password
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Nursing Informatics | Nursing Services | AIIMS Rishikesh</span>
          <span>Continuing Nursing Education (CNE) Portal</span>
        </div>
      </footer>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onOpenForgotPassword={() => {
          setIsLoginOpen(false);
          setIsForgotPasswordOpen(true);
        }}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen || isForcedPasswordChange}
        forced={isForcedPasswordChange}
        onClose={() => {
          if (!isForcedPasswordChange) {
            setIsChangePasswordOpen(false);
          }
        }}
        user={user}
        onPasswordChanged={(updatedUser) => {
          if (updatedUser) {
            setUser(updatedUser);
          } else {
            const stored = ApiService.getSessionUser();
            if (stored) {
              const fresh = { ...stored, mustChangePassword: false, isFirstLogin: false };
              ApiService.saveSessionUser(fresh);
              setUser(fresh);
            }
          }
          setIsChangePasswordOpen(false);
        }}
      />

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onBackToLogin={() => {
          setIsForgotPasswordOpen(false);
          setIsLoginOpen(true);
        }}
      />

      {/* Root-Level QR Post-Test Deep-Link Modal */}
      {rootQrToken && (
        <CNEPostTestModal
          qrToken={rootQrToken}
          user={user}
          onClose={handleCloseRootQrPostTest}
        />
      )}
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
