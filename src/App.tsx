import React, { lazy, Suspense, useState, useEffect } from 'react';
import { ViewMode, SessionUser } from './types';
import { ApiService } from './services/api';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar } from './components/Navbar';
import { TopToolbar } from './components/TopToolbar';
import { CneHomePage } from './components/CneHomePage';
import { scheduleIdlePrefetch } from './services/routePrefetch';
import { ADMIN_VIEWS, readViewFromUrl, writeViewToUrl } from './services/viewNavigation';
import type { CalendarViewState } from './components/CNECalendar';

const LoginModal = lazy(() => import('./components/LoginModal').then((m) => ({ default: m.LoginModal })));
const ChangePasswordModal = lazy(() => import('./components/ChangePasswordModal').then((m) => ({ default: m.ChangePasswordModal })));
const ForgotPasswordModal = lazy(() => import('./components/ForgotPasswordModal').then((m) => ({ default: m.ForgotPasswordModal })));
const CNEPostTestModal = lazy(() => import('./components/cne/CNEPostTestModal').then((m) => ({ default: m.CNEPostTestModal })));
const MyCNERecords = lazy(() => import('./components/MyCNERecords').then((m) => ({ default: m.MyCNERecords })));
const CNECalendar = lazy(() => import('./components/CNECalendar').then((m) => ({ default: m.CNECalendar })));
const CNESchedule = lazy(() => import('./components/CNESchedule').then((m) => ({ default: m.CNESchedule })));
const LearningResourcesPage = lazy(() => import('./components/cne/LearningResourcesPage').then((m) => ({ default: m.LearningResourcesPage })));
const Gallery = lazy(() => import('./components/Gallery').then((m) => ({ default: m.Gallery })));
const QuizPage = lazy(() => import('./components/QuizPage').then((m) => ({ default: m.QuizPage })));
const AdminRoles = lazy(() => import('./components/AdminRoles').then((m) => ({ default: m.AdminRoles })));
const AdminReports = lazy(() => import('./components/AdminReports').then((m) => ({ default: m.AdminReports })));
const AdminContent = lazy(() => import('./components/AdminContent').then((m) => ({ default: m.AdminContent })));
const AdminWardLevelCneOutcome = lazy(() => import('./components/AdminWardLevelCneOutcome').then((m) => ({ default: m.AdminWardLevelCneOutcome })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[220px] flex items-center justify-center text-sm font-medium text-slate-500">
    Loading…
  </div>
);

const AppContent: React.FC = () => {
  const [user, setUser] = useState<SessionUser | null>(() => ApiService.getSessionUser());
  const [activeView, setActiveView] = useState<ViewMode>(readViewFromUrl);
  const [calendarReturnState, setCalendarReturnState] = useState<CalendarViewState | null>(null);
  const [requestedFullCneId, setRequestedFullCneId] = useState<string | null>(null);

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
  // A guest's requested page is resumed only after a successful login.
  const [pendingGuestView, setPendingGuestView] = useState<ViewMode | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const { success, info } = useToast();

  useEffect(() => {
    return scheduleIdlePrefetch(Boolean(user && user.employeeId));
  }, [user?.employeeId]);


  // Restore public route names across refresh and browser Back/Forward. QR tokens
  // remain in the query string and are not touched by route navigation.
  useEffect(() => {
    const handleLocationChange = () => {
      const next = readViewFromUrl();
      if (ADMIN_VIEWS.includes(next) && user?.employeeId && user.role !== 'ADMIN') {
        info('This section requires administrator access.', 'Access Restricted');
        writeViewToUrl('dashboard', true);
        setActiveView('dashboard');
        return;
      }
      setRequestedFullCneId(null);
      setActiveView(next);
      if (!user?.employeeId && next !== 'dashboard' && !rootQrToken) {
        setPendingGuestView(next);
        setIsLoginOpen(true);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [user?.employeeId, user?.role, rootQrToken, info]);

  // Deep links into staff pages require login; public QR post-tests are allowed.
  useEffect(() => {
    if (!user?.employeeId && activeView !== 'dashboard' && !rootQrToken) {
      setPendingGuestView(activeView);
      setIsLoginOpen(true);
    }
  }, []);

  // Reject a directly pasted admin URL if the restored session is non-admin.
  useEffect(() => {
    if (user?.employeeId && user.role !== 'ADMIN' && ADMIN_VIEWS.includes(activeView)) {
      setActiveView('dashboard');
      writeViewToUrl('dashboard', true);
      info('This page requires administrator access.', 'Access Restricted');
    }
  }, [user?.employeeId, user?.role]);

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
    // Resume any authenticated staff page, but never grant unauthorized admin pages.
    if (pendingGuestView) {
      const permitted = !ADMIN_VIEWS.includes(pendingGuestView) || loggedInUser.role === 'ADMIN';
      const destination = permitted ? pendingGuestView : 'dashboard';
      setActiveView(destination);
      writeViewToUrl(destination, true);
      setRequestedFullCneId(null);
      setCalendarReturnState(null);
      if (!permitted) info('Administrator access is required for that page.', 'Access Restricted');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setPendingGuestView(null);
    success(`Welcome, ${loggedInUser.name}`, 'Authentication Successful');
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setIsLoginOpen(false);
    setPendingGuestView(null);
    setActiveView('dashboard');
    writeViewToUrl('dashboard', true);
    setRequestedFullCneId(null);
    setCalendarReturnState(null);
    info('You have been signed out.', 'Session Ended');
  };

  const handleNavigate = (view: ViewMode) => {
    const destination = view === 'home' ? 'dashboard' : view;
    if (!user?.employeeId && destination !== 'dashboard') {
      // Every staff-only Quick Link, not just Calendar and Schedule, can be resumed.
      setPendingGuestView(destination);
      info(destination === 'calendar'
        ? 'Please log in with your Employee ID to view the full CNE Calendar and session details.'
        : destination === 'cne-schedule'
        ? 'Please log in with your Employee ID to view the complete CNE Schedule and session details.'
        : 'Please log in with your Employee ID to access this section.', 'Login Required');
      setIsLoginOpen(true);
      return;
    }
    if (ADMIN_VIEWS.includes(destination) && user?.role !== 'ADMIN') {
      info('Only the administrator can access this section.', 'Access Restricted');
      return;
    }
    setPendingGuestView(null);
    setRequestedFullCneId(null);
    setCalendarReturnState(null);
    setActiveView(destination);
    writeViewToUrl(destination);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openFullCneDetailsFromCalendar = (cneId: string, context: CalendarViewState) => {
    if (!user?.employeeId) return;
    setCalendarReturnState(context);
    setRequestedFullCneId(cneId);
    setActiveView('cne-schedule');
    writeViewToUrl('cne-schedule');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToCalendar = () => {
    setRequestedFullCneId(null);
    setActiveView('calendar');
    writeViewToUrl('calendar');
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

      <div className="flex-1 w-full min-w-0 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12">
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

          {user && user.employeeId && activeView === 'calendar' && (
            <CNECalendar user={user} initialViewState={calendarReturnState}
              onViewFullCneDetails={openFullCneDetailsFromCalendar} />
          )}

          {user && user.employeeId && activeView === 'cne-schedule' && (
            <CNESchedule user={user} initialCneId={requestedFullCneId}
              onBackToCalendar={calendarReturnState ? backToCalendar : undefined} />
          )}

          {user && user.employeeId && activeView === 'learning-resources' && (
            <LearningResourcesPage user={user} />
          )}

          {user && user.employeeId && activeView === 'gallery' && <Gallery user={user} />}

          {user && user.employeeId && activeView === 'quiz' && <QuizPage user={user} />}

          {/* Admin Protected Views */}
          {activeView === 'admin-areas' && user?.role === 'ADMIN' && (
            <AdminContent user={user} defaultTab="wards" />
          )}

          {activeView === 'admin-teaching-modes' && user?.role === 'ADMIN' && (
            <AdminContent user={user} defaultTab="teaching" />
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

          {activeView === 'admin-ward-level-cne-outcome' && user?.role === 'ADMIN' && (
            <AdminWardLevelCneOutcome user={user} />
          )}
          </Suspense>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Nursing Informatics | Nursing Services | AIIMS Rishikesh</span>
          
        </div>
      </footer>

      {/* Global Modals */}
      <Suspense fallback={null}>
      {isLoginOpen && (
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => {
            setIsLoginOpen(false);
            setPendingGuestView(null);
            // Canceling a protected deep link must not leave a hidden route
            // that unexpectedly becomes visible on the next ordinary login.
            if (!user?.employeeId && activeView !== 'dashboard') {
              setActiveView('dashboard');
              writeViewToUrl('dashboard', true);
            }
          }}
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
          onClose={() => {
            setIsForgotPasswordOpen(false);
            setPendingGuestView(null);
            if (!user?.employeeId && activeView !== 'dashboard') {
              setActiveView('dashboard');
              writeViewToUrl('dashboard', true);
            }
          }}
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
