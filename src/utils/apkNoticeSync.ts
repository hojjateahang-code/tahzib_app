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

// Fetch APK notice configuration from server
export async function fetchApkNoticeConfig(): Promise<ApkNoticeInfo | null> {
  try {
    const res = await fetch(getApiUrl('/api/apk/info'));
    if (res.ok) {
      const data: ApkNoticeInfo = await res.json();
      if (data && data.success) {
        setCachedApkNoticeStatus(Boolean(data.showDownloadNotice));
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
  if (msg.id.startsWith('msg_apk_')) return true;
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
    // If show notice is disabled, delete any existing APK notice messages for this user
    const existingMsgs = await db.messages
      .where('recipientId')
      .equals(user.id)
      .filter(isApkDownloadMessage)
      .toArray();

    if (existingMsgs.length > 0) {
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

  if (existingMsgs.length === 0) {
    // User does not have it -> create it!
    const newMsg: Message = {
      id: `msg_apk_${user.id}`,
      senderId: 'sys_admin',
      recipientId: user.id,
      subject,
      content,
      date: config.updatedAt || new Date().toISOString(),
      isRead: false,
      type: 'OFFICIAL',
      synced: false
    };
    await db.messages.put(newMsg);
  } else {
    // User already has message -> ensure subject / content are up-to-date with current server config
    const firstMsg = existingMsgs[0];
    if (firstMsg.subject !== subject || firstMsg.content !== content) {
      await db.messages.update(firstMsg.id, {
        subject,
        content
      });
    }
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
    await db.messages.bulkDelete(allApkMsgs.map(m => m.id));
  }
}
