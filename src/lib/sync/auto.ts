import { runMigrations } from '@/db/client';
import { getPref, setPref } from '@/db/queries/prefs';
import { isCloudSyncAvailable, iCloudAccountStatus } from './icloud';
import { applyRemoteChanges } from './apply';
import { pushPendingChanges } from './push';

const LAST_SYNC_PREF = 'sync.lastSyncAt';

let syncing = false;

/**
 * One full sync round: pull-then-push. Pull first so remote changes merge in
 * (LWW keeps newer local rows); the push then uploads whatever is still
 * pending. Re-entrancy-guarded, quiet when iCloud/native module is missing,
 * and never throws — callers fire-and-forget it on launch/foreground. Returns
 * true when a round actually completed.
 */
export async function syncNow(): Promise<boolean> {
  if (syncing || !isCloudSyncAvailable) return false;
  syncing = true;
  try {
    await runMigrations(); // memoized; safe if the caller raced app startup
    if ((await iCloudAccountStatus()) !== 'available') return false;
    await applyRemoteChanges();
    await pushPendingChanges();
    await setPref(LAST_SYNC_PREF, String(Date.now()));
    return true;
  } catch (e) {
    // Expected offline/transient failures stay quiet; the next trigger retries.
    console.warn('iCloud sync failed', e);
    return false;
  } finally {
    syncing = false;
  }
}

/** Epoch ms of the last completed sync round, or null if never synced. */
export async function lastSyncAt(): Promise<number | null> {
  const v = await getPref(LAST_SYNC_PREF);
  return v ? Number(v) : null;
}
