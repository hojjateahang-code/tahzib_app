/**
 * مدیریت آدرس سرور اصلی و مسیرهای API
 * این ماژول تضمین می‌کند که اپلیکیشن چه در مرورگر وب، چه داخل پیام‌رسان ایتا و چه به عنوان APK مستقل اندروید،
 * درخواست‌های خود را به سرور اصلی ارسال کرده و دیتابیس همیشه آنلاین و همگام باشد.
 */

const STORAGE_KEY_CUSTOM_SERVER = 'custom_server_api_url';
export const DEFAULT_PRODUCTION_SERVER = 'https://ais-pre-ef5fjznqypc7c7a4bgzzpu-584824184963.us-west2.run.app';

/**
 * دریافت آدرس ذخیره‌شده توسط کاربر در حافظه محلی
 */
export function getStoredServerUrl(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(STORAGE_KEY_CUSTOM_SERVER) || '').trim();
}

/**
 * ذخیره آدرس دلخواه سرور
 */
export function setStoredServerUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean) {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_SERVER);
  } else {
    localStorage.setItem(STORAGE_KEY_CUSTOM_SERVER, clean);
  }
}

/**
 * بررسی اینکه آیا محیط فعلی کلاینت مستقل آفلاین/محلی مانند WebView اندروید است
 */
export function isLocalNativeClient(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'appassets.androidplatform.net' ||
    window.location.protocol === 'file:' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    !!(window as any).AndroidBridge
  );
}

/**
 * دریافت آدرس پایه سرور اینترنتی
 */
export function getServerApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // ۱. اولویت اول: آدرسی که کاربر در تنظیمات دیباگ/همگام‌سازی ذخیره کرده است
  const userCustom = getStoredServerUrl();
  if (userCustom) {
    return userCustom.replace(/\/+$/, '');
  }

  // ۲. اولویت دوم: متغیر محیطی زمان بیلد
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // ۳. اولویت سوم: اگر در مرورگر یا وب‌اپ ایتا هستیم (دامنه واقعی اینترنتی است)
  const isLocal = isLocalNativeClient();
  if (!isLocal && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  // ۴. اولویت چهارم: دریافت آدرس سرور پیش‌فرض از پل نیتیو اندروید (AndroidBridge)
  const win = window as any;
  if (win.AndroidBridge && typeof win.AndroidBridge.getServerUrl === 'function') {
    try {
      const bridgeUrl = win.AndroidBridge.getServerUrl();
      if (bridgeUrl && typeof bridgeUrl === 'string' && bridgeUrl.trim() && !bridgeUrl.includes('appassets')) {
        return bridgeUrl.trim().replace(/\/+$/, '');
      }
    } catch (e) {
      // ignore
    }
  }

  // ۵. در نهایت آدرس سرور اصلی فعال سامانه
  return DEFAULT_PRODUCTION_SERVER;
}

/**
 * ساخت آدرس کامل برای ارسال درخواست به سرور
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getServerApiBaseUrl();
  
  // اگر در وب عادی هستیم و نیازی به آدرس مطلق نیست
  if (!isLocalNativeClient() && !getStoredServerUrl()) {
    return cleanPath;
  }

  if (!baseUrl) {
    return cleanPath;
  }

  return `${baseUrl}${cleanPath}`;
}
