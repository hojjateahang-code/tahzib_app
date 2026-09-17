import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, RefreshCw, AlertCircle, CheckCircle2, ChevronLeft, AppWindow, Smartphone } from 'lucide-react';

export const CURRENT_VERSION = "1.0.0"; // The current hardcoded version of the running client code

interface UpdateCheckResponse {
  success: boolean;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes: string;
  apkUrl: string;
  forceUpdate: boolean;
  updatedAt: string;
}

export function LiveUpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateCompleted, setUpdateCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const checkUpdates = async () => {
    try {
      const res = await fetch(`/api/update/check?currentVersion=${CURRENT_VERSION}`);
      if (res.ok) {
        const data: UpdateCheckResponse = await res.json();
        if (data.success && data.updateAvailable) {
          setUpdateInfo(data);
          setShowModal(true);
        }
      }
    } catch (err) {
      console.warn("Live Update check skipped (offline or server starting):", err);
    }
  };

  useEffect(() => {
    // Check for updates on mount after a tiny delay so the page loads smoothly
    const timer = setTimeout(() => {
      checkUpdates();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleUpdateAction = async () => {
    if (!updateInfo) return;
    setIsUpdating(true);
    setErrorMsg('');

    try {
      // If we are on Eitaa or web view, we can bust the cache and reload
      if (!window.hasOwnProperty('AndroidBridge') && !updateInfo.apkUrl) {
        // Clear browser cache storages to force retrieve new assets from server
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          } catch (e) {
            console.warn('Failed clearing client cache:', e);
          }
        }
        // Artificial delay for elegant loader
        await new Promise(resolve => setTimeout(resolve, 1500));
        setUpdateCompleted(true);
        setIsUpdating(false);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Download the Android APK from MinIO proxy URL
        const link = document.createElement('a');
        link.href = updateInfo.apkUrl;
        link.download = `TahzibApp-v${updateInfo.latestVersion}.apk`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Native Android Bridge notification helper if available
        if (typeof (window as any).AndroidBridge !== 'undefined' && (window as any).AndroidBridge.showToast) {
          (window as any).AndroidBridge.showToast('در حال دریافت نسخه جدید اندروید از مخزن مینیو...');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        setUpdateCompleted(true);
        setIsUpdating(false);
      }
    } catch (err: any) {
      setIsUpdating(false);
      setErrorMsg('خطا در دریافت فایل بروزرسانی: ' + (err.message || 'خطای شبکه'));
    }
  };

  if (!showModal || !updateInfo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-indigo-100 dark:border-slate-800 shadow-2xl p-6 relative overflow-hidden"
        >
          {/* Decorative background gradients */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">بروزرسانی لایو سامانه تهذیب</h3>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-md">
                  v{updateInfo.latestVersion}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                نسخه جدید در مخزن ابری مینیو (MinIO) آماده دریافت است.
              </p>
            </div>
          </div>

          {/* Version Details card */}
          <div className="mt-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-2 relative z-10">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-500">نسخه شما:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{CURRENT_VERSION}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">نسخه جدید در دسترس:</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">v{updateInfo.latestVersion}</span>
            </div>

            {/* Release notes */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">تغییرات این نسخه:</span>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                {updateInfo.releaseNotes}
              </p>
            </div>
          </div>

          {/* Connection Mode Helper Indicators */}
          <div className="mt-3 flex gap-2 justify-center text-[9px] text-slate-500">
            <div className="flex items-center gap-1">
              <AppWindow className="w-3 h-3 text-indigo-500" />
              <span>سازگار با پیام‌رسان ایتا</span>
            </div>
            <div className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-500" />
              <span>پشتیبانی از فایل APK اندروید</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 space-y-2 relative z-10">
            {isUpdating ? (
              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-3">
                <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">در حال دریافت و اعمال بروزرسانی از مینیو...</span>
              </div>
            ) : updateCompleted ? (
              <div className="bg-emerald-50/80 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">دریافت فایل موفقیت‌آمیز بود!</span>
              </div>
            ) : (
              <div className="flex gap-2">
                {!updateInfo.forceUpdate && (
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    بعداً
                  </button>
                )}
                <button
                  onClick={handleUpdateAction}
                  className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-200 dark:shadow-none transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>بروزرسانی لایو (سریع)</span>
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
