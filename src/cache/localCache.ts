import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OrgSnapshot } from '../types';

const PREFIX = 'al_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function key(orgId: string): string {
  return `${PREFIX}:${orgId}`;
}

/** Persist a full org snapshot to AsyncStorage */
export async function saveSnapshot(orgId: string, snapshot: OrgSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(key(orgId), JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[cache] saveSnapshot failed', err);
  }
}

/** Load a cached snapshot. Returns null if missing or expired. */
export async function loadSnapshot(orgId: string, allowStale = false): Promise<OrgSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(key(orgId));
    if (!raw) return null;
    const snapshot: OrgSnapshot = JSON.parse(raw);
    if (!allowStale) {
      const age = Date.now() - new Date(snapshot.fetchedAt).getTime();
      if (age > CACHE_TTL_MS) return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

/** Delete the cache for an org (e.g. on logout) */
export async function clearSnapshot(orgId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(orgId));
  } catch {
    /* no-op */
  }
}

/** Clear all org caches */
export async function clearAllSnapshots(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch {
    /* no-op */
  }
}

// ─── Demo persistence ────────────────────────────────────────────────────────

const DEMO_KEY = `${PREFIX}:demo`;

export async function loadDemoState(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveDemoState(state: Record<string, unknown>): Promise<void> {
  try {
    await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(state));
  } catch {
    /* no-op */
  }
}

export async function clearDemoState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEMO_KEY);
  } catch {
    /* no-op */
  }
}
