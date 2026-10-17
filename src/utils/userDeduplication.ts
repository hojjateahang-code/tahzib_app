import { db } from '../db';
import { User, Assessment } from '../types';

/**
 * تبدیل ارقام فارسی و عربی به انگلیسی
 */
export function toEnglishDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const s = String(str);
  return s
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
}

/**
 * پاکسازی و استانداردسازی کد ملی (حذف فاصله، خط تیره و ارقام غیرانگلیسی)
 */
export function cleanNationalId(id: string | undefined | null): string {
  if (!id) return '';
  const eng = toEnglishDigits(id);
  const digits = eng.replace(/\D/g, '').trim();
  return digits;
}

export const normalizeNationalId = cleanNationalId;

/**
 * پاکسازی و استانداردسازی شماره تلفن همراه
 * پشتیبانی از 0912..., 912..., +98912..., 0098912...
 */
export function cleanPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const eng = toEnglishDigits(phone);
  let digits = eng.replace(/\D/g, '').trim();
  if (digits.startsWith('0098')) {
    digits = '0' + digits.slice(4);
  } else if (digits.startsWith('98') && digits.length === 12) {
    digits = '0' + digits.slice(2);
  } else if (!digits.startsWith('0') && digits.length === 10 && digits.startsWith('9')) {
    digits = '0' + digits;
  }
  return digits;
}

/**
 * بررسی تطابق رمز عبور (پشتیبانی از فرمت‌های مختلف شماره همراه)
 */
export function matchPasswordOrPhone(entered: string, stored: string): boolean {
  if (!entered || !stored) return false;
  const cleanEntered = toEnglishDigits(entered).trim();
  const cleanStored = toEnglishDigits(stored).trim();

  // تطابق مستقیم
  if (cleanEntered === cleanStored) return true;

  // تطابق به عنوان شماره موبایل با/بدون صفر
  const phoneEntered = cleanPhoneNumber(cleanEntered);
  const phoneStored = cleanPhoneNumber(cleanStored);
  if (phoneEntered && phoneStored && phoneEntered === phoneStored) return true;

  // تطابق بدون صفر اول
  const trimZeroEntered = cleanEntered.replace(/^0+/, '');
  const trimZeroStored = cleanStored.replace(/^0+/, '');
  if (trimZeroEntered && trimZeroStored && trimZeroEntered === trimZeroStored) return true;

  return false;
}

/**
 * کلید اصلی استاندارد برای کاربر بر مبنای کد ملی
 */
export function getCanonicalUserId(user: Partial<User>): string {
  const nat = cleanNationalId(user.nationalId || user.username);
  if (user.role && user.role !== 'STUDENT') {
    // برای مدیران و مسئولان فنی شناسه‌های ثابت حفظ شوند
    if (user.username === 'admin' || user.username === 'fanni' || user.role === 'TECH_ADMIN') {
      return 'u0';
    }
    if (user.id && (user.id === 'u_director' || user.id === 'u_vp' || user.id.startsWith('u_'))) {
      return user.id;
    }
  }
  if (nat) {
    return `user_${nat}`;
  }
  return user.id || `user_${Date.now()}`;
}

/**
 * ادغام خودکار حساب‌های تکراری با یک کد ملی در دیتابیس لوکال
 * و به‌روزرسانی وابستگی‌ها (ارزیابی‌ها، گزارش‌ها، برنامه‌ها، پیام‌ها)
 */
