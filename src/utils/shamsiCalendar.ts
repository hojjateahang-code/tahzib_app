// High-precision Jalali (Solar Hijri) Calendar Engine & National/Religious Occasions Database

export interface ShamsiDateInfo {
  jy: number;
  jm: number;
  jd: number;
  dayOfWeek: number; // 0: شنبه, 1: یکشنبه, 2: دوشنبه, 3: سه‌شنبه, 4: چهارشنبه, 5: پنج‌شنبه, 6: جمعه
  dayName: string;
  monthName: string;
  isHoliday: boolean;
  gregorianDateStr: string; // YYYY-MM-DD
}

export interface DayOccasion {
  id: string;
  title: string;
  type: 'RELIGIOUS' | 'NATIONAL' | 'SEMINARY';
  isHoliday: boolean;
  description?: string;
}

export const JALALI_MONTH_NAMES = [
  '',
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
] as const;

export const PERSIAN_WEEKDAYS = [
  { index: 0, name: 'شنبه', short: 'ش' },
  { index: 1, name: 'یکشنبه', short: 'ی' },
  { index: 2, name: 'دوشنبه', short: 'د' },
  { index: 3, name: 'سه‌شنبه', short: 'س' },
  { index: 4, name: 'چهارشنبه', short: 'چ' },
  { index: 5, name: 'پنج‌شنبه', short: 'پ' },
  { index: 6, name: 'جمعه', short: 'ج' },
];

/**
 * Standard Borkowski algorithm for Gregorian to Jalali conversion
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Standard Borkowski algorithm for Jalali to Gregorian conversion
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let sal_a: number[];
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) +
    78 + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd_m = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && days >= gd_m[gm]) {
    days -= gd_m[gm];
    gm++;
  }
  const gd = days + 1;
  return { gy, gm, gd };
}

export function isJalaliLeapYear(jy: number): boolean {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2090];
  let jp = breaks[0];
  let jm: number;
  let jump: number;
  let leap: number;
  if (jy < jp || jy >= breaks[breaks.length - 1]) return false;
  for (let i = 1; i < breaks.length; i++) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) {
      let N = jy - jp;
      let leapJ = Math.floor(N / 33) * 8 + Math.floor(((N % 33) + 3) / 4);
      let N_prev = N - 1;
      let leapJ_prev = Math.floor(N_prev / 33) * 8 + Math.floor(((N_prev % 33) + 3) / 4);
      return leapJ > leapJ_prev;
    }
    jp = jm;
  }
  return false;
}

export function getJalaliMonthLength(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  if (jm === 12) {
    return isJalaliLeapYear(jy) ? 30 : 29;
  }
  return 30;
}

/**
 * Returns Day of Week in Iranian convention:
 * 0: شنبه (Saturday)
 * 1: یکشنبه (Sunday)
 * 2: دوشنبه (Monday)
 * 3: سه‌شنبه (Tuesday)
 * 4: چهارشنبه (Wednesday)
 * 5: پنج‌شنبه (Thursday)
 * 6: جمعه (Friday)
 */
export function getPersianDayOfWeek(date: Date): number {
  const gDay = date.getDay(); // 0 is Sunday, 6 is Saturday
  return (gDay + 1) % 7;
}

/**
 * Parses or formats date to ShamsiDateInfo
 */
export function getShamsiInfo(inputDate: Date | string = new Date()): ShamsiDateInfo {
  let d: Date;
  if (typeof inputDate === 'string') {
    const parts = inputDate.split('T')[0].split('-').map(Number);
    if (parts.length === 3) {
      d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    } else {
      d = new Date(inputDate);
    }
  } else {
    d = inputDate;
  }

  const gy = d.getFullYear();
  const gm = d.getMonth() + 1;
  const gd = d.getDate();

  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
  const dayOfWeek = getPersianDayOfWeek(d);
  const dayName = PERSIAN_WEEKDAYS[dayOfWeek]?.name || 'شنبه';
  const monthName = JALALI_MONTH_NAMES[jm] || '';

  const occasions = getOccasionsForShamsiDate(jy, jm, jd);
  const isHoliday = dayOfWeek === 6 || occasions.some(o => o.isHoliday);

  const pad = (n: number) => String(n).padStart(2, '0');
  const gregorianDateStr = `${gy}-${pad(gm)}-${pad(gd)}`;

  return {
    jy,
    jm,
    jd,
    dayOfWeek,
    dayName,
    monthName,
    isHoliday,
    gregorianDateStr
  };
}

/**
 * Converts Shamsi year, month, day to Gregorian Date string "YYYY-MM-DD"
 */
