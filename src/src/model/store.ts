import { get, set } from 'idb-keyval';
import type { StoredResume } from './types';
import { normalize } from './normalize';

/* "My resumes" lives in this browser (IndexedDB), so photos fit and nothing is sent anywhere. */
const KEY = 'resumes-v2';

export async function loadAll(): Promise<StoredResume[]> {
  try {
    const raw = (await get(KEY)) as StoredResume[] | undefined;
    return (raw ?? []).flatMap((r) => {
      try { return [{ ...r, resume: normalize(r.resume) }]; } catch { return []; }
    });
  } catch {
    return [];
  }
}

/** Returns false when the browser refused to store (private window, storage full). */
export async function saveAll(list: StoredResume[]): Promise<boolean> {
  try { await set(KEY, list); return true; } catch { return false; }
}
