package com.tahzib.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import java.util.Calendar

data class AppUsageInfo(
    val packageName: String,
    val appName: String,
    val usageTimeMillis: Long,
    val nightUsageMillis: Long
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

/**
 * استخراج نام خوانا و محلی برنامه با استفاده از PackageManager اندروید
 */
fun getAppReadableName(context: Context, packageName: String): String {
    return try {
        val pm = context.packageManager
        val appInfo = pm.getApplicationInfo(packageName, 0)
        pm.getApplicationLabel(appInfo).toString()
    } catch (e: Exception) {
        val parts = packageName.split(".")
        if (parts.size >= 2) parts.last().replaceFirstChar { it.uppercase() } else packageName
    }
}

/**
 * دریافت لیست کامل تمامی برنامه‌هایی که در گوشی فعالیت داشته‌اند (بدون محدود شدن به برنامه‌های خاص)
 * به همراه تفکیک مجزای برنامه‌ها و مدت زمان فعالیت آن‌ها پس از ساعت ۱۰:۳۰ شب (۲۲:۳۰)
 */
fun getAppUsageStats(context: Context): List<AppUsageInfo> {
    val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    val now = System.currentTimeMillis()

    // بازه کل شبانه‌روز جاری (از ساعت ۰۰:۰۰ بامداد امروز تا زمان فعلی)
    val startOfDay = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    // دریافت آمار استفاده کلی تمام برنامه‌ها در طول شبانه‌روز
    val stats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startOfDay,
        now
    )

    // محاسبه بازه استفاده شبانه بعد از ساعت ۱۰:۳۰ شب (۲۲:۳۰)
    val nightCal = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 22)
        set(Calendar.MINUTE, 30)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }

    var nightStartTime = nightCal.timeInMillis
    var nightEndTime = now

    // در صورتی که زمان فعلی پیش از ۲۲:۳۰ باشد (مثلاً صبح روز بعد خوداظهاری می‌شود)،
    // بازه ۲۲:۳۰ شب گذشته تا ۵ بامداد صبح مورد بررسی قرار می‌گیرد
    if (now < nightStartTime) {
        nightCal.add(Calendar.DAY_OF_YEAR, -1)
        nightStartTime = nightCal.timeInMillis
        val morningEnd = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 5)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        nightEndTime = if (now < morningEnd) now else morningEnd
    }

    // محاسبه مدت زمان استفاده هر برنامه بعد از ۲۲:۳۰ با استفاده از UsageEvents
    val nightUsageMap = mutableMapOf<String, Long>()
    try {
        val events = usageStatsManager.queryEvents(nightStartTime, nightEndTime)
        val event = UsageEvents.Event()
        val appLastForegroundTime = mutableMapOf<String, Long>()

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            val time = event.timeStamp

            when (event.eventType) {
                UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                    appLastForegroundTime[pkg] = time
                }
                UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                    val lastStart = appLastForegroundTime.remove(pkg)
                    if (lastStart != null && time >= lastStart) {
                        val duration = time - lastStart
                        nightUsageMap[pkg] = (nightUsageMap[pkg] ?: 0L) + duration
                    }
                }
            }
        }

        // در صورتی که برنامه‌ای در پایان بازه همچنان در پیش‌زمینه فعال بوده باشد
        for ((pkg, lastStart) in appLastForegroundTime) {
            if (nightEndTime > lastStart) {
                val duration = nightEndTime - lastStart
                nightUsageMap[pkg] = (nightUsageMap[pkg] ?: 0L) + duration
            }
        }
    } catch (e: Exception) {
        // مدیریت استثناء بدون متوقف کردن برنامه
    }

    // جمع‌آوری تمامی برنامه‌های دارای فعالیت
    val usageMap = mutableMapOf<String, Long>()
    if (stats != null) {
        for (usage in stats) {
            if (usage.totalTimeInForeground > 0) {
                usageMap[usage.packageName] = (usageMap[usage.packageName] ?: 0L) + usage.totalTimeInForeground
            }
        }
    }

    // افزودن برنامه‌هایی که در بازه شبانه فعال بوده‌اند
    for ((pkg, nightDuration) in nightUsageMap) {
        if (!usageMap.containsKey(pkg)) {
            usageMap[pkg] = nightDuration
        }
    }

    val resultList = mutableListOf<AppUsageInfo>()
    for ((pkg, totalTime) in usageMap) {
        val appName = getAppReadableName(context, pkg)
        val nightTime = nightUsageMap[pkg] ?: 0L
        resultList.add(
            AppUsageInfo(
                packageName = pkg,
                appName = appName,
                usageTimeMillis = totalTime,
                nightUsageMillis = nightTime
            )
        )
    }

    // مرتب‌سازی بر اساس بیشترین زمان کل مصرف
    return resultList.sortedByDescending { it.usageTimeMillis }
}