export function shamsiToGregorianStr(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

// ==========================================
// National & Religious Occasions Database
// ==========================================

// Fixed Solar Hijri Occasions (مناسبت‌های ثابت خورشیدی)
const SOLAR_OCCASIONS: Record<string, { title: string; isHoliday: boolean; type: 'NATIONAL' | 'SEMINARY' }[]> = {
  '1-1': [{ title: 'جشن نوروز / آغاز سال نو', isHoliday: true, type: 'NATIONAL' }],
  '1-2': [{ title: 'عید نوروز', isHoliday: true, type: 'NATIONAL' }],
  '1-3': [{ title: 'عید نوروز', isHoliday: true, type: 'NATIONAL' }],
  '1-4': [{ title: 'عید نوروز', isHoliday: true, type: 'NATIONAL' }],
  '1-12': [{ title: 'روز جمهوری اسلامی ایران', isHoliday: true, type: 'NATIONAL' }],
  '1-13': [{ title: 'روز طبیعت (سیزده‌بدر)', isHoliday: true, type: 'NATIONAL' }],
  '2-2': [{ title: 'سالروز تأسیس سپاه پاسداران انقلاب اسلامی', isHoliday: false, type: 'NATIONAL' }],
  '2-12': [{ title: 'روز معلم و سالروز شهادت استاد مرتضی مطهری', isHoliday: false, type: 'SEMINARY' }],
  '2-24': [{ title: 'سالروز لغو امتیاز تنباکو به فتوای میرزای شیرازی', isHoliday: false, type: 'SEMINARY' }],
  '3-3': [{ title: 'فتح خرمشهر - روز مقاومت و ایثار', isHoliday: false, type: 'NATIONAL' }],
  '3-14': [{ title: 'رحلت حضرت امام خمینی (ره)', isHoliday: true, type: 'SEMINARY' }],
  '3-15': [{ title: 'قیام خونین ۱۵ خرداد فیضیه قم', isHoliday: true, type: 'SEMINARY' }],
  '4-7': [{ title: 'شهادت آیت‌الله بهشتی و ۷۲ تن از یاران - روز قوه قضائیه', isHoliday: false, type: 'SEMINARY' }],
  '4-8': [{ title: 'روز مبارزه با سلاح‌های شیمیایی و میکروبی', isHoliday: false, type: 'NATIONAL' }],
  '4-10': [{ title: 'روز صنعت و معدن', isHoliday: false, type: 'NATIONAL' }],
  '5-8': [{ title: 'بزرگداشت شیخ شهاب‌الدین سهروردی (شیخ اشراق)', isHoliday: false, type: 'SEMINARY' }],
  '5-14': [{ title: 'سالروز صدور فرمان مشروطیت', isHoliday: false, type: 'NATIONAL' }],
  '6-1': [{ title: 'روز پزشک (بزرگداشت ابوعلی سینا)', isHoliday: false, type: 'NATIONAL' }],
  '6-8': [{ title: 'شهادت شهید رجایی و باهنر - روز مبارزه با تروریسم', isHoliday: false, type: 'NATIONAL' }],
  '6-31': [{ title: 'آغاز هفته دفاع مقدس', isHoliday: false, type: 'NATIONAL' }],
  '7-1': [{ title: 'آغاز سال تحصیلی حوزه‌های علمیه و مدارس', isHoliday: false, type: 'SEMINARY' }],
  '7-20': [{ title: 'روز بزرگداشت حافظ شیرازی', isHoliday: false, type: 'NATIONAL' }],
  '8-13': [{ title: 'روز دانش‌آموز و روز ملی مبارزه با استکبار جهانی', isHoliday: false, type: 'NATIONAL' }],
  '8-24': [{ title: 'روز کتاب، کتابخوانی و بزرگداشت علامه طباطبایی', isHoliday: false, type: 'SEMINARY' }],
  '9-16': [{ title: 'روز دانشجو', isHoliday: false, type: 'NATIONAL' }],
  '9-27': [{ title: 'شهادت آیت‌الله دکتر مفتح - روز وحدت حوزه و دانشگاه', isHoliday: false, type: 'SEMINARY' }],
  '10-9': [{ title: 'روز بصیرت و میثاق امت با ولایت', isHoliday: false, type: 'NATIONAL' }],
  '10-19': [{ title: 'قیام خونین طلاب و مردم قم در سال ۱۳۵۶', isHoliday: false, type: 'SEMINARY' }],
  '11-12': [{ title: 'بازگشت حضرت امام خمینی به میهن و آغاز دهه فجر', isHoliday: false, type: 'NATIONAL' }],
  '11-22': [{ title: 'سالروز پیروزی شکوهمند انقلاب اسلامی ایران', isHoliday: true, type: 'NATIONAL' }],
  '12-14': [{ title: 'روز احسان و نیکوکاری', isHoliday: false, type: 'NATIONAL' }],
  '12-29': [{ title: 'روز ملی شدن صنعت نفت ایران', isHoliday: true, type: 'NATIONAL' }],
};

// Islamic Occasions mapped per Shamsi Academic Years (1403, 1404, 1405, 1406)
// Key format: `${jy}-${jm}-${jd}`
const RELIGIOUS_OCCASIONS_MAP: Record<string, { title: string; isHoliday: boolean; type: 'RELIGIOUS' | 'SEMINARY' }[]> = {
  // Year 1403 & 1404
  '1403-1-23': [{ title: 'عید سعید فطر', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-1-24': [{ title: 'تعطیل به مناسبت عید سعید فطر', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-2-15': [{ title: 'شهادت حضرت امام جعفر صادق (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-3-28': [{ title: 'عید سعید قربان', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-4-5': [{ title: 'عید بزرگ غدیر خم', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-4-25': [{ title: 'تاسوعای حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-4-26': [{ title: 'عاشورای حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-6-4': [{ title: 'اربعین حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-6-12': [{ title: 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-6-14': [{ title: 'شهادت حضرت امام رضا (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-6-22': [{ title: 'شهادت امام حسن عسکری (ع) و آغاز امامت حضرت مهدی (عج)', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-6-31': [{ title: 'میلاد رسول اکرم (ص) و امام جعفر صادق (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-9-15': [{ title: 'شهادت حضرت فاطمه زهرا (س)', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-10-25': [{ title: 'ولادت حضرت امیرالمؤمنین امام علی (ع) و آغاز ایام اعتکاف', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-11-9': [{ title: 'مبعث حضرت رسول اکرم (ص)', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-11-26': [{ title: 'ولادت حضرت قائم عجل‌الله تعالی فرجه (نیمه شعبان)', isHoliday: true, type: 'RELIGIOUS' }],
  '1403-12-30': [{ title: 'ضربت خوردن حضرت علی (ع) - شب قدر اول', isHoliday: false, type: 'RELIGIOUS' }],
  
  // Year 1404 (Current Year)
  '1404-1-1': [{ title: 'شهادت حضرت امیرالمؤمنین علی (ع) - شب قدر', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-1-11': [{ title: 'عید سعید فطر', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-1-12': [{ title: 'تعطیل به مناسبت عید سعید فطر', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-2-4': [{ title: 'شهادت حضرت امام جعفر صادق (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-2-9': [{ title: 'ولادت حضرت معصومه (س) - آغاز دهه کرامت', isHoliday: false, type: 'SEMINARY' }],
  '1404-2-19': [{ title: 'ولادت باسعادت حضرت امام رضا (ع)', isHoliday: false, type: 'RELIGIOUS' }],
  '1404-3-16': [{ title: 'عید سعید قربان', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-3-24': [{ title: 'عید سعید غدیر خم - عید ولایت و امامت', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-4-14': [{ title: 'تاسوعای حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-4-15': [{ title: 'عاشورای حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-5-24': [{ title: 'اربعین حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-6-1': [{ title: 'رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-6-3': [{ title: 'شهادت حضرت امام علی بن موسی الرضا (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-6-11': [{ title: 'شهادت امام حسن عسکری (ع) و آغاز امامت حضرت ولیعصر (عج)', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-6-20': [{ title: 'ولادت حضرت محمد (ص) و امام جعفر صادق (ع) - پایان هفته وحدت', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-8-1': [{ title: 'ولادت حضرت زینب کبری (س)', isHoliday: false, type: 'RELIGIOUS' }],
  '1404-9-3': [{ title: 'شهادت حضرت فاطمه زهرا (س)', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-10-13': [{ title: 'ولادت با سعادت حضرت امیرالمؤمنین امام علی (ع) و آغاز ایام البیض', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-10-27': [{ title: 'مبعث حضرت رسول اکرم (ص)', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-11-15': [{ title: 'ولادت با سعادت حضرت مهدی صاحب الزمان (عج) - نیمه شعبان', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-12-19': [{ title: 'ضربت خوردن حضرت امیرالمؤمنین علی (ع) - شب قدر اول', isHoliday: false, type: 'RELIGIOUS' }],
  '1404-12-21': [{ title: 'شهادت حضرت علی (ع) - شب بیست و یکم ماه مبارک رمضان', isHoliday: true, type: 'RELIGIOUS' }],
  '1404-12-23': [{ title: 'شب بیست و سوم ماه مبارک رمضان (شب قدر سوم)', isHoliday: false, type: 'RELIGIOUS' }],
  '1404-12-30': [{ title: 'عید سعید فطر', isHoliday: true, type: 'RELIGIOUS' }],

  // Year 1405
  '1405-1-1': [{ title: 'تعطیل به مناسبت عید سعید فطر', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-1-24': [{ title: 'شهادت حضرت امام جعفر صادق (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-3-6': [{ title: 'عید سعید قربان', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-3-14': [{ title: 'عید سعید غدیر خم', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-4-3': [{ title: 'تاسوعای حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-4-4': [{ title: 'عاشورای حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-5-13': [{ title: 'اربعین حسینی', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-5-21': [{ title: 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-5-23': [{ title: 'شهادت حضرت امام رضا (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-5-31': [{ title: 'شهادت امام حسن عسکری (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-6-9': [{ title: 'میلاد رسول اکرم (ص) و امام جعفر صادق (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-8-23': [{ title: 'شهادت حضرت فاطمه زهرا (س)', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-10-3': [{ title: 'ولادت حضرت امیرالمؤمنین امام علی (ع)', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-10-17': [{ title: 'مبعث حضرت رسول اکرم (ص)', isHoliday: true, type: 'RELIGIOUS' }],
  '1405-11-4': [{ title: 'ولادت حضرت مهدی (عج) - نیمه شعبان', isHoliday: true, type: 'RELIGIOUS' }],
};

/**
 * Returns all occasions (national and religious) for a specific Shamsi day
 */
export function getOccasionsForShamsiDate(jy: number, jm: number, jd: number): DayOccasion[] {
  const occasions: DayOccasion[] = [];

  // 1. Check fixed Solar Hijri national occasions
  const solarKey = `${jm}-${jd}`;
  if (SOLAR_OCCASIONS[solarKey]) {
    SOLAR_OCCASIONS[solarKey].forEach((item, idx) => {
      occasions.push({
        id: `solar_${solarKey}_${idx}`,
        title: item.title,
        type: item.type,
        isHoliday: item.isHoliday
      });
    });
  }

  // 2. Check year-specific Religious occasions
  const relKey = `${jy}-${jm}-${jd}`;
  if (RELIGIOUS_OCCASIONS_MAP[relKey]) {
    RELIGIOUS_OCCASIONS_MAP[relKey].forEach((item, idx) => {
      occasions.push({
        id: `rel_${relKey}_${idx}`,
        title: item.title,
        type: item.type,
        isHoliday: item.isHoliday
      });
    });
  }

  return occasions;
}

/**
 * Generates the full calendar month matrix (array of weeks, each containing 7 day slots)
 */
export interface CalendarDayCell {
  jy: number;
  jm: number;
  jd: number;
  dayOfWeek: number;
  dayName: string;
  monthName: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFriday: boolean;
  isHoliday: boolean;
  gregorianDateStr: string;
  occasions: DayOccasion[];
}

export function getShamsiMonthCalendar(jy: number, jm: number): CalendarDayCell[][] {
  const daysInMonth = getJalaliMonthLength(jy, jm);
  
  // Find weekday of first day of this month
  const firstDayGreg = jalaliToGregorian(jy, jm, 1);
  const firstDate = new Date(firstDayGreg.gy, firstDayGreg.gm - 1, firstDayGreg.gd, 12, 0, 0);
  const startDayOfWeek = getPersianDayOfWeek(firstDate); // 0 (Sat) to 6 (Fri)

  const todayInfo = getShamsiInfo(new Date());

  const weeks: CalendarDayCell[][] = [];
  let currentWeek: CalendarDayCell[] = [];

  // Previous month trailing days
  if (startDayOfWeek > 0) {
    const prevM = jm === 1 ? 12 : jm - 1;
    const prevY = jm === 1 ? jy - 1 : jy;
    const prevDaysCount = getJalaliMonthLength(prevY, prevM);
    const startPrevDay = prevDaysCount - startDayOfWeek + 1;

    for (let d = startPrevDay; d <= prevDaysCount; d++) {
      const gDateStr = shamsiToGregorianStr(prevY, prevM, d);
      const dow = (startDayOfWeek - (prevDaysCount - d + 1) + 7) % 7;
      const occ = getOccasionsForShamsiDate(prevY, prevM, d);
      currentWeek.push({
        jy: prevY,
        jm: prevM,
        jd: d,
        dayOfWeek: dow,
        dayName: PERSIAN_WEEKDAYS[dow]?.name || '',
        monthName: JALALI_MONTH_NAMES[prevM] || '',
        isCurrentMonth: false,
        isToday: false,
        isFriday: dow === 6,
        isHoliday: dow === 6 || occ.some(o => o.isHoliday),
        gregorianDateStr: gDateStr,
        occasions: occ
      });
    }
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const gDateStr = shamsiToGregorianStr(jy, jm, day);
    const parts = gDateStr.split('-').map(Number);
    const dObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const dow = getPersianDayOfWeek(dObj);
    const isToday = jy === todayInfo.jy && jm === todayInfo.jm && day === todayInfo.jd;
    const occ = getOccasionsForShamsiDate(jy, jm, day);
    const isHoliday = dow === 6 || occ.some(o => o.isHoliday);

    currentWeek.push({
      jy,
      jm,
      jd: day,
      dayOfWeek: dow,
      dayName: PERSIAN_WEEKDAYS[dow]?.name || '',
      monthName: JALALI_MONTH_NAMES[jm] || '',
      isCurrentMonth: true,
      isToday,
      isFriday: dow === 6,
      isHoliday,
      gregorianDateStr: gDateStr,
      occasions: occ
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Next month leading days to complete the last week
  if (currentWeek.length > 0) {
    const nextM = jm === 12 ? 1 : jm + 1;
    const nextY = jm === 12 ? jy + 1 : jy;
    let nextDay = 1;
    while (currentWeek.length < 7) {
      const gDateStr = shamsiToGregorianStr(nextY, nextM, nextDay);
      const dow = currentWeek.length;
      const occ = getOccasionsForShamsiDate(nextY, nextM, nextDay);
      currentWeek.push({
        jy: nextY,
        jm: nextM,
        jd: nextDay,
        dayOfWeek: dow,
        dayName: PERSIAN_WEEKDAYS[dow]?.name || '',
        monthName: JALALI_MONTH_NAMES[nextM] || '',
        isCurrentMonth: false,
        isToday: false,
        isFriday: dow === 6,
        isHoliday: dow === 6 || occ.some(o => o.isHoliday),
        gregorianDateStr: gDateStr,
        occasions: occ
      });
      nextDay++;
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Returns the 7 days of the Persian week (شنبه تا جمعه) containing referenceDate
 */
export function getPersianWeekDays(referenceDate: Date | string = new Date()): CalendarDayCell[] {
  let refD: Date;
  if (typeof referenceDate === 'string') {
    const parts = referenceDate.split('T')[0].split('-').map(Number);
    refD = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  } else {
    refD = new Date(referenceDate);
  }

  const dow = getPersianDayOfWeek(refD); // 0 (Sat) to 6 (Fri)
  const todayInfo = getShamsiInfo(new Date());

  const days: CalendarDayCell[] = [];
  // Go back to Saturday
  const satDate = new Date(refD);
  satDate.setDate(satDate.getDate() - dow);

  for (let i = 0; i < 7; i++) {
    const currD = new Date(satDate);
    currD.setDate(currD.getDate() + i);
    const gy = currD.getFullYear();
    const gm = currD.getMonth() + 1;
    const gd = currD.getDate();
    const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
    const occ = getOccasionsForShamsiDate(jy, jm, jd);
    const isToday = jy === todayInfo.jy && jm === todayInfo.jm && jd === todayInfo.jd;
    const pad = (n: number) => String(n).padStart(2, '0');
    const gDateStr = `${gy}-${pad(gm)}-${pad(gd)}`;

    days.push({
      jy,
      jm,
      jd,
      dayOfWeek: i,
      dayName: PERSIAN_WEEKDAYS[i]?.name || '',
      monthName: JALALI_MONTH_NAMES[jm] || '',
      isCurrentMonth: true,
      isToday,
      isFriday: i === 6,
      isHoliday: i === 6 || occ.some(o => o.isHoliday),
      gregorianDateStr: gDateStr,
      occasions: occ
    });
  }

  return days;
}

/**
 * Formats a date into full readable Persian string:
 * e.g. "سه‌شنبه ۲۲ مهر ۱۴۰۴"
 */
export function formatShamsiFull(dateInput: Date | string = new Date()): string {
  const info = getShamsiInfo(dateInput);
  return `${info.dayName} ${info.jd} ${info.monthName} ${info.jy}`;
}

export function formatShamsiShort(dateInput: Date | string = new Date()): string {
  const info = getShamsiInfo(dateInput);
  return `${info.jd} ${info.monthName} ${info.jy}`;
}
