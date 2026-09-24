import type { Assessment } from '../types';

/**
 * Returns today's date in local calendar format YYYY-MM-DD
 */
export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday's date in local calendar format YYYY-MM-DD
 */
export function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Robustly checks if two date representations point to the same calendar day
 */
export function isSameDay(date1?: string | Date | null, date2?: string | Date | null): boolean {
  if (!date1 || !date2) return false;
  
  const str1 = typeof date1 === 'string' ? date1.split('T')[0] : getTodayDateStr();
  const str2 = typeof date2 === 'string' ? date2.split('T')[0] : getTodayDateStr();
  
  if (str1 === str2) return true;

  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  } catch {
    return false;
  }
}

/**
 * Verifies if a student has ACTUALLY filled in and submitted questions
 * (Distinguishes between genuine answers and empty template records)
 */
export function isAssessmentSubmitted(a?: Assessment | null): boolean {
  if (!a || a.isDeleted) return false;

  // 1. Prayers check
  const prayers = [a.namazSobh, a.namazZohr, a.namazAsr, a.namazMaghreb, a.namazEsha];
  const hasPrayerAnswer = prayers.some(p => p && p !== 'NONE');
  if (hasPrayerAnswer) return true;

  // 2. Standard routine checks
  if (a.saharKhizi !== undefined || a.telavatNoor !== undefined || a.earlySleep !== undefined) return true;
  if (a.classAttendance === true || a.classAttendance === 'FULL' || a.classAttendance === 'PARTIAL') return true;
  if (a.mabahese === true || a.mabahese === 'FULL' || a.mabahese === 'PARTIAL') return true;

  // 3. Custom personal habits/cheleh
  if (a.customTasks && Object.keys(a.customTasks).length > 0) {
    const hasCustomVal = Object.values(a.customTasks).some(val => val !== undefined && val !== false && val !== '');
    if (hasCustomVal) return true;
  }

  // 4. Digital Wellbeing / Screen Time
  if (a.screenTime && (a.screenTime.totalMinutes > 0 || (a.screenTime.apps && Object.values(a.screenTime.apps).some(m => (m || 0) > 0)))) {
    return true;
  }

  // 5. Notes
  if (a.notes && Object.values(a.notes).some(n => Boolean(n && n.trim()))) {
    return true;
  }

  return false;
}

/**
 * Calculate accurate score out of 100 for an assessment
 */
export function getAssessmentScore(a: any): number {
  if (!a) return 0;
  if (!isAssessmentSubmitted(a)) return 0;
  if (typeof a.score === 'number') return a.score;

  let score = 50;
  const prayers = [a.namazSobh, a.namazZohr, a.namazAsr, a.namazMaghreb, a.namazEsha];
  prayers.forEach(p => {
    if (p === 'ADA_JAMAAT') score += 8;
    else if (p === 'ADA_FORADA') score += 6;
  });
  if (a.saharKhizi) score += 5;
  if (a.telavatNoor) score += 5;
  if (a.classAttendance === true || a.classAttendance === 'FULL') score += 5;
  return Math.min(100, Math.max(0, score));
}
