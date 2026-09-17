import React, { useState, useRef } from 'react';
import { safeUUID } from '../../lib/crypto';
import { db } from '../../db';
import { triggerSync } from '../../sync';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Users, 
  UserPlus, 
  FileText,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  downloadSampleUserExcel, 
  exportUsersToExcel, 
  parseUsersFromExcelFile, 
  ROLE_PERSIAN_TITLES,
  type ParsedUserRow 
} from '../../utils/excelUtils';
import type { User, Role } from '../../types';

interface UserImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingUsers?: User[];
}

export function UserImportExportModal({ isOpen, onClose, existingUsers = [] }: UserImportExportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedUserRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(true);

  if (!isOpen) return null;

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError('');
    setImportSuccessMessage('');
    setParsedRows([]);

    try {
      const rows = await parseUsersFromExcelFile(file);
      setParsedRows(rows);
      if (rows.length === 0) {
        setParseError('فایل آپلود شده خالی است یا فرمت آن صحیح نمی‌باشد.');
      }
    } catch (err: any) {
      setParseError(err.message || 'خطا در خواندن فایل اکسل.');
    } finally {
      setIsParsing(false);
      // reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const currentUsers = await db.users.toArray();
      let addedCount = 0;
      let updatedCount = 0;

      for (const row of validRows) {
        // پیدا کردن کاربر موجود بر اساس کد ملی یا نام کاربری
        const existing = currentUsers.find(
          u => (u.nationalId && u.nationalId.trim() === row.nationalId) ||
               (u.username && u.username.trim() === row.nationalId)
        );

        if (existing) {
          if (overwriteExisting) {
            await db.users.update(existing.id, {
              firstName: row.firstName,
              lastName: row.lastName,
              name: `${row.firstName} ${row.lastName}`.trim(),
              role: row.role,
              phone: row.phone,
              nationalId: row.nationalId,
              username: row.nationalId,
              password: row.phone || existing.password || '123456',
              base: row.role === 'STUDENT' || row.role === 'MENTOR' ? row.base : undefined,
              eitaaId: row.eitaaId || existing.eitaaId,
              fatherName: row.fatherName || existing.fatherName,
              address: row.address || existing.address,
              isApproved: true
            });
            updatedCount++;
          }
        } else {
          await db.users.add({
            id: safeUUID(),
            firstName: row.firstName,
            lastName: row.lastName,
            name: `${row.firstName} ${row.lastName}`.trim(),
            role: row.role,
            username: row.nationalId,
            password: row.phone || '123456',
            nationalId: row.nationalId,
            phone: row.phone,
            base: row.role === 'STUDENT' || row.role === 'MENTOR' ? row.base : undefined,
            eitaaId: row.eitaaId,
            fatherName: row.fatherName,
            address: row.address,
            isApproved: true
          });
          addedCount++;
        }
      }

      triggerSync();
      setImportSuccessMessage(
        `عملیات ایمپورت با موفقیت انجام شد: ${addedCount} کاربر جدید ثبت و ${updatedCount} کاربر بروزرسانی گردید.`
      );
      setParsedRows([]);
    } catch (err: any) {
      setParseError('خطا در ذخیره‌سازی داده‌ها: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* هدر مدال */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black">مدیریت و ورود گروهی اطلاعات (ایمپورت / اکسپورت اکسل)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ثبت اطلاعات طلاب، اساتید راهنما، مشاورین و مدیران از طریق فایل اکسل استاندارد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بدنه مدال */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* باکس اکشن‌های اصلی: دانلود نمونه و آپلود اکسل */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. دانلود نمونه اکسل */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-1">
                  <Download className="w-4 h-4" />
                  <span>۱. دانلود نمونه فایل اکسل استاندارد</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  فایل اکسل آماده با ستون‌های مجزای <strong>«نام»</strong> و <strong>«نام خانوادگی»</strong>، نقش، کد ملی و شماره تماس را دانلود کرده و مقادیر را تکمیل نمایید.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadSampleUserExcel}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>دانلود نمونه فایل اکسل (.xlsx)</span>
              </button>
            </div>

            {/* 2. آپلود فایل اکسل */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-sm mb-1">
                  <Upload className="w-4 h-4" />
                  <span>۲. بارگذاری فایل اکسل تکمیل شده</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  فایل اکسل یا CSV حاوی اسامی طلاب و اساتید را انتخاب نمایید تا سیستم خودکار آن را اعتبارسنجی کند.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال خواندن و بررسی فایل...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>انتخاب و بارگذاری فایل اکسل</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* پیام‌های خطا یا موفقیت */}
          {parseError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-medium flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {importSuccessMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-3">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{importSuccessMessage}</span>
            </div>
          )}

          {/* پیش‌نمایش جدول اطلاعات استخراج شده */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تعداد سطرها: <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{parsedRows.length}</strong>
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                    معتبر: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2.5 py-1 rounded-lg">
                      دارای خطا: {invalidCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={overwriteExisting}
                      onChange={e => setOverwriteExisting(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>بروزرسانی داده‌های تکراری (بر اساس کد ملی)</span>
                  </label>
                </div>
              </div>

              {/* جدول داده‌های استخراج‌شده */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[320px] overflow-y-auto text-xs">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 sticky top-0 z-10 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">ردیف</th>
                      <th className="p-3">نام</th>
                      <th className="p-3">نام خانوادگی</th>
                      <th className="p-3">نقش</th>
                      <th className="p-3">کد ملی (نام‌کاربری)</th>
                      <th className="p-3">شماره تماس (رمز)</th>
                      <th className="p-3">پایه</th>
                      <th className="p-3">آیدی ایتا</th>
                      <th className="p-3 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={row.isValid 
                          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors' 
                          : 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                        }
                      >
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold">{row.firstName || '—'}</td>
                        <td className="p-3 font-bold">{row.lastName || '—'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                            {row.roleTitle}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{row.nationalId || '—'}</td>
                        <td className="p-3 font-mono">{row.phone || '—'}</td>
                        <td className="p-3 font-mono">{row.base ? `پایه ${row.base}` : '—'}</td>
                        <td className="p-3 font-mono dir-ltr text-right">{row.eitaaId || '—'}</td>
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5" /> تایید
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[10px]" title={row.validationError}>
                              <AlertTriangle className="w-3.5 h-3.5" /> {row.validationError}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* دکمه ثبت نهایی */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={validCount === 0 || isImporting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال ثبت اطلاعات کاربران...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>تایید و ثبت نهایی {validCount} کاربر در سیستم</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* قسمت اکسپورت گرفتن لیست کاربران موجود */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-indigo-500" />
              <span>کل کاربران ثبت‌شده در سیستم: <strong className="font-mono text-slate-700 dark:text-slate-300 font-bold">{existingUsers.length} نفر</strong></span>
            </div>

            <button
              type="button"
              onClick={() => exportUsersToExcel(existingUsers)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>خروجی گرفتن از تمام کاربران (فایل اکسل)</span>
            </button>
          </div>

        </div>

        {/* فوتر مدال */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
}
