export function formatJalali(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString || '—');
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return String(dateString || '—');
  }
}

/**
 * Formats any date safely to Persian locale (YYYY/MM/DD).
 * Never throws, even if date is invalid, undefined, null, or already a Shamsi string.
 */
export function safeFormatDateFa(dateString: any): string {
  if (!dateString) return '—';
  try {
    // If it's already a Persian date format like 1403/07/20
    const str = String(dateString).trim();
    if (/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(str)) {
      const year = parseInt(str.slice(0, 4), 10);
      if (year >= 1300 && year <= 1499) {
        return str.replace(/-/g, '/');
      }
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return String(dateString);
    }
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return String(dateString || '—');
  }
}

/**
 * Safely parses a birth date string (Gregorian ISO or Shamsi) into a valid Date object.
 * Returns null if invalid, ensuring DatePicker never crashes with Invalid Date.
 */
export function parseSafeBirthDate(val: string | undefined | null): Date | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  try {
    // Check if it's already a standard Gregorian ISO date
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      if (year >= 1900 && year <= 2100) {
        return d;
      }
    }

    // Check if it's a Shamsi string YYYY/MM/DD or YYYY-MM-DD
    const parts = trimmed.split(/[-/]/).map(Number);
    if (parts.length === 3 && parts[0] >= 1300 && parts[0] <= 1450) {
      // Rough approximation or convert to Date
      // 1380 Shamsi ~= 2001 Gregorian (+621 years)
      const approxGregYear = parts[0] + 621;
      const m = Math.max(0, Math.min(11, parts[1] - 1));
      const day = Math.max(1, Math.min(31, parts[2]));
      const approxDate = new Date(approxGregYear, m, day);
      if (!isNaN(approxDate.getTime())) {
        return approxDate;
      }
    }
    return null;
  } catch {
    return null;
  }
}
