import React, { useState } from "react";
import { testMinIOConnection, type MinIOHealthStatus } from "../lib/cloudSync";
import { getServerApiBaseUrl, setStoredServerUrl } from "../lib/apiConfig";

export function MinioConnectionDebugWidget() {
  const [showPanel, setShowPanel] = useState(false);
  const [testing, setTesting] = useState(false);
  const [healthResult, setHealthResult] = useState<MinIOHealthStatus | null>(null);
  const [serverUrlInput, setServerUrlInput] = useState(getServerApiBaseUrl());
  const [isSaved, setIsSaved] = useState(false);

  const handleRunDiagnostics = async () => {
    setTesting(true);
    setHealthResult(null);
    const result = await testMinIOConnection();
    setHealthResult(result);
    setTesting(false);
  };

  const handleSaveServerUrl = async () => {
    setStoredServerUrl(serverUrlInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
    handleRunDiagnostics();
  };

  const handleResetServerUrl = () => {
    setStoredServerUrl('');
    const defaultUrl = getServerApiBaseUrl();
    setServerUrlInput(defaultUrl);
    handleRunDiagnostics();
  };

  const getEitaaEnvInfo = () => {
    if (typeof window === "undefined") {
      return {
        url: "",
        isEitaaSDKPresent: false,
        userAgent: "",
        hasSessionCache: false,
      };
    }

    const win = window as any;
    return {
      url: window.location.href,
      isEitaaSDKPresent: !!(win.Eitaa?.WebApp || win.Telegram?.WebApp),
      userAgent: navigator.userAgent,
      hasSessionCache: !!sessionStorage.getItem("eitaa_detected_user"),
    };
  };

  const env = getEitaaEnvInfo();

  return (
    <div className="max-w-md w-full mt-6 text-center" dir="rtl">
      {/* دکمه باز و بسته‌کردن پنل عیب‌یابی */}
      <button
        type="button"
        onClick={() => setShowPanel(!showPanel)}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/60 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-sm"
      >
        <span>🛠️</span>
        <span>{showPanel ? "پنهان‌سازی پنل دیباگ و تست اتصال" : "نمایش پنل عیب‌یابی و تست اتصال سرور اصلی"}</span>
      </button>

      {/* باکس محتوای دیباگ */}
      {showPanel && (
        <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-right space-y-4 shadow-xl text-xs text-white animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-black text-indigo-400 text-xs">وضعیت اتصال به سرور اصلی اینترنتی سامانه</span>
            <button
              onClick={handleRunDiagnostics}
              disabled={testing}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1"
            >
              {testing ? "در حال تست..." : "تست اتصال زنده سرور"}
            </button>
          </div>

          {/* نتیجه تست اتصال سرور اصلی */}
          {healthResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                healthResult.success
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                  : "bg-rose-950/60 border-rose-800 text-rose-300"
              }`}
            >
              <span className="text-base">{healthResult.success ? "✅" : "❌"}</span>
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold">{healthResult.message}</p>
                {healthResult.details && (
                  <p className="text-[10px] opacity-80 font-mono dir-ltr text-right">
                    نوع ذخیره‌ساز: {healthResult.details.storageType || "دیسک سرور اصلی"} {healthResult.details.storagePath ? `| مسیر: ${healthResult.details.storagePath}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* تنظیم و نمایش آدرس سرور اصلی سامانه */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800 text-slate-300 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-indigo-400 font-bold">آدرس سرور اینترنتی پایگاه داده (API URL):</span>
              {isSaved && <span className="text-[10px] text-emerald-400 font-bold animate-pulse">✓ ذخیره شد</span>}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                dir="ltr"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="https://your-server.ir"
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-emerald-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveServerUrl}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition shadow-sm"
              >
                ذخیره
              </button>
              <button
                type="button"
                onClick={handleResetServerUrl}
                title="بازنشانی به پیش‌فرض"
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition"
              >
                پیش‌فرض
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              در نسخه نصبی اندروید (APK)، تمامی درخواست‌های اتصال به دیتابیس و همگام‌سازی ابری به این آدرس ارسال می‌شوند.
            </p>
          </div>

          {/* اطلاعات محیطی ایتا و URL */}
          <div className="space-y-2 pt-2 border-t border-slate-800 text-slate-300 text-[11px]">
            <div>
              <span className="text-indigo-400 font-bold block mb-1">آدرس فعلی وب‌ویو (WebView URL):</span>
              <div className="bg-slate-950 p-2 rounded-lg text-[10px] break-all text-emerald-400 font-mono dir-ltr text-left">
                {env.url}
              </div>
            </div>

            <div className="flex justify-between border-b border-slate-800/60 py-1.5">
              <span className="text-slate-400">SDK برنامک ایتا:</span>
              <span className={env.isEitaaSDKPresent ? "text-emerald-400 font-bold" : "text-amber-400"}>
                {env.isEitaaSDKPresent ? "شناسایی شد (داخل ایتا)" : "شناسایی نشد (مرورگر عادی)"}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">کش اطلاعات کاربر ایتا:</span>
              <span className={env.hasSessionCache ? "text-emerald-400 font-bold" : "text-slate-500"}>
                {env.hasSessionCache ? "موجود در sessionStorage" : "خالی"}
              </span>
            </div>
          </div>

          {/* چک‌لیست رفع خطاهای رایج برای تیم فنی */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-indigo-300 font-bold block text-[11px]">📋 راهنمای عیب‌یابی و رفع خطاها:</span>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-2 text-slate-300 leading-relaxed">
              <div className="border-b border-slate-800/80 pb-1.5">
                <span className="text-rose-400 font-bold">• CORS Error در MinIO:</span> تنظیم هدرهای مجاز در باکت MinIO با <code className="text-indigo-300">AllowedOrigins: *</code> و هدرهای <code className="text-indigo-300">x-minio-endpoint</code>.
              </div>
              <div className="border-b border-slate-800/80 pb-1.5">
                <span className="text-amber-400 font-bold">• عدم شناسایی کاربر ایتا:</span> بررسی وجود <code className="text-indigo-300">window.Eitaa.WebApp</code> و لینک مینی‌اپ <code className="text-indigo-300">https://eitaa.com/app/...</code>
              </div>
              <div className="border-b border-slate-800/80 pb-1.5">
                <span className="text-emerald-400 font-bold">• لودینگ طولانی در ایتا:</span> اجرای خودکار <code className="text-indigo-300">eitaa.ready()</code> و <code className="text-indigo-300">eitaa.expand()</code> در زمان لود.
              </div>
              <div>
                <span className="text-cyan-400 font-bold">• تغییر آیدی کاربر:</span> ذخیره‌سازی همزمان شناسه عددی ثابت ایتا (<code className="text-indigo-300">user_id</code>) علاوه بر آیدی متنی.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
