import { getApiUrl } from './apiConfig';

/**
 * دانلود مستقیم و مطمئن فایل APK اپلیکیشن اندروید تهذیب در تمامی محیط‌ها
 * (Android WebView, Chrome, Firefox, Eitaa, Desktop)
 */
export function triggerApkDownload(customUrl?: string) {
  const downloadUrl = customUrl
    ? (customUrl.startsWith('http') ? customUrl : getApiUrl(customUrl))
    : getApiUrl('/download/tahzib.apk');

  // ۱. بررسی وجود پل نیتیو اندروید (AndroidBridge) جهت فراخوانی مستقیم Intent
  if (typeof (window as any).AndroidBridge !== 'undefined') {
    if (typeof (window as any).AndroidBridge.downloadApkFile === 'function') {
      try {
        const handled = (window as any).AndroidBridge.downloadApkFile(downloadUrl);
        if (handled) return;
      } catch (e) {
        console.warn('AndroidBridge.downloadApkFile error:', e);
      }
    }
    if (typeof (window as any).AndroidBridge.showToast === 'function') {
      (window as any).AndroidBridge.showToast('در حال شروع دانلود فایل APK...');
    }
  }

  // ۲. ایجاد عنصر <a> موقت با صفت download جهت فورس دانلود در مرورگرها
  try {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'tahzib-app.apk');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 200);
  } catch (e) {
    // در صورت مسدود شدن، تغییر آدرس پنجره اصلی
    window.location.href = downloadUrl;
  }
}
