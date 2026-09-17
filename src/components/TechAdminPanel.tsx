import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ShieldCheck, 
  Users, 
  Database, 
  Cloud, 
  Monitor, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Server, 
  HardDrive, 
  Activity,
  Layers,
  FileCode,
  Lock,
  Radio,
  Sparkles,
  Menu
} from 'lucide-react';
import { StudentPanel } from './StudentPanel';
import { MentorPanel } from './MentorPanel';
import { CounselorPanel } from './CounselorPanel';
import { VicePrincipalPanel } from './VicePrincipalPanel';
import { DirectorPanel } from './DirectorPanel';
import { VicePrincipalUsers } from './vice-principal/VicePrincipalUsers';
import { checkMinIOStatus, syncMinIOData, getDeviceId, getSynchronizedTime, triggerSync, type MinioStatus } from '../sync';
import { MinioConnectionDebugWidget } from './MinioConnectionDebugWidget';
import { TechAdminLiveUpdateManager } from './tech-admin/TechAdminLiveUpdateManager';

export function TechAdminPanel() {
  const [activeTab, setActiveTab] = useState<'PANELS_MONITOR' | 'SYSTEM_DB' | 'SYNC_MINIO' | 'USER_MANAGEMENT' | 'LIVE_UPDATES'>('PANELS_MONITOR');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // State for panel emulation
  const [emulatedRole, setEmulatedRole] = useState<'STUDENT' | 'MENTOR' | 'COUNSELOR' | 'VICE_PRINCIPAL' | 'DIRECTOR'>('DIRECTOR');

  // DB Inspection state
  const userCount = useLiveQuery(() => db.users.count()) || 0;
  const taskCount = useLiveQuery(() => db.tasks.count()) || 0;
  const assessmentCount = useLiveQuery(() => db.assessments.count()) || 0;
  const reportCount = useLiveQuery(() => db.reports.count()) || 0;
  const messageCount = useLiveQuery(() => db.messages.count()) || 0;
  const appointmentCount = useLiveQuery(() => db.appointments.count()) || 0;
  const groupCount = useLiveQuery(() => db.customGroups.count()) || 0;
  const habitCount = useLiveQuery(() => db.personalHabits.count()) || 0;

  // Sync Diagnostics State
  const [minioStatus, setMinioStatus] = useState<MinioStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Backup & Restore State
  const [backupJson, setBackupJson] = useState('');
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');

  const fetchSyncStatus = async () => {
    const s = await checkMinIOStatus();
    setMinioStatus(s);
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    const res = await syncMinIOData();
    setIsSyncing(false);
    if (res.success) {
      setSyncMessage({
        type: 'success',
        text: `همگام‌سازی ابری با موفقیت انجام شد (${res.message}) - زمان سرور: ${new Date(getSynchronizedTime()).toLocaleTimeString('fa-IR')}`
      });
      fetchSyncStatus();
    } else {
      setSyncMessage({
        type: 'error',
        text: `خطا در همگام‌سازی: ${res.message}`
      });
    }
  };

  const exportFullBackup = async () => {
    const data = {
      timestamp: new Date().toISOString(),
      users: await db.users.toArray(),
      tasks: await db.tasks.toArray(),
      assessments: await db.assessments.toArray(),
      reports: await db.reports.toArray(),
      messages: await db.messages.toArray(),
      appointments: await db.appointments.toArray(),
      customGroups: await db.customGroups.toArray(),
      personalHabits: await db.personalHabits.toArray(),
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tahzib_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupSuccessMsg('فایل پشتیبان کامل دیتابیس با موفقیت دانلود شد.');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.users && Array.isArray(parsed.users)) {
        await db.users.bulkPut(parsed.users);
      }
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        await db.tasks.bulkPut(parsed.tasks);
      }
      if (parsed.assessments && Array.isArray(parsed.assessments)) {
        await db.assessments.bulkPut(parsed.assessments);
      }
      if (parsed.reports && Array.isArray(parsed.reports)) {
        await db.reports.bulkPut(parsed.reports);
      }
      if (parsed.messages && Array.isArray(parsed.messages)) {
        await db.messages.bulkPut(parsed.messages);
      }
      if (parsed.appointments && Array.isArray(parsed.appointments)) {
        await db.appointments.bulkPut(parsed.appointments);
      }

      triggerSync();
      setBackupSuccessMsg('پشتیبان با موفقیت در پایگاه داده محلی و همگام‌سازی بازیابی شد.');
    } catch (err: any) {
      alert('خطا در خواندن فایل پشتیبان: ' + err.message);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* هدر فوقانی مسئول فنی */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl backdrop-blur-md">
              <ShieldCheck className="w-8 h-8 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">پنل اختصاصی مسئول فنی (راهبر سیستم)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  دسترسی همه‌جانبه
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-1">
                رصد و کنترل تمام پنل‌ها، نظارت بر لایه‌های دیتابیس، همگام‌سازی ابری و عیب‌یابی سامانه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSyncStatus}
              className="px-3 py-2 bg-indigo-900/50 hover:bg-indigo-800/80 border border-indigo-700/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
              <span>ارزیابی سلامت سیستم</span>
            </button>
          </div>
        </div>
      </div>

      {/* تب‌های اصلی پنل مسئول فنی با چینش گرید کاملاً ریسپانسیو و بدون اسکرول - چسبیده به بالا هنگام اسکرول */}
      <div className="z-40 grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md transition-all">
        <button
          onClick={() => setActiveTab('PANELS_MONITOR')}
          className={`px-3 py-2 rounded-2xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'PANELS_MONITOR'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>پنل‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM_DB')}
          className={`px-3 py-2 rounded-2xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'SYSTEM_DB'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>دیتابیس</span>
        </button>

        <button
          onClick={() => setActiveTab('SYNC_MINIO')}
          className={`px-3 py-2 rounded-2xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'SYNC_MINIO'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>همگام‌سازی </span>
        </button>

        <button
          onClick={() => setActiveTab('USER_MANAGEMENT')}
          className={`px-3 py-2 rounded-2xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'USER_MANAGEMENT'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span> کاربران</span>
        </button>

        <button
          onClick={() => setActiveTab('LIVE_UPDATES')}
          className={`col-span-2 sm:col-span-1 px-3 py-2 rounded-2xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'LIVE_UPDATES'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>بروزرسانی </span>
        </button>
      </div>

      {/* ۱. تب رصد و شبیه‌سازی تمام پنل‌ها */}
      {activeTab === 'PANELS_MONITOR' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm">
                <Eye className="w-5 h-5 text-indigo-600" />
                <span>انتخاب پنل جهت مشاهده لایو و اعمال تغییرات:</span>
              </div>

              {/* دکمه‌های انتخاب نقش جهت رصد */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => setEmulatedRole('DIRECTOR')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    emulatedRole === 'DIRECTOR'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  🏢 پنل مدیر مدرسه
                </button>
                <button
                  onClick={() => setEmulatedRole('VICE_PRINCIPAL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    emulatedRole === 'VICE_PRINCIPAL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  🏛️ پنل معاون تهذیب
                </button>
                <button
                  onClick={() => setEmulatedRole('MENTOR')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    emulatedRole === 'MENTOR'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  👨‍🏫 پنل استاد راهنما
                </button>
                <button
                  onClick={() => setEmulatedRole('COUNSELOR')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    emulatedRole === 'COUNSELOR'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  🩺 پنل استاد مشاور
                </button>
                <button
                  onClick={() => setEmulatedRole('STUDENT')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    emulatedRole === 'STUDENT'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  🎓 پنل دانش‌پژوه (طلبه)
                </button>
              </div>
            </div>

            {/* بنر اطلاع‌رسانی لایو بودن دسترسی مسئول فنی */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>
                  نظارت مستقیم روی <strong>
                    {emulatedRole === 'DIRECTOR' && 'پنل مدیر مدرسه'}
                    {emulatedRole === 'VICE_PRINCIPAL' && 'پنل معاون تهذیب'}
                    {emulatedRole === 'MENTOR' && 'پنل استاد راهنما'}
                    {emulatedRole === 'COUNSELOR' && 'پنل استاد مشاور'}
                    {emulatedRole === 'STUDENT' && 'پنل دانش‌پژوه (طلبه)'}
                  </strong> با دسترسی کامل مدیر فنی جهت تست و ویرایش اطلاعات
                </span>
              </span>
            </div>
          </div>

          {/* رندر واقعی پنل انتخاب شده */}
          <div className="bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-3xl border border-slate-200 dark:border-slate-800">
            {emulatedRole === 'DIRECTOR' && <DirectorPanel />}
            {emulatedRole === 'VICE_PRINCIPAL' && <VicePrincipalPanel />}
            {emulatedRole === 'MENTOR' && <MentorPanel />}
            {emulatedRole === 'COUNSELOR' && <CounselorPanel />}
            {emulatedRole === 'STUDENT' && <StudentPanel />}
          </div>
        </div>
      )}

      {/* ۲. تب سلامت دیتابیس و فایل‌های بک‌آب */}
      {activeTab === 'SYSTEM_DB' && (
        <div className="space-y-6">
          
          {/* کارت‌های آمار رکوردها */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>تعداد رکوردهای ثبت‌شده در دیتابیس محلی (Dexie IndexedDB)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">کاربران (Users)</span>
                <p className="text-xl font-black font-mono mt-1 text-indigo-600 dark:text-indigo-400">{userCount}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">برنامه‌ها و تکالیف</span>
                <p className="text-xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">{taskCount}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">ارزیابی‌های خوداظهاری</span>
                <p className="text-xl font-black font-mono mt-1 text-purple-600 dark:text-purple-400">{assessmentCount}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">گزارش‌های تهذیبی</span>
                <p className="text-xl font-black font-mono mt-1 text-amber-600 dark:text-amber-400">{reportCount}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">پیام‌ها و مکاتبات</span>
                <p className="text-xl font-black font-mono mt-1 text-blue-600 dark:text-blue-400">{messageCount}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">نوبت‌های مشاوره</span>
                <p className="text-xl font-black font-mono mt-1 text-rose-600 dark:text-rose-400">{appointmentCount}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">گروه‌های سفارشی</span>
                <p className="text-xl font-black font-mono mt-1 text-teal-600 dark:text-teal-400">{groupCount}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">عادات فردی</span>
                <p className="text-xl font-black font-mono mt-1 text-cyan-600 dark:text-cyan-400">{habitCount}</p>
              </div>
            </div>
          </div>

          {/* پشتیبان‌گیری و بازیابی فایل JSON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                <span>خروجی و دانلود فایل پشتیبان کامل (Backup JSON)</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                ذخیره تمام اطلاعات سامانه شامل لیست کاربران، تکالیف، ارزیابی‌ها و پیام‌ها در قالب یک فایل JSON امن قابل دانلود.
              </p>
              <button
                onClick={exportFullBackup}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>دانلود نسخه پشتیبان کامل</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span>بازیابی اطلاعات از فایل پشتیبان (Restore JSON)</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                بارگذاری فایل JSON قبلی جهت بازگرداندن داده‌ها به دیتابیس محلی سامانه.
              </p>
              <label className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>انتخاب و بازگردانی فایل JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

          </div>

          {backupSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{backupSuccessMsg}</span>
            </div>
          )}

          {/* بازنشانی کامل دیتابیس */}
          <div className="p-6 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-3xl space-y-3">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>بازنشانی کامل دیتابیس (Reset)</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              در صورت نیاز به پاکسازی کامل پایگاه داده محلی و بازگشت به مقادیر اولیه نمونه، از دکمه زیر استفاده نمایید.
            </p>
            <button
              onClick={async () => {
                if (confirm('آیا مطمئن هستید؟ تمام داده‌های محلی پاک شده و به مقادیر پیش‌فرض باز خواهد گشت.')) {
                  await db.delete();
                  window.location.reload();
                }
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              پاکسازی و رفرش دیتابیس
            </button>
          </div>

        </div>
      )}

      {/* ۳. تب همگام‌سازی ابری و مینیو */}
      {activeTab === 'SYNC_MINIO' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-indigo-600" />
                  <span>وضعیت لایو موتور همگام‌سازی ابری مینیو (Fetch-Merge-Push)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  شناسه دستگاه: <strong className="font-mono text-slate-700 dark:text-slate-300">{getDeviceId()}</strong>
                </p>
              </div>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>اجرای فوری چرخه همگام‌سازی ابری</span>
              </button>
            </div>

            {syncMessage && (
              <div className={`p-4 rounded-2xl text-xs font-bold border ${
                syncMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200'
              }`}>
                {syncMessage.text}
              </div>
            )}

            {/* ویجت کامل عیب‌یابی مینیو */}
            <div className="pt-2">
              <MinioConnectionDebugWidget />
            </div>
          </div>
        </div>
      )}

      {/* ۴. تب مدیریت کاربران */}
      {activeTab === 'USER_MANAGEMENT' && (
        <div>
          <VicePrincipalUsers />
        </div>
      )}

      {/* ۵. تب مدیریت بروزرسانی لایو */}
      {activeTab === 'LIVE_UPDATES' && (
        <div className="bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
          <TechAdminLiveUpdateManager />
        </div>
      )}

    </div>
  );
}
