import { db } from '../db';
import { User, Message } from '../types';
import { safeFormatDateFa, formatJalali } from './date';
import { triggerSync } from '../sync';

export interface CompetitionRound {
  id: string;
  title: string;                 // عنوان دور مسابقه مثلاً «مسابقه چله نور»، «دور بهاره امتیازات»
  startDate: string;             // YYYY-MM-DD (تاریخ آغاز دور و مبدأ محاسبه امتیازات)
  endDate?: string;              // YYYY-MM-DD (تاریخ اختیاری پایان دور)
  description?: string;          // توضیحات یا اهداف معنوی و تربیتی دور
  isActive: boolean;             // آیا این دور فعال است؟
  showInAnnouncements: boolean;  // آیا در اعلان‌ها و تابلوی اعلانات همه کاربران نمایش داده شود؟
  customAnnouncementText?: string;// متن سفارشی اعلان برای طلاب
  createdAt: string;
  updatedAt?: number;
  createdBy?: string;
}

const STORAGE_KEY_ACTIVE = 'active_competition_round';
const STORAGE_KEY_HISTORY = 'competition_rounds_history';

/**
 * Returns the currently active competition round, if any
 */
export function getActiveCompetitionRound(): CompetitionRound | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isActive) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Error reading active competition round:', err);
    return null;
  }
}

/**
 * Returns all saved competition rounds (history)
 */
export function getStoredCompetitionRounds(): CompetitionRound[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) {
      const active = getActiveCompetitionRound();
      return active ? [active] : [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Saves or updates a competition round as active
 */
export async function saveActiveCompetitionRound(
  round: CompetitionRound, 
  currentUser?: User,
  allUsers?: User[],
  broadcastAnnouncement = false
): Promise<void> {
  try {
    const updatedRound: CompetitionRound = {
      ...round,
      updatedAt: Date.now(),
      createdBy: currentUser ? currentUser.name : round.createdBy
    };

    // Save to active key
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(updatedRound));

    // Save to history list
    const history = getStoredCompetitionRounds().filter(r => r.id !== round.id);
    history.unshift(updatedRound);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));

    // Broadcast message to users if announcement is requested
    if (broadcastAnnouncement && round.showInAnnouncements && allUsers && allUsers.length > 0 && currentUser) {
      await broadcastRoundOfficialNotice(updatedRound, currentUser, allUsers);
    }

    // Trigger local event for instant UI updates across components
    window.dispatchEvent(new CustomEvent('COMPETITION_ROUND_CHANGED', { detail: updatedRound }));
    triggerSync();
  } catch (err) {
    console.error('Error saving competition round:', err);
    throw err;
  }
}

/**
 * Deactivates the current active competition round
 */
export async function deactivateActiveCompetitionRound(): Promise<void> {
  try {
    const active = getActiveCompetitionRound();
    if (active) {
      active.isActive = false;
      active.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(active));
      
      const history = getStoredCompetitionRounds().map(r => r.id === active.id ? active : r);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }

    window.dispatchEvent(new CustomEvent('COMPETITION_ROUND_CHANGED', { detail: null }));
    triggerSync();
  } catch (err) {
    console.error('Error deactivating competition round:', err);
  }
}

/**
 * Broadcasts an official system message to all students announcing the competition round
 */
export async function broadcastRoundOfficialNotice(
  round: CompetitionRound,
  sender: User,
  allUsers: User[]
): Promise<void> {
  const students = allUsers.filter(u => u.role === 'STUDENT' && !u.isDeleted && u.isApproved !== false);
  if (students.length === 0) return;

  const startFa = formatJalali(round.startDate);
  const endFa = round.endDate ? ` تا ${formatJalali(round.endDate)}` : ' به بعد';
  
  const defaultText = `طلبه گرامی، دور جدید مسابقه معنوی و تربیتی «${round.title}» آغاز شد.\nکلیه امتیازات عبادی، سنن، برنامه‌های تهذیب و انضباط شما از تاریخ ${startFa}${endFa} محاسبه و در گردونه امتیازات مدرسه لحاظ می‌گردد.\nبرای مشاهده کارنامه و جدول سبقت در خیرات به بخش امتیازات مراجعه نمایید.`;
  const content = round.customAnnouncementText?.trim() || defaultText;

  const now = new Date().toISOString();

  // Create messages in DB for each student
  for (const student of students) {
    const msgId = `notice-round-${round.id}-${student.id}`;
    const existing = await db.messages.get(msgId);
    if (!existing) {
      const msg: Message = {
        id: msgId,
        senderId: sender.id,
        recipientId: student.id,
        type: 'OFFICIAL',
        subject: `🏆 آغاز دور مسابقه: ${round.title} (محاسبه امتیازات از ${startFa})`,
        content: content,
        date: now,
        isRead: false,
        synced: false
      };
      await db.messages.put(msg);
    }
  }

  triggerSync();
}
