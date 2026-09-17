import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Upload, CheckCircle2, AlertCircle, Server, Clock, ShieldCheck } from 'lucide-react';
import { checkMinIOStatus, syncMinIOData, getDeviceId, getSynchronizedTime, type MinioStatus } from '../../sync';
import { useAuth } from '../../store';

export function MinioSyncModal() {
  const { currentUser } = useAuth();
  const isTechAdmin = currentUser?.role === 'TECH_ADMIN';

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<MinioStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleSyncNow = async () => {
    if (!isTechAdmin) return;
    setSyncing(true);
    setMessage(null);
    const res = await syncMinIOData();
    setSyncing(false);
    if (res.success) {
      setMessage({ type: 'success', text: `${res.message} (زمان همگام‌سازی: ${new Date(getSynchronizedTime()).toLocaleTimeString('fa-IR')})` });
      fetchStatus();
    } else {
      setMessage({ type: 'error', text: res.message });
    }
  };

  const deviceId = getDeviceId();
  const syncTimeStr = new Date(getSynchronizedTime()).toLocaleTimeString('fa-IR');

  const isMinioConnected = status?.storageType === 'minio' && status?.connected;

  // Non-Tech Admin (regular users): Passive visual status indicator only!
  if (!isTechAdmin) {
    return (
      <div
        className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl text-xs font-bold border transition-colors select-none ${
          isMinioConnected
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : status?.configured
            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
        }`}
        title={isMinioConnected ? 'ارتباط با سرور ابری همگام‌سازی برقرار است' : 'ارتباط ابری قطع می‌باشد'}
      >
        {isMinioConnected ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </>
        ) : (
          <CloudOff className="w-4 h-4 text-amber-500 shrink-0" />
        )}
        <span className="hidden md:inline">
          {isMinioConnected ? 'همگام ابری' : 'ذخیره‌ساز محلی'}
        </span>
      </div>
    );
  }

  // Technical Manager (TECH_ADMIN): Fully comprehensive interactive modal
  return (
    <>
      <button
        onClick={() => { setIsOpen(true); fetchStatus(); }}
        className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
          isMinioConnected
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            : status?.configured
            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
        }`}
        title="مدیریت و کنترل همگام‌سازی ابری مینیو (مخصوص مسئول فنی)"
      >
        {isMinioConnected ? (
          <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <CloudOff className="w-4 h-4 text-amber-500 shrink-0" />
        )}
        <span className="hidden md:inline">
          {isMinioConnected ? 'همگام‌سازی ابری (MinIO)' : 'همگام‌سازی محلی'}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">همگام‌سازی پیشرفته (ویژه مسئول فنی)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">الگوریتم ادغام هوشمند LWW + همگام‌سازی زمان سرور و تفکیک دستگاه‌ها</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Status Card */}
            <div className={`p-4 rounded-2xl border mb-5 ${
              isMinioConnected
                ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {isMinioConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs leading-relaxed w-full">
                  <p className="font-bold text-sm">
                    {isMinioConnected ? 'ارتباط با سرور مینیو و موتور ادغام ابری برقرار است' : 'حالت ذخیره‌سازی محلی (عدم اتصال MinIO)'}
                  </p>
                  <p>{status?.message}</p>
                  
                  <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono opacity-90 border-t border-emerald-200/60 dark:border-emerald-800/60 mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>زمان همگام سرور: {syncTimeStr}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>شناسه دستگاه: {deviceId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-bold mb-4 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Sync Actions */}
            <div className="space-y-3">
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                اجرای چرخه همگام‌سازی (دریافت، ادغام هوشمند، انتشار)
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
              <span>توضیح: تغییرات همه کاربران بدون Overwrite تجمیع می‌شوند.</span>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                بررسی مجدد
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
