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
}
