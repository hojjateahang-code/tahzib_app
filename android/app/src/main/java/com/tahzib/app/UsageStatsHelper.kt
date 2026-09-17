package com.tahzib.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import java.util.Calendar

data class AppUsageInfo(
    val packageName: String,
    val usageTimeMillis: Long
)

fun hasUsageStatsPermission(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
    )
    return mode == AppOpsManager.MODE_ALLOWED
}

fun requestUsageStatsPermission(context: Context) {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
}

fun getAppUsageStats(context: Context): List<AppUsageInfo> {
    val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    // تعیین بازه زمانی (از شروع امروز تا زمان حال)
    val calendar = Calendar.getInstance()
    val endTime = calendar.timeInMillis
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    val startTime = calendar.timeInMillis

    // دریافت آمار روزانه
    val stats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime,
        endTime
    )

    val usageList = mutableListOf<AppUsageInfo>()
    if (stats != null) {
        // فیلتر کردن برنامه‌هایی که زمان استفاده از آن‌ها صفر است
        for (usageStats in stats) {
            if (usageStats.totalTimeInForeground > 0) {
                usageList.add(AppUsageInfo(usageStats.packageName, usageStats.totalTimeInForeground))
            }
        }
    }

    // مرتب‌سازی بر اساس بیشترین زمان مصرف
    return usageList.sortedByDescending { it.usageTimeMillis }
}
