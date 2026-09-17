# پروژه اندروید نیتیو سامانه تهذیب (Android Studio)

این پوشه حاوی یک پروژه نیتیو کامل **Android Studio (Kotlin)** است که برای سامانه تهذیب ساخته شده است.

---

## ❓ پاسخ به دو سوال مهم شما:

### ۱. فایل `.env` در برنامه اندروید چی میشه؟
در پروژه اندروید (کاتلین)، فایل `.env` به صورت مستقیم توسط سیستم‌عامل اندروید پردازش نمی‌شود. در عوض:
* متغیرهای محیطی مانند **آدرس سرور** (`SERVER_URL`) یا کلیدهای برنامه در فایل `android/app/build.gradle` درون بخش `defaultConfig` به صورت `buildConfigField` تعریف می‌شوند:
  ```groovy
  buildConfigField "String", "SERVER_URL", "\"https://ais-dev-ef5fjznqypc7c7a4bgzzpu-584824184963.us-west2.run.app\""
  ```
* سپس در کد کاتلین (`MainActivity.kt`) از طریق `BuildConfig.SERVER_URL` قابل دسترسی است.
* در صورت نیاز به فایل اختصاصی کلیدها، از فایل `local.properties` در اندروید استادیو استفاده می‌شود.

---

### ۲. ساختار کدهای کاتلین جهت استخراج آمار مصرف (`PACKAGE_USAGE_STATS`)

کدها دقیقاً طبق درخواست شما در کلاس‌های مجزا و تمیز پیاده‌سازی شده‌اند:

1. **کلاس داده `AppUsageInfo`**:
   ```kotlin
   data class AppUsageInfo(val packageName: String, val usageTimeMillis: Long)
   ```

2. **توابع کمکی کاتلین (`UsageStatsHelper.kt`)**:
   * `hasUsageStatsPermission(context)`: بررسی مجوز دسترسی به آمار سیستم
   * `requestUsageStatsPermission(context)`: هدایت کاربر به تنظیمات جهت اعطای دسترسی
   * `getAppUsageStats(context)`: استخراج لیست مرتب‌شده برنامه‌ها و میزان استفاده روزانه

3. **پل ارتباطی وب‌ویو (`WebAppInterface.kt`)**:
   * ایجاد متد متصل به `AndroidBridge` جهت فراخوانی مستقیم از فرانت‌اند وب و ایتا.

---

## 🚀 نحوه خروجی گرفتن و اجرا در Android Studio

1. **Android Studio** را باز کنید.
2. گزینه **Open** را زده و پوشه `android` را انتخاب کنید.
3. منتظر بمانید Gradle پروژه را سینک کند.
4. از منوی بالا: `Build > Build Bundle(s) / APK(s) > Build APK(s)` را بزنید تا فایل نصب **APK** آماده شود.
