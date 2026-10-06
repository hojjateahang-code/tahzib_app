import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  Send, 
  Server, 
  Layers, 
  FileCheck2,
  HardDrive
} from 'lucide-react';
import { CURRENT_VERSION } from '../common/LiveUpdateChecker';
import { getApiUrl, getServerApiBaseUrl, setStoredServerUrl } from '../../lib/apiConfig';
import { db } from '../../db';
import { triggerSync } from '../../sync';
import type { Message } from '../../types';

interface ApkInfo {
  version: string;
  releaseNotes: string;
  updatedAt: string;
  fileSizeMb?: number;
  hasApk: boolean;
  downloadUrl: string;
  forceUpdate?: boolean;
}

export function TechAdminLiveUpdateManager() {
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingApk, setIsUploadingApk] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states for APK release
  const [version, setVersion] = useState('1.0.0');
  const [releaseNotes, setReleaseNotes] = useState('نسخه رسمی و هوشمند اپلیکیشن اندروید سامانه جامع تهذیب حوزه علمیه');
  const [selectedApkFile, setSelectedApkFile] = useState<File | null>(null);
  
  // تنظیم پیش‌فرض تیک نوتیفیکیشن همگانی بر روی false و ذخیره در localStorage تا لغو آن کلاً باقی بماند
  const [sendBroadcastNotification, setSendBroadcastNotification] = useState<boolean>(() => {
    const saved = localStorage.getItem('tech_admin_broadcast_notification');
    return saved !== null ? saved === 'true' : false;
  });
  const [forceUpdate, setForceUpdate] = useState(false);

  // مرجع به اینپوت انتخاب فایل جهت فراخوانی مطمئن در اندروید و وب
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleBroadcastNotificationChange = (checked: boolean) => {
    setSendBroadcastNotification(checked);
    localStorage.setItem('tech_admin_broadcast_notification', String(checked));
  };

  const handleDropzoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Dynamic Server URL Configuration
  const [currentServerUrl, setCurrentServerUrl] = useState(getServerApiBaseUrl());
  const [serverUrlSuccess, setServerUrlSuccess] = useState('');

  const fetchApkInfo = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/apk/info'));
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setApkInfo(data);
          if (data.version) setVersion(data.version);
          if (data.releaseNotes) setReleaseNotes(data.releaseNotes);
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch APK info from server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApkInfo();
  }, []);

  // Handle direct APK file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.apk')) {
        setErrorMsg('فایل انتخابی باید دارای پسوند .apk باشد.');
        return;
      }
      setSelectedApkFile(file);
      setErrorMsg('');
    }
  };

  const handleUploadAndPublishApk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApkFile && !apkInfo?.hasApk) {
      setErrorMsg('لطفاً ابتدا فایل APK اندروید را انتخاب نمایید.');
      return;
    }

    if (!version.trim()) {
      setErrorMsg('وارد کردن شماره نسخه الزامی است.');
      return;
    }

    setIsUploadingApk(true);
    setErrorMsg('');
    setSuccessMsg('');
    setUploadProgress(10);

    try {
      let contentBase64 = '';
      if (selectedApkFile) {
        setUploadProgress(25);
        contentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedApkFile);
        });
      }

      setUploadProgress(60);

      const res = await fetch(getApiUrl('/api/apk/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedApkFile ? selectedApkFile.name : 'tahzib-app.apk',
          content: contentBase64,
          version: version.trim(),
          releaseNotes: releaseNotes.trim(),
          forceUpdate
        })
      });

      setUploadProgress(85);
      const data = await res.json();

      if (data.success) {
        // Broadcast in-app message to all students & users if enabled
        if (sendBroadcastNotification) {
          await broadcastUpdateNotificationToAllUsers(version.trim(), releaseNotes.trim());
        }

        setUploadProgress(100);
        setSuccessMsg(data.message || 'فایل APK با موفقیت روی سرور منتشر و پیام اطلاع‌رسانی ارسال گردید.');
        setSelectedApkFile(null);
        fetchApkInfo();
      } else {
        setErrorMsg(data.message || 'خطا در بارگذاری فایل APK روی سرور.');
      }
    } catch (err: any) {
      setErrorMsg('خطا در ارتباط با سرور: ' + err.message);
    } finally {
      setIsUploadingApk(false);
      setUploadProgress(0);
    }
  };

  // Broadcast system message to all users
  const broadcastUpdateNotificationToAllUsers = async (ver: string, notes: string) => {
    try {
      const allUsers = await db.users.toArray();
      const directDownloadLink = `${getServerApiBaseUrl()}/download/tahzib.apk`;
      const now = new Date().toISOString();

      const messagesToCreate: Message[] = allUsers.map(user => ({
        id: 'msg_apk_' + crypto.randomUUID(),
        senderId: 'sys_admin',
        recipientId: user.id,
        subject: `📱 نسخه جدید اپلیکیشن اندروید تهذیب (نسخه ${ver}) منتشر شد`,
        content: `با سلام و احترام،\nنسخه جدید اپلیکیشن اندروید سامانه تهذیب (v${ver}) بر روی سرور مستقر گردید.\n\nویژگی‌ها و تغییرات این نسخه:\n${notes}\n\nجهت دریافت و نصب مستقیم برنامه روی گوشی خود، بر روی دکمه سبز رنگ «دانلود و نصب مستقیم برنامه» در زیر این پیام کلیک فرمایید.`,
        date: now,
        isRead: false,
        type: 'OFFICIAL',
        synced: false
      }));

      await db.messages.bulkAdd(messagesToCreate);
      triggerSync();
    } catch (err) {
      console.warn('Error broadcasting update message:', err);
    }
  };

  // Copy Download Link to Clipboard
  const handleCopyLink = () => {
    const url = `${getServerApiBaseUrl()}/download/tahzib.apk`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Save Dynamic Server URL
  const handleSaveServerUrl = () => {
    if (!currentServerUrl.trim()) return;
    setStoredServerUrl(currentServerUrl.trim());
    setServerUrlSuccess('آدرس سرور با موفقیت به‌روزرسانی شد و برای همه ارتباطات اعمال گردید.');
    setTimeout(() => setServerUrlSuccess(''), 4000);
  };

  const directDownloadUrl = `${getServerApiBaseUrl()}/download/tahzib.apk`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header & Live Server Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md border border-indigo-800/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300 shadow-inner">
              <Smartphone className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>مدیریت انتشار و دانلود فایل APK اندروید</span>
                <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  سرور زنده
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80 mt-1">
                آپلود مستقیم فایل APK، ایجاد لینک دانلود پایدار برای طلاب و ارسال خودکار نوتیفیکیشن همگانی
              </p>
            </div>
          </div>

          <button
            onClick={fetchApkInfo}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600/40 hover:bg-indigo-600/60 border border-indigo-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>بررسی وضعیت سرور</span>
          </button>
        </div>

        {/* Info Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block">نسخه مستقر در سرور</span>
            <span className="text-xs font-black text-indigo-300 mt-1 block">
              {apkInfo?.version ? `v${apkInfo.version}` : 'نسخه ۱.۰.۰'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block">حجم فایل APK در سرور</span>
            <span className="text-xs font-black text-emerald-300 mt-1 block">
              {apkInfo?.fileSizeMb ? `${apkInfo.fileSizeMb} مگابایت` : 'آماده آپلود'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block">وضعیت فایل دانلودی</span>
            <span className={`text-xs font-black mt-1 flex items-center gap-1.5 ${apkInfo?.hasApk ? 'text-emerald-400' : 'text-amber-400'}`}>
              {apkInfo?.hasApk ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>فایل APK روی سرور آماده دانلود است</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>نیازمند بارگذاری فایل اولیه APK</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Upload APK & Broadcast Form */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>بارگذاری فایل جدید APK و انتشار خودکار</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">فرمت مجاز: .apk</span>
          </div>

          <form onSubmit={handleUploadAndPublishApk} className="space-y-4">
            
            {/* File Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                انتخاب فایل خروجی APK اندروید:
              </label>
              <div 
                onClick={handleDropzoneClick}
                className="cursor-pointer border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-2xl p-5 text-center transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="apk-file-input"
                  accept=".apk,application/vnd.android.package-archive,*/*"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isUploadingApk}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <Smartphone className="w-8 h-8 text-indigo-500" />
                  {selectedApkFile ? (
                    <div className="space-y-1">
                      <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 block">
                        {selectedApkFile.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block">
                        حجم: {(selectedApkFile.size / (1024 * 1024)).toFixed(2)} مگابایت
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                        برای انتخاب فایل APK کلیک کنید یا فایل را اینجا رها کنید
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        (فایل تولید شده در پوشه app/build/outputs/apk در اندروید استودیو)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Version Input */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">شماره نسخه</label>
                <input
                  type="text"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  placeholder="مثلاً 1.0.0"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">مسیر عمومی دانلود</label>
                <input
                  type="text"
                  disabled
                  value="/download/tahzib.apk"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500"
                />
              </div>
            </div>

            {/* Release Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">توضیحات و پیام اطلاع‌رسانی به کاربران</label>
              <textarea
                value={releaseNotes}
                onChange={e => setReleaseNotes(e.target.value)}
                rows={3}
                placeholder="توضیحات نسخه جدید که در پیام به طلاب و اساتید ارسال می‌شود..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Broadcast Checkbox */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendBroadcastNotification}
                  onChange={e => handleBroadcastNotificationChange(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    ارسال خودکار پیام نوتیفیکیشن همراه با لینک دانلود به تمام طلاب و اساتید
                  </span>
                  <span className="text-[10px] text-slate-500">
                    با فعال بودن این گزینه، بلافاصله پس از آپلود، یک پیام به صندوق پیام‌های تمام کاربران ارسال می‌شود.
                  </span>
                </div>
              </label>
            </div>

            {/* Progress Bar */}
            {isUploadingApk && uploadProgress > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-indigo-600 font-bold">
                  <span>در حال آپلود و استقرار فایل APK روی سرور...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploadingApk || (!selectedApkFile && !apkInfo?.hasApk)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploadingApk ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال بارگذاری و انتشار...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>آپلود APK و ارسال اطلاع‌رسانی به همه</span>
                </>
              )}
            </button>
          </form>

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-800 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* 3. Direct Download Link & Server URL Settings */}
        <div className="space-y-6">
          
          {/* Public Download Link Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>لینک عمومی دانلود مستقیم برای کاربران</span>
              </h4>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold">
                لینک پایدار
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              این لینک ثابت است و می‌توانید آن را در کانال ایتا، پیامک یا وب‌سایت قرار دهید. کاربران با کلیک روی آن فوراً فایل APK را دریافت خواهند کرد:
            </p>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                readOnly
                value={directDownloadUrl}
                className="flex-1 text-xs font-mono text-slate-700 dark:text-slate-300 bg-transparent outline-none border-none select-all dir-ltr"
              />
              <button
                onClick={handleCopyLink}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی لینک</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2">
              <a
                href={directDownloadUrl}
                download="tahzib-app.apk"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>تست دانلود فایل APK از سرور</span>
              </a>
            </div>
          </div>

          {/* Dynamic Server URL Configuration */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                <span>تنظیم آدرس سرور اصلی (مسئول فنی)</span>
              </h4>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              اگر در آینده IP سرور تغییر کرد یا دامنه اختصاصی به سرور متصل نمودید، آدرس جدید را در کادر زیر وارد و ذخیره کنید.
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentServerUrl}
                  onChange={e => setCurrentServerUrl(e.target.value)}
                  placeholder="http://77.238.122.209:3000"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 dir-ltr text-left"
                />
                <button
                  onClick={handleSaveServerUrl}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
                >
                  ذخیره آدرس
                </button>
              </div>

              {serverUrlSuccess && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{serverUrlSuccess}</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
