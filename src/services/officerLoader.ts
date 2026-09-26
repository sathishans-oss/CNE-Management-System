import { Employee } from '../types';
import { ApiService } from './api';

let cachedOfficers: Employee[] | null = null;
let cachedSessionToken: string | null = null;
let inFlightOfficersPromise: Promise<Employee[]> | null = null;

function syncOfficerCacheWithSession(): void {
  const currentToken = ApiService.getSessionUser()?.token || null;
  if (currentToken !== cachedSessionToken) {
    cachedOfficers = null;
    inFlightOfficersPromise = null;
    cachedSessionToken = currentToken;
  }
}

/**
 * Returns currently cached officers master list if available for the active session, or null.
 */
export function getCachedOfficers(): Employee[] | null {
  syncOfficerCacheWithSession();
  if (cachedOfficers && cachedOfficers.length > 0) {
    return cachedOfficers;
  }
  return null;
}

/**
 * Returns true if an officer dropdown request is currently in-flight.
 */
export function isOfficersInFlight(): boolean {
  syncOfficerCacheWithSession();
  return inFlightOfficersPromise !== null;
}

/**
 * Single-flight officer loader.
 * Guarantees that at most ONE effective in-flight getOfficersDropdown() call exists at a time.
 * If data is already cached, resolves immediately with cached data.
 * If a request is already in-flight, returns that same Promise so callers share the pending request.
 * If no request is in-flight and no cache exists, initiates one request and updates cache on success.
 */
export async function loadOfficersSingleFlight(force: boolean = false, cneId?: string): Promise<Employee[]> {
  syncOfficerCacheWithSession();

  if (!force && cachedOfficers && cachedOfficers.length > 0) {
    return cachedOfficers;
  }

  if (inFlightOfficersPromise) {
    return inFlightOfficersPromise;
  }

  inFlightOfficersPromise = (async () => {
    try {
      const res = await ApiService.getOfficersDropdown(cneId ? { cneId } : undefined);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        cachedOfficers = res.data;
        return res.data;
      }
      return cachedOfficers || [];
    } catch (err) {
      console.error('[officerLoader] Error fetching officers dropdown:', err);
      return cachedOfficers || [];
    } finally {
      inFlightOfficersPromise = null;
    }
  })();

  return inFlightOfficersPromise;
}

/**
 * Allows updating the cached officers list when new officers are retrieved.
 */
export function setCachedOfficers(officers: Employee[]): void {
  syncOfficerCacheWithSession();
  if (Array.isArray(officers) && officers.length > 0) {
    cachedOfficers = officers;
  }
}

