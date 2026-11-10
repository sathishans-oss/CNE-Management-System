/** Public route names only. Never put staff, quizzes, or CNE records into URLs. */
import type { ViewMode } from '../types';

export const ADMIN_VIEWS: readonly ViewMode[] = [
  'admin-content', 'admin-roles', 'admin-reports', 'admin-areas',
  'admin-teaching-modes', 'admin-ward-level-cne-outcome'
];
const ROUTES: readonly ViewMode[] = [
  'dashboard', 'calendar', 'cne-schedule', 'my-cne-records',
  'learning-resources', 'quiz', 'gallery', ...ADMIN_VIEWS
];

export function readViewFromUrl(): ViewMode {
  if (typeof window === 'undefined') return 'dashboard';
  let candidate = '';
  try { candidate = decodeURIComponent(window.location.hash.slice(1).replace(/^\//, '').split(/[?&]/)[0]); }
  catch { return 'dashboard'; }
  return candidate === 'home' ? 'dashboard' : ROUTES.includes(candidate as ViewMode) ? candidate as ViewMode : 'dashboard';
}

/** Uses history state for Back/Forward; preserves postTest query and other safe URL parameters. */
export function writeViewToUrl(view: ViewMode, replace = false): void {
  if (typeof window === 'undefined') return;
  const normalized = view === 'home' ? 'dashboard' : view;
  const nextHash = normalized === 'dashboard' ? '' : `#/${normalized}`;
  if (window.location.hash === nextHash) return;
  const next = window.location.pathname + window.location.search + nextHash;
  if (replace) window.history.replaceState(window.history.state, '', next);
  else window.history.pushState(window.history.state, '', next);
}
