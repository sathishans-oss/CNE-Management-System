/**
 * Bounded, page-lifetime API response cache. Nothing here is written to localStorage.
 * A serialized payload budget limits the retained data; the actual JS heap may be
 * larger and depends on the browser. Large files / base64 responses are excluded.
 */
const MAX_SERIALIZED_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 100;
const MAX_PROGRESS_ENTRIES = 50;
const MAX_DETAIL_ENTRIES = 20;

type Entry = {
  key: string;
  scope: string;
  action: string;
  body: string;
  bytes: number;
  expiresAt: number;
};
const entries = new Map<string, Entry>(); // Map insertion order is LRU.
const inFlight = new Map<string, Promise<unknown>>();
let invalidationGeneration = 0;
let approximateBytes = 0;

const groupFor = (action: string) => action === 'getCNEActivityProgress' ? 'progress' :
  ['getCNEParticipants', 'getCNEQuestions', 'getReferenceMaterial', 'getLearningResource'].includes(action) ? 'detail' : 'general';

function remove(key: string): void {
  const prior = entries.get(key);
  if (!prior) return;
  approximateBytes -= prior.bytes;
  entries.delete(key);
}

function evictExpired(now: number): void {
  for (const [key, entry] of entries) if (entry.expiresAt <= now) remove(key);
}

function evictToBudget(): void {
  for (const [group, max] of [['progress', MAX_PROGRESS_ENTRIES], ['detail', MAX_DETAIL_ENTRIES]] as const) {
    while ([...entries.values()].filter(e => groupFor(e.action) === group).length > max) {
      const oldest = [...entries.values()].find(e => groupFor(e.action) === group);
      if (!oldest) break;
      remove(oldest.key);
    }
  }
  while (entries.size > MAX_ENTRIES || approximateBytes > MAX_SERIALIZED_BYTES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    remove(oldest);
  }
}

/** Clear all retained responses and prevent in-flight responses from repopulating it. */
export function clearMemoryCache(): void {
  invalidationGeneration += 1;
  entries.clear();
  inFlight.clear();
  approximateBytes = 0;
  // There are no retained entries after clearing; old request closures still
  // compare their captured revision and will not repopulate cleared entries.
}

/** Invalidate an API action across all keys / parameters and all users. */
export function invalidateMemoryCache(action?: string): void {
  if (!action) { clearMemoryCache(); return; }
  invalidationGeneration += 1;
  for (const [key, entry] of entries) {
    if (entry.action === action) remove(key);
  }
  for (const key of inFlight.keys()) {
    // API keys start with encoded action + separator, not user/session data.
    if (key.startsWith(`${action}|`)) {
      inFlight.delete(key);
    }
  }
}

export function peekMemoryResponse<T>(action: string, scope: string, params: unknown = {}): T | null {
  const key = `${action}|${scope}|${JSON.stringify(params)}`;
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) { remove(key); return null; }
  entries.delete(key);
  entries.set(key, entry);
  try { return JSON.parse(entry.body) as T; }
  catch { remove(key); return null; }
}

/** Single-flight, bounded response cache; failed API requests are never retained. */
export async function readMemoryCached<T extends { success: boolean }>(
  action: string,
  scope: string,
  params: unknown,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const key = `${action}|${scope}|${JSON.stringify(params)}`;
  const found = peekMemoryResponse<T>(action, scope, params);
  if (found) return found;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  const revision = invalidationGeneration;
  const promise = (async () => {
    const response = await loader();
    if (response && response.success && invalidationGeneration === revision) {
      try {
        const body = JSON.stringify(response);
        // UTF-16 upper-bound approximation, with a maximum single payload size.
        const bytes = body.length * 2;
        if (bytes > 0 && bytes <= MAX_SERIALIZED_BYTES) {
          evictExpired(Date.now());
          remove(key);
          entries.set(key, { key, scope, action, body, bytes, expiresAt: Date.now() + ttlMs });
          approximateBytes += bytes;
          evictToBudget();
        }
      } catch { /* Oversized or unserializable responses are not cached. */ }
    }
    return response;
  })();
  inFlight.set(key, promise);
  try { return await promise; }
  finally { if (inFlight.get(key) === promise) inFlight.delete(key); }
}

export function getMemoryCacheStats(): { entries: number; estimatedBytes: number; limitBytes: number } {
  evictExpired(Date.now());
  return { entries: entries.size, estimatedBytes: approximateBytes, limitBytes: MAX_SERIALIZED_BYTES };
}
