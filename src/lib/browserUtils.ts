/**
 * بررسی اینکه آیا برنامه داخل WebView ایتا، تلگرام یا پیام‌رسان‌های ایرانی باز شده است
 */
export function isWebViewEnvironment(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const win = typeof window !== "undefined" ? (window as any) : {};
  return (
    /Eitaa/i.test(ua) ||
    /Rubika/i.test(ua) ||
    /Bale/i.test(ua) ||
    !!win.Eitaa?.WebApp ||
    !!win.Telegram?.WebApp?.initData
  );
}

/**
 * راه‌اندازی SDK ایتا / برنامک (تنظیم ارتفاع تمام‌صفحه، تم رنگی و اعلام آمادگی)
 */
export function initEitaaSDK() {
  if (typeof window === "undefined") return;
  const win = window as any;
  const eitaa = win.Eitaa?.WebApp || win.Telegram?.WebApp;

  if (eitaa) {
    try {
      // ۱. اعلام آمادگی به ایتا جهت بستن لودینگ اولیه
      if (typeof eitaa.ready === "function") eitaa.ready();

      // ۲. گسترش برنامه به ارتفاع کامل صفحه گوشی
      if (typeof eitaa.expand === "function") eitaa.expand();

      // ۳. تنظیم رنگ هدر و پس‌زمینه
      if (typeof eitaa.setHeaderColor === "function") eitaa.setHeaderColor("#1e1b4b");
      if (typeof eitaa.setBackgroundColor === "function") eitaa.setBackgroundColor("#f8fafc");

      console.log("✅ Eitaa WebApp SDK initialized successfully.");
    } catch (e) {
      console.warn("Error initializing Eitaa WebApp SDK:", e);
    }
  }
}
