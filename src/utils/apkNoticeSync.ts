import { db } from '../db';
import { getApiUrl } from '../lib/apiConfig';
import { Message, User } from '../types';

export interface ApkNoticeInfo {
  success: boolean;
  version?: string;
  releaseNotes?: string;
  showDownloadNotice: boolean;
  noticeTitle?: string;
  noticeContent?: string;
  updatedAt?: string;
  downloadUrl?: string;
  hasApk?: boolean;
}

// حافظه موقت در کلاینت برای وضعیت جاری نمایش پیام
let cachedNoticeStatus: boolean | null = null;

export function getCachedApkNoticeStatus(): boolean | null {
  if (cachedNoticeStatus !== null) return cachedNoticeStatus;
  const stored = localStorage.getItem('apk_notice_enabled');
  if (stored !== null) {
    cachedNoticeStatus = stored === 'true';
    return cachedNoticeStatus;
  }
  return null;
}

export function setCachedApkNoticeStatus(enabled: boolean) {
  cachedNoticeStatus = enabled;
  localStorage.setItem('apk_notice_enabled', enabled ? 'true' : 'false');
}

// ثبت وضعیت خوانده‌شدن پیام توسط کاربر در دیتابیس و حافظه محلی
export async function markApkNoticeAsRead(userId: string, msgId?: string): Promise<void> {
  try {
    if (userId) {
      localStorage.setItem(`read_apk_notice_${userId}`, 'true');
    }
    if (msgId) {
      localStorage.setItem(`read_msg_${msgId}`, 'true');
      await db.messages.update(msgId, {
        isRead: true,
        updatedAt: Date.now()
      }).catch(() => null);
    }
    // Also mark any msg_apk_ for this user as read
    if (userId) {
      const existing = await db.messages
        .where('recipientId')
        .equals(userId)
        .filter(isApkDownloadMessage)
        .toArray();
      for (const m of existing) {
        localStorage.setItem(`read_msg_${m.id}`, 'true');
        await db.messages.update(m.id, { isRead: true, updatedAt: Date.now() }).catch(() => null);
      }
    }
    window.dispatchEvent(new CustomEvent('MESSAGE_READ_CHANGED'));
  } catch (err) {
    console.warn('Error marking APK notice as read:', err);
  }
}

// بررسی اینکه آیا این پیام قبلاً توسط کاربر باز یا خوانده شده است
export function isApkNoticeReadByUser(userId: string, msg?: Message): boolean {
  if (userId && localStorage.getItem(`read_apk_notice_${userId}`) === 'true') {
    return true;
  }
  if (msg) {
    if (msg.isRead) return true;
    if (localStorage.getItem(`read_msg_${msg.id}`) === 'true') return true;
  }
  return false;
}

// Fetch APK notice configuration from server
export async function fetchApkNoticeConfig(): Promise<ApkNoticeInfo | null> {
  try {
    const res = await fetch(getApiUrl('/api/apk/info'));
    if (res.ok) {
      const data: ApkNoticeInfo = await res.json();
      if (data && data.success) {
        const isEnabled = Boolean(data.showDownloadNotice);
        setCachedApkNoticeStatus(isEnabled);
        return data;
      }
    }
  } catch (err) {
    console.warn('Could not fetch APK notice config:', err);
  }
  return null;
}

// Helper to check if a message is an APK download message
export function isApkDownloadMessage(msg: Message): boolean {
  if (!msg) return false;
  if (msg.id && msg.id.startsWith('msg_apk_')) return true;
  if (msg.senderId === 'sys_admin' && (msg.subject?.includes('اپلیکیشن') || msg.subject?.includes('اندروید'))) return true;
  if (msg.subject?.includes('اپلیکیشن اندروید تهذیب') || msg.subject?.includes('نسخه جدید اپلیکیشن اندروید') || msg.subject?.includes('دانلود اپلیکیشن اندروید')) return true;
  if (msg.content?.includes('/download/tahzib.apk') || msg.content?.includes('دانلود و نصب مستقیم برنامه')) return true;
  return false;
}

