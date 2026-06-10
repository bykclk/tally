import { requireOptionalNativeModule } from 'expo';

/** iCloud account states from CKAccountStatus, plus 'unavailable' when the
 * native module isn't in the build (e.g. Expo Go or an older binary). */
export type ICloudAccountStatus =
  | 'available'
  | 'noAccount'
  | 'restricted'
  | 'couldNotDetermine'
  | 'temporarilyUnavailable'
  | 'unknown'
  | 'unavailable';

export type CloudRecord = {
  recordType: string;
  recordName: string;
  fields: Record<string, unknown>;
};

export type PushResult = { saved: number; deleted: number };

type CloudSyncNative = {
  accountStatus(): Promise<ICloudAccountStatus>;
  push(upserts: CloudRecord[], deletes: string[]): Promise<PushResult>;
};

// Optional so the app never crashes when the native module is missing — it just
// reports 'unavailable' and the iCloud UI stays inert.
const CloudSync = requireOptionalNativeModule<CloudSyncNative>('CloudSync');

/** Whether the CloudKit native module is present in this build. */
export const isCloudSyncAvailable = CloudSync != null;

export async function iCloudAccountStatus(): Promise<ICloudAccountStatus> {
  if (!CloudSync) return 'unavailable';
  try {
    return await CloudSync.accountStatus();
  } catch {
    return 'unknown';
  }
}

/** Upload records to / delete records from the private CloudKit zone. */
export async function pushToCloud(
  upserts: CloudRecord[],
  deletes: string[],
): Promise<PushResult> {
  if (!CloudSync) throw new Error('CloudSync native module is unavailable');
  return CloudSync.push(upserts, deletes);
}
