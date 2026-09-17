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
            obj.put("usageTimeMillis", info.usageTimeMillis)
            jsonArray.put(obj)
        }

        return jsonArray.toString()
    }
}
