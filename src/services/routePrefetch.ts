import { ViewMode } from '../types';

type RouteImporter = () => Promise<unknown>;

const PREFETCH_MAP: Partial<Record<ViewMode, RouteImporter>> = {
  'cne-schedule': () => import('../components/CNESchedule'),
  'my-cne-records': () => import('../components/MyCNERecords'),
  'learning-resources': () => import('../components/cne/LearningResourcesPage'),
  'calendar': () => import('../components/CNECalendar'),
  'gallery': () => import('../components/Gallery')
};

const ADMIN_PREFETCH_MAP: Partial<Record<ViewMode, RouteImporter>> = {
  'admin-reports': () => import('../components/AdminReports'),
  'admin-content': () => import('../components/AdminContent'),
  'admin-roles': () => import('../components/AdminRoles'),
  'admin-areas': () => import('../components/AdminAreas')
};

const prefetchedRoutes = new Set<string>();

/**
 * Prefetches a route chunk dynamically and safely caches the request.
 */
export function prefetchRoute(view: ViewMode, isAdmin = false): void {
  if (prefetchedRoutes.has(view)) return;

  const importer = PREFETCH_MAP[view] || (isAdmin ? ADMIN_PREFETCH_MAP[view] : undefined);
  if (!importer) return;

  prefetchedRoutes.add(view);
  importer().catch(() => {
    // Retry on next user interaction if prefetch failed
    prefetchedRoutes.delete(view);
  });
}

/**
 * Schedules background idle prefetching for primary staff routes after the main page is idle.
 * Uses requestIdleCallback where available, with a safe setTimeout fallback.
 */
export function scheduleIdlePrefetch(isAuthenticated: boolean, delayMs: number = 2000): () => void {
  if (!isAuthenticated || typeof window === 'undefined') return () => {};

  let cancelled = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let idleId: number | null = null;

  const runPrefetch = () => {
    if (cancelled) return;
    const primaryRoutes: ViewMode[] = ['cne-schedule', 'my-cne-records', 'learning-resources'];
    primaryRoutes.forEach((route, idx) => {
      setTimeout(() => {
        if (!cancelled) {
          prefetchRoute(route);
        }
      }, idx * 600);
    });
  };

  const scheduleWork = () => {
    if ('requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(runPrefetch, { timeout: 4000 });
    } else {
      runPrefetch();
    }
  };

  timerId = setTimeout(scheduleWork, delayMs);

  return () => {
    cancelled = true;
    if (timerId) clearTimeout(timerId);
    if (idleId !== null && 'cancelIdleCallback' in window) {
      (window as any).cancelIdleCallback(idleId);
    }
  };
}