export async function deduplicateAndMigrateUsers(): Promise<number> {
  try {
    const allUsers = await db.users.toArray();
    if (allUsers.length === 0) return 0;

    const usersByNationalId = new Map<string, User[]>();

    for (const u of allUsers) {
      const nat = cleanNationalId(u.nationalId || (u.role === 'STUDENT' ? u.username : ''));
      if (nat) {
        const list = usersByNationalId.get(nat) || [];
        list.push(u);
        usersByNationalId.set(nat, list);
      }
    }

    let mergedCount = 0;

    for (const [nat, group] of usersByNationalId.entries()) {
      if (group.length <= 1) {
        // حتی اگر یک رکورد است، اطمینان از فرمت استاندارد کد ملی
        const single = group[0];
        const updates: Partial<User> = {};
        if (single.nationalId !== nat) updates.nationalId = nat;
        if (single.role === 'STUDENT' && single.username !== nat) updates.username = nat;
        if (Object.keys(updates).length > 0) {
          await db.users.update(single.id, updates);
        }
        continue;
      }

      // گروه دارای چند حساب با یک کد ملی است! ادغام الزامی است.
      console.log(`[DEDUPLICATION] ادغام ${group.length} حساب برای کد ملی: ${nat}`);

      // انتخاب حساب برنده (حسابی که تاریخ آپدیت جدیدتر یا اطلاعات کامل‌تر دارد)
      let winner = group[0];
      for (let i = 1; i < group.length; i++) {
        const cand = group[i];
        const winnerScore = (winner.eitaaId ? 2 : 0) + (winner.eitaaUserId ? 2 : 0) + (winner.phone ? 1 : 0);
        const candScore = (cand.eitaaId ? 2 : 0) + (cand.eitaaUserId ? 2 : 0) + (cand.phone ? 1 : 0);
        if (candScore > winnerScore || ((cand.updatedAt || 0) > (winner.updatedAt || 0))) {
          winner = cand;
        }
      }

      const loserIds = group.filter(u => u.id !== winner.id).map(u => u.id);

      // ادغام ویژگی‌های سایر حساب‌ها در حساب برنده
      const mergedUpdates: Partial<User> = {
        nationalId: nat,
        username: winner.role === 'STUDENT' ? nat : (winner.username || nat),
        phone: cleanPhoneNumber(winner.phone) || group.map(u => cleanPhoneNumber(u.phone)).find(Boolean) || winner.phone,
        eitaaId: winner.eitaaId || group.map(u => u.eitaaId).find(Boolean),
        eitaaUserId: winner.eitaaUserId || group.map(u => u.eitaaUserId).find(Boolean),
        updatedAt: Math.max(...group.map(u => u.updatedAt || 0), Date.now()),
        isApproved: group.some(u => u.isApproved !== false)
      };

      await db.users.update(winner.id, mergedUpdates);

      // انتقال رکوردهای وابسته از شناسه‌های بازنده به برنده
      for (const oldId of loserIds) {
        // ۱. ارزیابی‌ها (Assessments)
        const oldAssessments = await db.assessments.where({ studentId: oldId }).toArray();
        for (const ass of oldAssessments) {
          const newAssId = `ass_${winner.id}_${ass.date}`;
          const existingWinnerAss = await db.assessments.get(newAssId) || 
            await db.assessments.where({ studentId: winner.id }).filter(a => a.date === ass.date).first();

          if (existingWinnerAss) {
            // ترکیب ارزیابی‌ها
            const mergedUpdate: Partial<Assessment> = {
              screenTime: existingWinnerAss.screenTime || ass.screenTime,
              customTasks: { ...(ass.customTasks || {}), ...(existingWinnerAss.customTasks || {}) },
              tahzibProgramAnswers: { ...(ass.tahzibProgramAnswers || {}), ...(existingWinnerAss.tahzibProgramAnswers || {}) },
              notes: { ...(ass.notes || {}), ...(existingWinnerAss.notes || {}) },
              namazSobh: existingWinnerAss.namazSobh || ass.namazSobh,
              namazZohr: existingWinnerAss.namazZohr || ass.namazZohr,
              namazAsr: existingWinnerAss.namazAsr || ass.namazAsr,
              namazMaghreb: existingWinnerAss.namazMaghreb || ass.namazMaghreb,
              namazEsha: existingWinnerAss.namazEsha || ass.namazEsha,
              saharKhizi: existingWinnerAss.saharKhizi !== undefined ? existingWinnerAss.saharKhizi : ass.saharKhizi,
              telavatNoor: existingWinnerAss.telavatNoor !== undefined ? existingWinnerAss.telavatNoor : ass.telavatNoor,
              classAttendance: existingWinnerAss.classAttendance || ass.classAttendance,
              mabahese: existingWinnerAss.mabahese || ass.mabahese,
              earlySleep: existingWinnerAss.earlySleep !== undefined ? existingWinnerAss.earlySleep : ass.earlySleep,
              updatedAt: Date.now(),
              synced: false
            };
            await db.assessments.update(existingWinnerAss.id, mergedUpdate);
            await db.assessments.delete(ass.id);
          } else {
            await db.assessments.update(ass.id, {
              id: newAssId,
              studentId: winner.id,
              updatedAt: Date.now(),
              synced: false
            });
          }
        }

        // ۲. عادات شخصی (Personal Habits)
        const oldHabits = await db.personalHabits.where({ studentId: oldId }).toArray();
        for (const h of oldHabits) {
          await db.personalHabits.update(h.id, { studentId: winner.id, updatedAt: Date.now() });
        }

        // ۳. جلسات مشاوره (Appointments)
        const oldAppts = await db.appointments.where({ studentId: oldId }).toArray();
        for (const a of oldAppts) {
          await db.appointments.update(a.id, { studentId: winner.id, updatedAt: Date.now() });
        }

        // ۴. پیام‌ها (Messages)
        const sentMsgs = await db.messages.where({ senderId: oldId }).toArray();
        for (const m of sentMsgs) {
          await db.messages.update(m.id, { senderId: winner.id });
        }
        const recMsgs = await db.messages.where({ recipientId: oldId }).toArray();
        for (const m of recMsgs) {
          await db.messages.update(m.id, { recipientId: winner.id });
        }

        // ۵. گزارش‌ها (Reports)
        const studentReports = await db.reports.where({ studentId: oldId }).toArray();
        for (const r of studentReports) {
          await db.reports.update(r.id, { studentId: winner.id });
        }

        // در نهایت حذف کاربر تکراری بازنده
        await db.users.delete(oldId);
      }

      mergedCount += loserIds.length;
    }

    // پاکسازی داده‌های شبیه‌سازی کاذب گذشته
    await sanitizeCorruptedAssessments().catch(() => null);

    if (mergedCount > 0) {
      console.log(`[DEDUPLICATION] موفقیت: ${mergedCount} حساب کاربری تکراری با موفقیت ادغام شدند.`);
    }

    return mergedCount;
  } catch (err) {
    console.error('Error during user deduplication:', err);
    return 0;
  }
}

