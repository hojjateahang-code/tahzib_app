package com.tahzib.app

import android.content.Context
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

class WebAppInterface(private val mContext: Context) {

    /**
     * ۱. بررسی داشتن مجوز PACKAGE_USAGE_STATS
     */
    @JavascriptInterface
    fun hasUsageStatsPermission(): Boolean {
        return hasUsageStatsPermission(mContext)
    }

    /**
     * ۲. هدایت کاربر به صفحه تنظیمات جهت اعطای دسترسی
     */
    @JavascriptInterface
    fun requestUsageStatsPermission() {
        requestUsageStatsPermission(mContext)
    }

    /**
     * ۳. دریافت آمار استفاده از برنامه‌ها و خروجی JSON برای برنامک تهذیب
     */
    @JavascriptInterface
    fun getAppUsageStats(): String {
        val usageList = getAppUsageStats(mContext)
        val jsonArray = JSONArray()

        for (info in usageList) {
            val obj = JSONObject()
            obj.put("packageName", info.packageName)
            obj.put("appName", info.appName)
            obj.put("usageTimeMillis", info.usageTimeMillis)
            obj.put("nightUsageMillis", info.nightUsageMillis)
            jsonArray.put(obj)
        }

        return jsonArray.toString()
    }

    /**
     * ۴. دریافت آدرس پیش‌فرض سرور اصلی اینترنتی سامانه جهت اتصال APIها
     */
    @JavascriptInterface
    fun getServerUrl(): String {
        val prefs = mContext.getSharedPreferences("tahzib_config", Context.MODE_PRIVATE)
        val custom = prefs.getString("custom_server_url", null)
        return if (!custom.isNullOrBlank()) custom else BuildConfig.REMOTE_SERVER_URL
    }

    /**
     * ۵. تنظیم آدرس جدید سرور توسط مدیر/مسئول فنی
     */
    @JavascriptInterface
    fun setServerUrl(newUrl: String): Boolean {
        return try {
            val prefs = mContext.getSharedPreferences("tahzib_config", Context.MODE_PRIVATE)
            prefs.edit().putString("custom_server_url", newUrl.trim()).apply()
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * ۶. بازنشانی آدرس سرور به حالت پیش‌فرض
     */
    @JavascriptInterface
    fun resetServerUrl(): Boolean {
        return try {
            val prefs = mContext.getSharedPreferences("tahzib_config", Context.MODE_PRIVATE)
            prefs.edit().remove("custom_server_url").apply()
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * ۷. رفرش و بارگذاری مجدد برنامه با آدرس جدید
     */
    @JavascriptInterface
    fun reloadApp() {
        if (mContext is MainActivity) {
            mContext.runOnUiThread {
                mContext.reloadAppUrl()
            }
        }
    }

    /**
     * ۸. دانلود مستقیم فایل APK در مدیریت دانلود نیتیو دستگاه یا مرورگر
     */
    @JavascriptInterface
    fun downloadApkFile(url: String): Boolean {
        return try {
            val request = android.app.DownloadManager.Request(android.net.Uri.parse(url))
            request.setTitle("سامانه تهذیب - فایل APK")
            request.setDescription("در حال دریافت نسخه جدید اپلیکیشن اندروید...")
            request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, "tahzib-app.apk")
            request.setMimeType("application/vnd.android.package-archive")

            val manager = mContext.getSystemService(Context.DOWNLOAD_SERVICE) as? android.app.DownloadManager
            if (manager != null) {
                manager.enqueue(request)
                if (mContext is MainActivity) {
                    mContext.runOnUiThread {
                        android.widget.Toast.makeText(mContext, "دانلود فایل APK آغاز شد. نوار اعلانات بالای گوشی را بررسی فرمایید.", android.widget.Toast.LENGTH_LONG).show()
                    }
                }
                true
            } else {
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                mContext.startActivity(intent)
                true
            }
        } catch (e: Exception) {
            try {
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                mContext.startActivity(intent)
                true
            } catch (ex: Exception) {
                false
            }
        }
    }

    /**
     * ۹. نمایش پیام متنی شناور (Toast) در اندروید
     */
    @JavascriptInterface
    fun showToast(message: String) {
        if (mContext is MainActivity) {
            mContext.runOnUiThread {
                android.widget.Toast.makeText(mContext, message, android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }
}
