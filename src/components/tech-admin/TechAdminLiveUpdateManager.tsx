import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, RefreshCw, CheckCircle2, AlertCircle, AppWindow, Smartphone, FileCode, CheckSquare } from 'lucide-react';
import { CURRENT_VERSION } from '../common/LiveUpdateChecker';

interface PublishedConfig {
  version: string;
  releaseNotes: string;
  apkKey: string;
  forceUpdate: boolean;
  updatedAt: string;
}

export function TechAdminLiveUpdateManager() {
  const [currentPublished, setCurrentPublished] = useState<PublishedConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [version, setVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [apkKey, setApkKey] = useState('updates/tahzib-app-v1.apk');
  const [forceUpdate, setForceUpdate] = useState(false);

  const fetchPublishedConfig = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/update/check?currentVersion=0.0.0');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCurrentPublished({
            version: data.latestVersion,
            releaseNotes: data.releaseNotes,
            apkKey: data.apkUrl ? decodeURIComponent(data.apkUrl).split('?key=')[1]?.split('tahzibApp/')[1] || 'updates/tahzib-app-v1.apk' : 'updates/tahzib-app-v1.apk',
            forceUpdate: data.forceUpdate,
            updatedAt: data.updatedAt || new Date().toISOString()
          });
          // Pre-populate fields for easier publishing of next version
          setVersion(data.latestVersion);
          setReleaseNotes(data.releaseNotes);
          setForceUpdate(data.forceUpdate);
        }
      }
    } catch (err: any) {
      setErrorMsg('خطا در بارگذاری اطلاعات بروزرسانی فعلی: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishedConfig();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version) {
      setErrorMsg('شماره نسخه جدید الزامی است.');
      return;
    }

    setIsPublishing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/update/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version,
          releaseNotes,
          apkKey,
          forceUpdate
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        fetchPublishedConfig();
      } else {
        setErrorMsg(data.message || 'خطا در انتشار نسخه جدید.');
      }
    } catch (err: any) {
      setErrorMsg('خطای شبکه در ارتباط با سرور: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Dashboard Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>مدیریت یکپارچه لایو آپدیت (مینیو)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              بروزرسانی زنده برنامک در پیام‌رسان ایتا و دانلود آخرین نسخه APK اندروید به صورت بومی از مخزن مینیو.
            </p>
          </div>
          <button
            onClick={fetchPublishedConfig}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>بازخوانی مجدد</span>
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">نسخه کلاینت فعلی شما</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 block">{CURRENT_VERSION}</span>
          </div>

          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/40">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block">آخرین نسخه منتشرشده روی مینیو</span>
            <span className="text-xs font-black text-indigo-900 dark:text-indigo-100 mt-0.5 block">
              {currentPublished ? `v${currentPublished.version}` : 'در حال بررسی...'}
            </span>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-100/40 dark:border-emerald-900/40">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">آخرین زمان بروزرسانی مخزن</span>
            <span className="text-xs font-black text-emerald-900 dark:text-emerald-100 mt-0.5 block truncate">
              {currentPublished ? new Date(currentPublished.updatedAt).toLocaleDateString('fa-IR') + ' - ' + new Date(currentPublished.updatedAt).toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'}) : 'در حال بررسی...'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Form - Publish New Version */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>انتشار نسخه جدید لایو آپدیت</span>
          </h4>

          <form onSubmit={handlePublish} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">شماره نسخه جدید (مثلاً 1.1.0)</label>
              <input
                type="text"
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="شماره نسخه جدید را وارد نمایید"
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">توضیحات و تغییرات این نسخه (Release Notes)</label>
              <textarea
                value={releaseNotes}
                onChange={e => setReleaseNotes(e.target.value)}
                rows={4}
                placeholder="تغییرات انجام شده در این نسخه را جهت نمایش به کاربران بنویسید..."
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">مسیر ذخیره فایل APK اندروید در مینیو (توسط اسکریپت بیلد آپلود می‌شود)</label>
              <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden px-3 items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={apkKey}
                  onChange={e => setApkKey(e.target.value)}
                  className="flex-1 py-2 text-xs font-mono bg-transparent outline-none border-none text-slate-600 dark:text-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForceUpdate(!forceUpdate)}
                className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${forceUpdate ? 'bg-rose-600' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${forceUpdate ? '-translate-x-4' : 'translate-x-0'}`} />
              </button>
              <div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 block">بروزرسانی اجباری (Force Update)</span>
                <span className="text-[9px] text-slate-500">کاربر بدون بروزرسانی به برنامه دسترسی نخواهد داشت.</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPublishing}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md shadow-indigo-100 dark:shadow-none transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isPublishing ? 'animate-spin' : ''}`} />
              <span>انتشار فوری نسخه جدید روی مینیو</span>
            </button>
          </form>

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-800 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* 3. Guide & Documentation */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <AppWindow className="w-4 h-4 text-amber-500" />
            <span>نحوه عملکرد و راهنمای انتشار لایو آپدیت</span>
          </h4>

          <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">۱</div>
              <p className="text-[10px]">
                برنامه تهذیب پس از باز شدن توسط کاربران (چه در حالت اپلیکیشن بومی اندروید و چه در قالب وب‌اپلیکیشن مینی‌اپ ایتا)، به صورت پس‌زمینه نسخه کلاینت خود را با فایل <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">updates/update.json</code> در مینیو مقایسه می‌کند.
              </p>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">۲</div>
              <p className="text-[10px]">
                اگر شماره نسخه موجود در سرور بیشتر از نسخه محلی کاربر باشد، پیامی بسیار شکیل و مدرن برای بروزرسانی لایو در بدو ورود نمایش داده می‌شود.
              </p>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">۳</div>
              <p className="text-[10px]">
                <strong>حالت مینی‌اپ ایتا (وب):</strong> با زدن دکمه بروزرسانی، سیستم Cache Storage کلاینت را خالی کرده و هارد ریفرش انجام می‌دهد تا آخرین فرانت‌اند فوراً بارگذاری شود.
              </p>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">۴</div>
              <p className="text-[10px]">
                <strong>حالت اندروید بومی:</strong> با کلیک روی دکمه، آخرین فایل APK آپلود شده روی مینیو مستقیماً دانلود شده و کاربر می‌تواند فورا آن را نصب کند.
              </p>
            </div>

            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 space-y-1">
              <span className="font-extrabold text-[10px] text-indigo-700 dark:text-indigo-300 block">نکته بسیار مهم برای مدیر فنی:</span>
              <p className="text-[9px] text-slate-500 leading-relaxed">
                هنگامی که خروجی APK اندروید جدید گرفتید، کافیست فایل جدید را از مینیو در مسیر <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">updates/tahzib-app-vX.apk</code> آپلود کرده و سپس از فرم روبه‌رو، شماره نسخه جدید و توضیحات آن را منتشر نمایید تا تمام کلاینت‌ها به طور خودکار بروزرسانی شوند.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
