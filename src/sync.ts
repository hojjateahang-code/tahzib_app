import { safeUUID } from './lib/crypto';
import { db } from './db';
import type { BaseEntity } from './types';
import { logger } from './lib/logger';

let syncTimeout: any = null;

export interface MinioStatus {
  configured: boolean;
  connected?: boolean;
  message: string;
  endpoint?: string;
  bucket?: string;
  prefix?: string;
}

// ==========================================
// STEP 1: Clock Synchronization & Offset
// ==========================================
export async function syncServerTimeOffset(): Promise<number> {
  try {
    const t1 = Date.now();
    const res = await fetch('/api/time');
    const t2 = Date.now();

    if (res.ok) {
      const data = await res.json();
      const serverTime = data.serverTime || t2;
      const rtt = t2 - t1;
      const exactServerTime = serverTime + Math.round(rtt / 2);
      const offset = exactServerTime - t2;

      localStorage.setItem('time_offset', String(offset));
      return offset;
    }
  } catch (err) {
    console.warn('Clock sync warning:', err);
  }
  return parseInt(localStorage.getItem('time_offset') || '0', 10);
}

export function getSynchronizedTime(): number {
  const offset = parseInt(localStorage.getItem('time_offset') || '0', 10);
  return Date.now() + offset;
}

// ==========================================
// STEP 2 & 3: Granular Deep Merge with Tombstones
// ==========================================
function mergeEntityArrays<T extends BaseEntity & { id: string }>(
  localItems: T[],
  incomingItems: T[],
  customDeepMerge?: (winning: T, losing: T) => T
): T[] {
  const map = new Map<string, T>();

  // Add all local items
  for (const item of localItems) {
    map.set(item.id, { ...item });
  }

  // Deep merge incoming items
  for (const incoming of incomingItems) {
    const existing = map.get(incoming.id);

    if (!existing) {
      map.set(incoming.id, { ...incoming });
    } else {
      const localTime = existing.updatedAt || 0;
      const incomingTime = incoming.updatedAt || 0;

      let winning: T;
      let losing: T;

      if (incomingTime >= localTime) {
        winning = { ...existing, ...incoming };
        losing = { ...existing };
      } else {
        winning = { ...incoming, ...existing };
        losing = { ...incoming };
      }

      // Preserve tombstone: deletion takes precedence unless explicitly overwritten by a newer non-deleted version
      if (incoming.isDeleted && incomingTime >= localTime) {
        winning.isDeleted = true;
      } else if (existing.isDeleted && localTime >= incomingTime) {
        winning.isDeleted = true;
      } else if (incoming.isDeleted || existing.isDeleted) {
        winning.isDeleted = true;
      }

      // Perform custom deep merge for nested properties if callback provided
      if (customDeepMerge) {
        winning = customDeepMerge(winning, losing);
      } else {
        // Default deep merge for generic objects/arrays
        winning = defaultDeepMerge(winning, losing);
      }

      map.set(incoming.id, winning);
    }
  }

  return Array.from(map.values());
}

function defaultDeepMerge<T extends Record<string, any>>(winning: T, losing: T): T {
  const merged = { ...winning };

  for (const key of Object.keys(losing)) {
    const valWin = winning[key];
    const valLose = losing[key];

    // Merge nested plain objects
    if (
      valWin && valLose &&
      typeof valWin === 'object' && typeof valLose === 'object' &&
      !Array.isArray(valWin) && !Array.isArray(valLose)
    ) {
      merged[key as keyof T] = { ...valLose, ...valWin };
    }
  }

  return merged;
}

// ==========================================
// STEP 4 & 5: Device Segregation & Fetch-Merge-Push
// ==========================================
export function getDeviceId(): string {
  let devId = localStorage.getItem('device_id');
  if (!devId) {
    devId = `dev_${safeUUID().slice(0, 8)}`;
    localStorage.setItem('device_id', devId);
  }
  return devId;
}

// Check MinIO connection status
export async function checkMinIOStatus(): Promise<MinioStatus> {
  try {
    const res = await fetch('/api/sync/status');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      configured: false,
      connected: false,
      message: `عدم امکان ارتباط با سرور: ${err.message || 'خطای شبکه‌ای'}`
    };
  }
}