/**
 * پاکسازی داده‌های کاذب و شبیه‌سازی گذشته در ارزیابی‌ها
 */
export async function sanitizeCorruptedAssessments(): Promise<void> {
  try {
    const all = await db.assessments.toArray();
    for (const ass of all) {
      if (ass.screenTime && ass.screenTime.dynamicApps) {
        const apps = ass.screenTime.dynamicApps;
        // بررسی وجود الگوی داده‌های تستی قدیمی
        const hasFakeMock = (apps['بازی شطرنج و فکری'] !== undefined && apps['اینستاگرام'] !== undefined && apps['روبیکا'] !== undefined);
        if (hasFakeMock) {
          const cleanedApps = { ...apps };
          delete cleanedApps['اینستاگرام'];
          delete cleanedApps['روبیکا'];
          delete cleanedApps['بازی شطرنج و فکری'];
          delete cleanedApps['سامانه شاد'];
          const cleanedNight = { ...(ass.screenTime.nightApps || {}) };
          delete cleanedNight['اینستاگرام'];

          const totalMins = Object.values(cleanedApps).reduce((a, b) => a + (Number(b) || 0), 0);
          const nightMins = Object.values(cleanedNight).reduce((a, b) => a + (Number(b) || 0), 0);

          await db.assessments.update(ass.id, {
            screenTime: {
              ...ass.screenTime,
              totalMinutes: totalMins,
              nightTotalMinutes: nightMins,
              dynamicApps: cleanedApps,
              nightApps: cleanedNight
            },
            updatedAt: Date.now()
          });
        }
      }
    }
  } catch (e) {
    console.warn('Error sanitizing assessments:', e);
  }
}

export const migrateAndDeduplicateUsers = deduplicateAndMigrateUsers;
