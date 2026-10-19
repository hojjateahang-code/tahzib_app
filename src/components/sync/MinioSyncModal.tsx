import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Upload, CheckCircle2, AlertCircle, Server, Clock, ShieldCheck, Check } from 'lucide-react';
import { checkMinIOStatus, syncMinIOData, getDeviceId, getSynchronizedTime, type MinioStatus } from '../../sync';
import { useAuth } from '../../store';

export function MinioSyncModal() {
  const { currentUser } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<MinioStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [toastNotice, setToastNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    const s = await checkMinIOStatus();
    setStatus(s);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    // Periodic status check
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (syncing) return;
    setSyncing(true);
    setMessage(null);

    try {
      const res = await syncMinIOData();
      const timeStr = new Date(getSynchronizedTime()).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (res.success) {
        const successMsg = `هماهنگ‌سازی با سرور با موفقیت انجام شد (ساعت ${timeStr})`;
        setMessage({ type: 'success', text: successMsg });
        setToastNotice({ type: 'success', text: successMsg });
        fetchStatus();
      } else {
        const errorMsg = res.message || 'خطا در ارتباط با سرور هماهنگ‌سازی';
        setMessage({ type: 'error', text: errorMsg });
        setToastNotice({ type: 'error', text: errorMsg });
      }
    } catch (err: any) {
      const failMsg = 'خطا در ارتباط شبکه یا سرور مرکزی';
      setMessage({ type: 'error', text: failMsg });
      setToastNotice({ type: 'error', text: failMsg });
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setToastNotice(null);
      }, 5000);
    }
  };

  const deviceId = getDeviceId();
  const syncTimeStr = new Date(getSynchronizedTime()).toLocaleTimeString('fa-IR');
  const isServerConnected = status?.connected;

  return (
    <>
      {/* مجموعه دکمه‌های هماهنگ‌سازی دستی در نوار بالای برنامه برای همه کاربران */}
      <div className="flex items-center gap-1.5" dir="rtl">
        {/* دکمه اصلی هماهنگ‌سازی دستی یک‌کلیکه */}
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          className={`px-3 py-1.5 flex items-center gap-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer select-none active:scale-95 disabled:opacity-75 ${
            syncing
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/40 animate-pulse'
              : isServerConnected
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50'
          }`}
          title="اجرای فوری هماهنگ‌سازی دستی اطلاعات با سرور ابری"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 shrink-0 ${
              syncing
                ? 'animate-spin text-white'
                : isServerConnected
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          />
          <span className="hidden sm:inline">
            {syncing ? 'در حال هماهنگ‌سازی...' : 'هماهنگ‌سازی دستی'}
          </span>
          <span className="sm:hidden">
            {syncing ? 'در حال همگام‌سازی...' : 'هماهنگ‌سازی'}
          </span>
        </button>

        {/* دکمه وضعیت اتصال و جزئیات پیشرفته سرور */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            fetchStatus();
          }}
          className={`p-1.5 rounded-xl text-xs border transition-colors cursor-pointer ${
            isServerConnected
              ? 'bg-slate-50 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
          }`}
          title="مشاهده وضعیت اتصال به سرور و گزارش همگام‌سازی"
        >
          {isServerConnected ? (
            <div className="relative flex items-center justify-center">
              <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          ) : (
            <CloudOff className="w-4 h-4 text-amber-500" />
          )}
        </button>
      </div>

      {/* اعلان فلوتینگ وضعیت هماهنگ‌سازی */}
      {toastNotice && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 ${
            toastNotice.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20'
          }`}
          dir="rtl"
        >
          {toastNotice.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-200 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
          )}
          <span>{toastNotice.text}</span>
        </div>
      )}

      {/* مدال جامع جزئیات و کنترل هماهنگ‌سازی دستی برای همه کاربران */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">هماهنگ‌سازی دستی با سرور مرکزی</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ذخیره، تبادل و ادغام هوشمند تغییرات بین دستگاه و سرور ابری</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* کارت وضعیت اتصال */}
            <div className={`p-4 rounded-2xl border mb-5 ${
              isServerConnected
                ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {isServerConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs leading-relaxed w-full">
                  <p className="font-bold text-sm">
                    {isServerConnected ? 'ارتباط با سرور اصلی سامانه برقرار است' : 'عدم اتصال به سرور اصلی سامانه'}
                  </p>
                  <p>{status?.message || (isServerConnected ? 'سرویس ذخیره‌سازی و همگام‌سازی ابری فعال است.' : 'لطفاً اتصال اینترنت خود را بررسی نمایید.')}</p>
                  
                  <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono opacity-90 border-t border-emerald-200/60 dark:border-emerald-800/60 mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>زمان سرور: {syncTimeStr}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>دستگاه: {deviceId.substring(0, 14)}...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-bold mb-4 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* دکمه بزرگ اجرای هماهنگ‌سازی دستی برای همه کاربران */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {syncing ? 'در حال اجرای چرخه همگام‌سازی...' : 'هم‌اکنون هماهنگ‌سازی دستی را اجرا کن (دریافت و ارسال)'}
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
              <span>تغییرات تمامی کاربران به صورت هوشمند ادغام می‌گردند.</span>
              <button
                type="button"
                onClick={fetchStatus}
                disabled={loading}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                بررسی مجدد وضعیت
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
