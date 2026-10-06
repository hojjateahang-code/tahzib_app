import * as XLSX from 'xlsx';
import type { User, Role } from '../types';

export interface ParsedUserRow {
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  roleTitle: string;
  nationalId: string;
  phone: string;
  base?: number;
  eitaaId?: string;
  fatherName?: string;
  address?: string;
  isValid: boolean;
  validationError?: string;
}

export const ROLE_TRANSLATIONS: Record<string, Role> = {
  'طلبه': 'STUDENT',
  'دانش پژوه': 'STUDENT',
  'دانش‌پژوه': 'STUDENT',
  'STUDENT': 'STUDENT',

  'استاد راهنما': 'MENTOR',
  'استادراهنما': 'MENTOR',
  'راهنما': 'MENTOR',
  'مسئول پایه': 'MENTOR',
  'MENTOR': 'MENTOR',

  'مشاور': 'COUNSELOR',
  'استاد مشاور': 'COUNSELOR',
  'COUNSELOR': 'COUNSELOR',

  'معاون تهذیب': 'VICE_PRINCIPAL',
  'معاون': 'VICE_PRINCIPAL',
  'VICE_PRINCIPAL': 'VICE_PRINCIPAL',

  'مدیر مدرسه': 'DIRECTOR',
  'مدیر': 'DIRECTOR',
  'DIRECTOR': 'DIRECTOR',

  'مسئول فنی': 'TECH_ADMIN',
  'مدیر سیستم': 'TECH_ADMIN',
  'پشتیبان': 'TECH_ADMIN',
  'TECH_ADMIN': 'TECH_ADMIN',
};

export const ROLE_PERSIAN_TITLES: Record<Role, string> = {
  STUDENT: 'طلبه',
  MENTOR: 'استاد راهنما',
  COUNSELOR: 'مشاور',
  VICE_PRINCIPAL: 'معاون تهذیب',
  DIRECTOR: 'مدیر مدرسه',
  TECH_ADMIN: 'مسئول فنی (مدیر سیستم)',
};

/**
 * دانلود نمونه فایل اکسل استاندارد برای ثبت گروهی طلاب و اساتید
 */