/**
 * Fetch-Merge-Push Full Synchronizer
 */
export async function syncMinIOData(): Promise<{ success: boolean; message: string; timestamp?: string }> {
  try {
    logger.info('SYNC', 'شروع چرخه همگام‌سازی سرور اصلی (Fetch-Merge-Push)...');

    // 1. Clock Sync
    await syncServerTimeOffset();

    // 2. FETCH: List all backup files in Storage
    const listRes = await fetch('/api/sync/list').catch(() => null);
    const backupFiles: { key: string }[] = [];

    if (listRes && listRes.ok) {
      const listData = await listRes.json();
      if (listData.success && Array.isArray(listData.files)) {
        backupFiles.push(...listData.files);
      }
    }

    logger.info('SYNC', `تعداد ${backupFiles.length} فایل بک‌آپ و دستگاه از سرور شناسایی شد.`);

    // 3. Download and aggregate all remote backup states
    const remoteDatasets: any[] = [];
    if (backupFiles.length > 0) {
      for (const file of backupFiles) {
        try {
          const dlRes = await fetch(`/api/sync/download?key=${encodeURIComponent(file.key)}`);
          if (dlRes.ok) {
            const dlData = await dlRes.json();
            if (dlData.success && dlData.data?.data) {
              remoteDatasets.push(dlData.data.data);
            }
          }
        } catch (e) {
          console.warn('Backup download skip:', file.key, e);
        }
      }
    } else {
      // Fallback download latest.json
      const dlRes = await fetch('/api/sync/download?key=backups/latest.json').catch(() => null);
      if (dlRes && dlRes.ok) {
        const dlData = await dlRes.json();
        if (dlData.success && dlData.data?.data) {
          remoteDatasets.push(dlData.data.data);
        }
      }
    }

    // Get current local state from Dexie
    let localUsers = await db.users.toArray();
    let localTasks = await db.tasks.toArray();
    let localAssessments = await db.assessments.toArray();
    let localReports = await db.reports.toArray();
    let localHabits = await db.personalHabits.toArray();
    let localAppointments = await db.appointments.toArray();
    let localMessages = await db.messages.toArray();
    let localCustomGroups = await db.customGroups.toArray();
    let localPrivateNotes = await db.privateNotes.toArray();
    let localTahzibPrograms = await db.tahzibPrograms.toArray();

    // 4. MERGE: Apply Granular Deep Merge across local + all remote datasets
    for (const remoteData of remoteDatasets) {
      if (Array.isArray(remoteData.users)) {
        localUsers = mergeEntityArrays(localUsers, remoteData.users);
      }
      if (Array.isArray(remoteData.tasks)) {
        localTasks = mergeEntityArrays(localTasks, remoteData.tasks);
      }
      if (Array.isArray(remoteData.assessments)) {
        localAssessments = mergeEntityArrays(localAssessments, remoteData.assessments);
      }
      if (Array.isArray(remoteData.reports)) {
        localReports = mergeEntityArrays(localReports, remoteData.reports);
      }
      if (Array.isArray(remoteData.personalHabits)) {
        localHabits = mergeEntityArrays(localHabits, remoteData.personalHabits);
      }
      if (Array.isArray(remoteData.appointments)) {
        localAppointments = mergeEntityArrays(localAppointments, remoteData.appointments);
      }
      if (Array.isArray(remoteData.messages)) {
        localMessages = mergeEntityArrays(localMessages, remoteData.messages);
      }
      if (Array.isArray(remoteData.customGroups)) {
        localCustomGroups = mergeEntityArrays(localCustomGroups, remoteData.customGroups);
      }
      if (Array.isArray(remoteData.privateNotes)) {
        localPrivateNotes = mergeEntityArrays(localPrivateNotes, remoteData.privateNotes);
      }
      if (Array.isArray(remoteData.tahzibPrograms)) {
        localTahzibPrograms = mergeEntityArrays(localTahzibPrograms, remoteData.tahzibPrograms);
      }
    }

    // Save merged state back into local Dexie database
    if (localUsers.length > 0) await db.users.bulkPut(localUsers);
    if (localTasks.length > 0) await db.tasks.bulkPut(localTasks);
    if (localAssessments.length > 0) await db.assessments.bulkPut(localAssessments);
    if (localReports.length > 0) await db.reports.bulkPut(localReports);
    if (localHabits.length > 0) await db.personalHabits.bulkPut(localHabits);
    if (localAppointments.length > 0) await db.appointments.bulkPut(localAppointments);
    if (localMessages.length > 0) await db.messages.bulkPut(localMessages);
    if (localCustomGroups.length > 0) await db.customGroups.bulkPut(localCustomGroups);
    if (localPrivateNotes.length > 0) await db.privateNotes.bulkPut(localPrivateNotes);
    if (localTahzibPrograms.length > 0) await db.tahzibPrograms.bulkPut(localTahzibPrograms);

    // 5. PUSH: Upload updated consensus dataset to Storage under client device key + latest.json
    const deviceId = getDeviceId();
    const currentUserId = localStorage.getItem('current_user_id') || 'anon';
    const deviceKey = `backups/device_${currentUserId}_${deviceId}.json`;

    const fullConsensusBackup = {
      app: 'TahzibApp',
      version: 1,
      deviceId,
      exportedAt: new Date(getSynchronizedTime()).toISOString(),
      data: {
        users: localUsers,
        tasks: localTasks,
        assessments: localAssessments,
        reports: localReports,
        personalHabits: localHabits,
        appointments: localAppointments,
        messages: localMessages,
        customGroups: localCustomGroups,
        privateNotes: localPrivateNotes,
        tahzibPrograms: localTahzibPrograms
      }
    };

    const pushRes = await fetch('/api/sync/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: deviceKey,
        data: fullConsensusBackup
      })
    });

    const pushResult = await pushRes.json();
    const activeUsersCount = localUsers.filter(u => !u.isDeleted).length;
    const tombstoneUsersCount = localUsers.filter(u => u.isDeleted).length;

    logger.success('SYNC', `همگام‌سازی کامل انجام شد. (${activeUsersCount} کاربر فعال، ${tombstoneUsersCount} کاربر حذف‌شده با برچسب ابطال)`, {
      activeUsers: activeUsersCount,
      tombstones: tombstoneUsersCount,
      tasks: localTasks.filter(t => !t.isDeleted).length
    });

    return {
      success: pushResult.success,
      message: pushResult.message || 'همگام‌سازی کامل با موفقیت انجام گردید.',
      timestamp: new Date(getSynchronizedTime()).toISOString()
    };
  } catch (error: any) {
    logger.error('SYNC', `خطا در همگام‌سازی: ${error.message || 'خطای غیرمنتظره'}`, { error: error.stack });
    console.error('Fetch-Merge-Push sync error:', error);
    return { success: false, message: `خطا در همگام‌سازی: ${error.message || 'خطای ناشناخته'}` };
  }
}

// Backward compatibility exports
export const syncFullDatabaseToMinIO = syncMinIOData;
export const restoreDatabaseFromMinIO = syncMinIOData;

// Debounced Auto Sync helper
export const triggerSync = () => {
  if (syncTimeout) clearTimeout(syncTimeout);
  
  syncTimeout = setTimeout(async () => {
    console.log('🔄 Triggering auto-sync (Fetch-Merge-Push) to MinIO...');
    await syncMinIOData();
  }, 1200);
};

// Upload File Attachment to MinIO bucket
export async function uploadFileToMinIO(file: File): Promise<{ success: boolean; url?: string; message?: string }> {
  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const base64Content = await base64Promise;

    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        content: base64Content,
        mimeType: file.type
      })
    });

    const result = await res.json();
    if (result.success) {
      return { success: true, url: result.url };
    } else {
      return { success: false, message: result.message };
    }
  } catch (err: any) {
    console.error('MinIO file upload error:', err);
    return { success: false, message: `خطا در ارسال فایل: ${err.message}` };
  }
}

/**
 * Filter helper to exclude soft-deleted items in React UI components
 */
export function filterActive<T extends { isDeleted?: boolean }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter(item => !item.isDeleted);
}
