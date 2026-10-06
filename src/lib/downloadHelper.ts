import { getAbsoluteApiUrl } from './apiConfig';

/**
 * دانلود مستقیم و مطمئن فایل APK اپلیکیشن اندروید تهذیب در تمامی محیط‌ها
 * (برنامک ایتا، WebView اندروید، Chrome، Firefox و دسکتاپ)
 */
export function triggerApkDownload(customUrl?: string) {
  // همیشه از آدرس مطلق شامل IP و پورت سرور استفاده می‌کنیم تا در ایتا و WebView مسدود نشود
  const absoluteUrl = customUrl
    ? (customUrl.startsWith('http://') || customUrl.startsWith('https://') ? customUrl : getAbsoluteApiUrl(customUrl))
    : getAbsoluteApiUrl('/download/tahzib.apk');

  console.log("Triggering APK Download URL:", absoluteUrl);

  // ۱. پشتیبانی اختصاصی از کیت توسعه پیام‌رسان ایتا و تلگرام (Eitaa / Telegram MiniApp SDK)
  const eitaaSdk = (window as any).Eitaa?.WebApp || (window as any).Telegram?.WebApp;
  if (eitaaSdk) {
    if (typeof eitaaSdk.openLink === 'function') {
      try {
        eitaaSdk.openLink(absoluteUrl);
        return;
      } catch (e) {
        console.warn("Eitaa openLink failed, trying fallbacks:", e);
      }
    }
  }

  // ۲. بررسی وجود پل نیتیو اندروید (AndroidBridge) جهت فراخوانی مستقیم دانلودکننده نیتیو دستگاه
  if (typeof (window as any).AndroidBridge !== 'undefined') {
    const bridge = (window as any).AndroidBridge;
    if (typeof bridge.downloadApkFile === 'function') {
      try {
        const handled = bridge.downloadApkFile(absoluteUrl);
        if (handled) return;
      } catch (e) {
        console.warn('AndroidBridge.downloadApkFile error:', e);
      }
    }
    if (typeof bridge.showToast === 'function') {
      bridge.showToast('در حال شروع دانلود فایل APK...');
    }
  }

  // ۳. باز کردن مستقیم آدرس مطلق در پنجره جدید مرورگر یا ریدایرکت اصلی
  try {
    const win = window.open(absoluteUrl, '_system') || window.open(absoluteUrl, '_blank');
    if (!win) {
      window.location.href = absoluteUrl;
    }
  } catch (e) {
    window.location.href = absoluteUrl;
  }
}