// Ensure the APK download message exists for a specific user (if enabled) or is removed (if disabled)
export async function syncApkNoticeForUser(user: User, serverConfig?: ApkNoticeInfo | null): Promise<void> {
  if (!user || !user.id) return;
  const config = serverConfig !== undefined ? serverConfig : await fetchApkNoticeConfig();
  if (!config) return;

  const showNotice = Boolean(config.showDownloadNotice);
  setCachedApkNoticeStatus(showNotice);

  if (!showNotice) {
    // If show notice is disabled, purge any existing APK notice messages for this user
    const existingMsgs = await db.messages
      .where('recipientId')
      .equals(user.id)
      .filter(isApkDownloadMessage)
      .toArray();

    if (existingMsgs.length > 0) {
      // Tombstone and delete
      for (const m of existingMsgs) {
        await db.messages.update(m.id, { isDeleted: true, updatedAt: Date.now() }).catch(() => null);
      }
      await db.messages.bulkDelete(existingMsgs.map(m => m.id));
    }
    return;
  }

  // If show notice is enabled: check if user already has an APK download notice
  const existingMsgs = await db.messages
    .where('recipientId')
    .equals(user.id)
    .filter(isApkDownloadMessage)
    .toArray();

  const ver = config.version || '1.0.0';
  const defaultSubject = `📱 نسخه جدید اپلیکیشن اندروید تهذیب (نسخه ${ver}) منتشر شد`;
  const subject = config.noticeTitle?.trim() || defaultSubject;
  const content = config.noticeContent?.trim()
    ? config.noticeContent.trim()
    : `با سلام و احترام،\nنسخه جدید اپلیکیشن اندروید سامانه تهذیب (v${ver}) بر روی سرور مستقر گردید.\n\nویژگی‌ها و تغییرات این نسخه:\n${config.releaseNotes || 'نسخه رسمی و هوشمند اپلیکیشن اندروید سامانه جامع تهذیب حوزه علمیه'}\n\nجهت دریافت و نصب مستقیم برنامه روی گوشی خود، بر روی دکمه سبز رنگ «دانلود و نصب مستقیم برنامه» در زیر این پیام کلیک فرمایید.`;

  const alreadyRead = isApkNoticeReadByUser(user.id);

  if (existingMsgs.length === 0) {
    // User does not have it -> create it!
    const newMsg: Message = {
      id: `msg_apk_${user.id}`,
      senderId: 'sys_admin',
      recipientId: user.id,
      subject,
      content,
      date: config.updatedAt || new Date().toISOString(),
      isRead: alreadyRead, // Respect if user already opened it in this session/browser
      type: 'OFFICIAL',
      synced: false,
      updatedAt: Date.now()
    };
    await db.messages.put(newMsg);
  } else {
    // User already has message -> update subject/content without resetting isRead to unread!
    const firstMsg = existingMsgs[0];
    const shouldBeRead = firstMsg.isRead || alreadyRead;

    await db.messages.update(firstMsg.id, {
      subject,
      content,
      isRead: shouldBeRead,
      updatedAt: Date.now()
    });

    // Clean up duplicate messages if any
    if (existingMsgs.length > 1) {
      const duplicates = existingMsgs.slice(1);
      await db.messages.bulkDelete(duplicates.map(m => m.id));
    }
  }
}

// Synchronize APK notice for ALL users in the local database
export async function syncApkNoticeForAllUsers(serverConfig?: ApkNoticeInfo | null): Promise<void> {
  const config = serverConfig !== undefined ? serverConfig : await fetchApkNoticeConfig();
  if (!config) return;

  const showNotice = Boolean(config.showDownloadNotice);
  setCachedApkNoticeStatus(showNotice);
  const allUsers = await db.users.toArray();

  if (!showNotice) {
    // Purge APK messages from all users
    const allApkMsgs = await db.messages.filter(isApkDownloadMessage).toArray();
    if (allApkMsgs.length > 0) {
      for (const m of allApkMsgs) {
        await db.messages.update(m.id, { isDeleted: true, updatedAt: Date.now() }).catch(() => null);
      }
      await db.messages.bulkDelete(allApkMsgs.map(m => m.id));
    }
    return;
  }

  // Ensure every active user has the message
  for (const user of allUsers) {
    await syncApkNoticeForUser(user, config);
  }
}

// Purge all APK notice messages for all users
export async function removeApkNoticeForAllUsers(): Promise<void> {
  setCachedApkNoticeStatus(false);
  const allApkMsgs = await db.messages.filter(isApkDownloadMessage).toArray();
  if (allApkMsgs.length > 0) {
    for (const m of allApkMsgs) {
      await db.messages.update(m.id, { isDeleted: true, updatedAt: Date.now() }).catch(() => null);
    }
    await db.messages.bulkDelete(allApkMsgs.map(m => m.id));
  }
}

// 1-Click Toggle helper for Technical Admin
export async function toggleApkNoticeServer(enabled?: boolean): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/apk/toggle-notice'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enabled !== undefined ? { enabled } : {})
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        const isEnabled = Boolean(data.showDownloadNotice);
        setCachedApkNoticeStatus(isEnabled);
        if (isEnabled) {
          await syncApkNoticeForAllUsers(data);
        } else {
          await removeApkNoticeForAllUsers();
        }
        return isEnabled;
      }
    }
  } catch (err) {
    console.warn('Error toggling APK notice on server:', err);
  }
  return false;
}