export function downloadSampleUserExcel() {
  const sampleData = [
    {
      'نام': 'علی',
      'نام خانوادگی': 'محمدی',
      'نقش': 'طلبه',
      'کد ملی': '1234567890',
      'شماره تماس': '09121111111',
      'پایه تحصیلی': 1,
      'آیدی ایتا': '@a_mohammadi',
      'نام پدر': 'حسین',
      'آدرس': 'قم، خیابان صفائیه'
    },
    {
      'نام': 'حسن',
      'نام خانوادگی': 'احمدی',
      'نقش': 'استاد راهنما',
      'کد ملی': '0987654321',
      'شماره تماس': '09122222222',
      'پایه تحصیلی': 1,
      'آیدی ایتا': '@h_ahmadi',
      'نام پدر': 'رضا',
      'آدرس': 'قم، سمیه'
    },
    {
      'نام': 'محمدرضا',
      'نام خانوادگی': 'رضایی',
      'نقش': 'مشاور',
      'کد ملی': '1122334455',
      'شماره تماس': '09123333333',
      'پایه تحصیلی': '',
      'آیدی ایتا': '@m_rezaei',
      'نام پدر': 'علی',
      'آدرس': 'قم، نیروگاه'
    },
    {
      'نام': 'سید علی',
      'نام خانوادگی': 'حسینی',
      'نقش': 'معاون تهذیب',
      'کد ملی': '5544332211',
      'شماره تماس': '09124444444',
      'پایه تحصیلی': '',
      'آیدی ایتا': '@s_hoseini',
      'نام پدر': 'اکبر',
      'آدرس': 'قم، پردیسان'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // تنظیم عرض ستون‌ها برای خوانایی بهتر
  worksheet['!cols'] = [
    { wch: 15 }, // نام
    { wch: 18 }, // نام خانوادگی
    { wch: 15 }, // نقش
    { wch: 15 }, // کد ملی
    { wch: 15 }, // شماره تماس
    { wch: 12 }, // پایه تحصیلی
    { wch: 18 }, // آیدی ایتا
    { wch: 15 }, // نام پدر
    { wch: 25 }, // آدرس
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'لیست_کاربران');

  // خروجی اکسل
  XLSX.writeFile(workbook, 'نمونه_فایل_ثبت_کاربران_سامانه_تهذیب.xlsx');
}

/**
 * خروجی گرفتن اکسل از لیست کاربران فعلی
 */
export function exportUsersToExcel(users: User[], filename = 'لیست_کاربران_سامانه_تهذیب.xlsx') {
  const data = users.map(u => {
    let fName = u.firstName || '';
    let lName = u.lastName || '';
    if (!fName && !lName && u.name) {
      const parts = u.name.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    return {
      'کد کاربری': u.id,
      'نام': fName,
      'نام خانوادگی': lName,
      'نام و نام خانوادگی کامل': u.name,
      'نقش': ROLE_PERSIAN_TITLES[u.role] || u.role,
      'کد ملی': u.nationalId || u.username || '',
      'شماره تماس': u.phone || u.password || '',
      'پایه تحصیلی': u.base || '',
      'آیدی ایتا': u.eitaaId || '',
      'شناسه عددی ایتا': u.eitaaUserId || '',
      'نام پدر': u.fatherName || '',
      'آدرس': u.address || '',
      'وضعیت تایید': u.isApproved ? 'تایید شده' : 'در انتظار تایید'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
    { wch: 15 }, { wch: 25 }, { wch: 15 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'کاربران');
  XLSX.writeFile(workbook, filename);
}

/**
 * پارس کردن و استخراج اطلاعات از فایل اکسل آپلود شده
 */
export async function parseUsersFromExcelFile(file: File): Promise<ParsedUserRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedRows: ParsedUserRow[] = rawRows.map((row, index) => {
          // استخراج مقادیر با پشتیبانی از نام ستون‌های فارسی و انگلیسی
          const rawFirstName = String(
            row['نام'] || row['firstname'] || row['first_name'] || row['firstName'] || ''
          ).trim();

          const rawLastName = String(
            row['نام خانوادگی'] || row['نام‌خانوادگی'] || row['lastname'] || row['last_name'] || row['lastName'] || ''
          ).trim();

          let rawFullName = String(
            row['نام و نام خانوادگی'] || row['نام کامل'] || row['name'] || ''
          ).trim();

          let firstName = rawFirstName;
          let lastName = rawLastName;

          if ((!firstName || !lastName) && rawFullName) {
            const parts = rawFullName.split(' ');
            if (!firstName) firstName = parts[0] || '';
            if (!lastName) lastName = parts.slice(1).join(' ') || '';
          }

          if (!rawFullName) {
            rawFullName = `${firstName} ${lastName}`.trim();
          }

          const rawRoleStr = String(
            row['نقش'] || row['نقش کاربری'] || row['role'] || 'طلبه'
          ).trim();

          const roleKey = Object.keys(ROLE_TRANSLATIONS).find(
            k => k.toLowerCase() === rawRoleStr.toLowerCase()
          );

          const role: Role = roleKey ? ROLE_TRANSLATIONS[roleKey] : 'STUDENT';
          const roleTitle = ROLE_PERSIAN_TITLES[role] || 'طلبه';

          const nationalId = String(
            row['کد ملی'] || row['کدملی'] || row['nationalId'] || row['national_id'] || row['username'] || ''
          ).trim();

          const phone = String(
            row['شماره تماس'] || row['شماره همراه'] || row['موبایل'] || row['phone'] || row['mobile'] || ''
          ).trim();

          const baseRaw = row['پایه تحصیلی'] || row['پایه'] || row['base'] || '';
          const baseNum = Number(baseRaw);
          const base = !isNaN(baseNum) && baseNum >= 1 && baseNum <= 6 ? baseNum : undefined;

          let eitaaId = String(
            row['آیدی ایتا'] || row['شناسه ایتا'] || row['ایتا'] || row['eitaaId'] || ''
          ).trim();
          if (eitaaId && !eitaaId.startsWith('@') && !eitaaId.startsWith('user_')) {
            eitaaId = `@${eitaaId}`;
          }

          const fatherName = String(
            row['نام پدر'] || row['fatherName'] || ''
          ).trim();

          const address = String(
            row['آدرس'] || row['محل سکونت'] || row['address'] || ''
          ).trim();

          // اعتبارسنجی فیلدهای ضروری: نام، نام خانوادگی، کد ملی، شماره تماس
          const errors: string[] = [];
          if (!firstName) errors.push('نام وارد نشده است');
          if (!lastName) errors.push('نام خانوادگی وارد نشده است');
          if (!nationalId) errors.push('کد ملی (ضروری) وارد نشده است');
          if (!phone) errors.push('شماره تماس (ضروری) وارد نشده است');

          const isValid = errors.length === 0;

          return {
            firstName,
            lastName,
            fullName: rawFullName || `${firstName} ${lastName}`.trim(),
            role,
            roleTitle,
            nationalId,
            phone,
            base,
            eitaaId,
            fatherName,
            address,
            isValid,
            validationError: errors.join(' - ')
          };
        });

        resolve(parsedRows);
      } catch (err: any) {
        reject(new Error('خطا در خواندن فایل اکسل: ' + (err.message || 'فایل نامعتبر است.')));
      }
    };

    reader.onerror = () => reject(new Error('خطا در بارگذاری فایل.'));
    reader.readAsArrayBuffer(file);
  });
}
