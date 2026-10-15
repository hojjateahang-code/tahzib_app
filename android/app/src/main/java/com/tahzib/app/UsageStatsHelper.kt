package com.tahzib.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class AppUsageInfo(
    val packageName: String,
    val appName: String,
    val usageTimeMillis: Long,
    val nightUsageMillis: Long
)

data class DayUsageReport(
    val date: String,
    val totalMinutes: Long,
    val nightMinutes: Long,
    val apps: List<AppUsageInfo>
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
 * محاسبه دقیق مدت زمان استفاده در یک بازه زمانی معین
 * با رعایت سقف ریاضی شبانه‌روز (حداکثر ۲۴ ساعت) و جلوگیری از دوبار شماری در گوشی‌های مختلف
 */
fun calculateAccurateUsageForWindow(
    context: Context,
    windowStart: Long,
    windowEnd: Long
): List<AppUsageInfo> {
    val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val windowDuration = Math.max(1000L, windowEnd - windowStart)

    val totalUsageMap = mutableMapOf<String, Long>()
    val nightUsageMap = mutableMapOf<String, Long>()

    // روش اول: تحلیل رویدادهای دقیق (UsageEvents) با ردیابی تک‌برنامه‌ای جهت جلوگیری از انباشت ساعت‌های کاذب
    try {
        val events = usageStatsManager.queryEvents(windowStart, windowEnd)
        val event = UsageEvents.Event()
        val appLastResume = mutableMapOf<String, Long>()

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            val time = Math.max(windowStart, Math.min(event.timeStamp, windowEnd))

            // فیلتر کردن سرویس‌های داخلی سیستمی اندروید
            if (pkg == "android" || pkg == "com.android.systemui") continue

            when (event.eventType) {
                UsageEvents.Event.MOVE_TO_FOREGROUND,
                UsageEvents.Event.ACTIVITY_RESUMED -> {
                    // در زمان باز شدن یک برنامه جدید، هر برنامه قبلی که در پیش‌زمینه مانده بود فوراً پایان می‌یابد
                    for ((otherPkg, start) in appLastResume.toMap()) {
                        if (otherPkg != pkg && start != null && time > start) {
                            val sessionDuration = Math.min(time, windowEnd) - start
                            if (sessionDuration > 0) {
                                totalUsageMap[otherPkg] = (totalUsageMap[otherPkg] ?: 0L) + sessionDuration
                                val nightPortion = computeNightOverlap(start, Math.min(time, windowEnd))
                                if (nightPortion > 0) {
                                    nightUsageMap[otherPkg] = (nightUsageMap[otherPkg] ?: 0L) + nightPortion
                                }
                            }
                            appLastResume.remove(otherPkg)
                        }
                    }
                    appLastResume[pkg] = time
                }
                UsageEvents.Event.MOVE_TO_BACKGROUND,
                UsageEvents.Event.ACTIVITY_PAUSED,
                23 /* ACTIVITY_STOPPED */ -> {
                    val start = appLastResume.remove(pkg)
                    if (start != null && time > start) {
                        val sessionDuration = Math.min(time, windowEnd) - start
                        if (sessionDuration > 0) {
                            totalUsageMap[pkg] = (totalUsageMap[pkg] ?: 0L) + sessionDuration
                            val nightPortion = computeNightOverlap(start, Math.min(time, windowEnd))
                            if (nightPortion > 0) {
                                nightUsageMap[pkg] = (nightUsageMap[pkg] ?: 0L) + nightPortion
                            }
                        }
                    }
                }
                16 /* SCREEN_NON_INTERACTIVE */,
                18 /* KEYGUARD_SHOWN */ -> {
                    // با خاموش یا قفل شدن صفحه گوشی، نشست فعال بسته می‌شود تا استفاده بی‌مورد ثبت نشود
                    for ((otherPkg, start) in appLastResume.toMap()) {
                        if (start != null && time > start) {
                            val sessionDuration = Math.min(time, windowEnd) - start
                            if (sessionDuration > 0) {
                                totalUsageMap[otherPkg] = (totalUsageMap[otherPkg] ?: 0L) + sessionDuration
                                val nightPortion = computeNightOverlap(start, Math.min(time, windowEnd))
                                if (nightPortion > 0) {
                                    nightUsageMap[otherPkg] = (nightUsageMap[otherPkg] ?: 0L) + nightPortion
                                }
                            }
                        }
                        appLastResume.remove(otherPkg)
                    }
                }
            }
        }

        // برای برنامه‌ای که در آخرین لحظه استخراج باز بوده است
        for ((pkg, start) in appLastResume) {
            if (windowEnd > start) {
                val sessionDuration = windowEnd - start
                totalUsageMap[pkg] = (totalUsageMap[pkg] ?: 0L) + sessionDuration
                val nightPortion = computeNightOverlap(start, windowEnd)
                if (nightPortion > 0) {
                    nightUsageMap[pkg] = (nightUsageMap[pkg] ?: 0L) + nightPortion
                }
            }
        }
    } catch (e: Exception) {
        // در صورت خطای خواندن رویدادها، متد دوم اجرا می‌شود
    }

    // روش دوم: بازیابی برنامه‌هایی که ممکن است به دلیل بهینه‌سازی خاص باتری رویداد نداده باشند
    try {
        val aggregated = usageStatsManager.queryAndAggregateUsageStats(windowStart, windowEnd)
        if (aggregated != null) {
            for ((pkg, stats) in aggregated) {
                if (pkg == "android" || pkg == "com.android.systemui") continue
                val time = stats.totalTimeInForeground
                if (time > 0) {
                    val current = totalUsageMap[pkg] ?: 0L
                    if (current == 0L) {
                        // برنامه‌ای که در روش اول ثبت نشده بود ولی در آمار خود گوشی وجود دارد اضافه می‌شود
                        totalUsageMap[pkg] = Math.min(time, windowDuration)
                    } else if (time > current && current < 60_000L) {
                        // در صورتی که رویدادها خیلی ناقص بوده باشند
                        totalUsageMap[pkg] = Math.min(time, windowDuration)
                    }
                }
            }
        }
    } catch (e: Exception) {
        // نادیده گرفتن
    }

    // سقف قطعی ریاضی: هیچ برنامه‌ای نمی‌تواند بیش از مدت بازه (حداکثر ۲۴ ساعت) باشد
    val maxAllowedMillis = Math.min(windowDuration, 24 * 60 * 60 * 1000L)
    for ((pkg, time) in totalUsageMap) {
        if (time > maxAllowedMillis) {
            totalUsageMap[pkg] = maxAllowedMillis
        }
    }

    // اصلاح مجموع کل برنامه‌ها: اگر مجموع استفاده بیش از ۲۴ ساعت شده باشد نرمال‌سازی می‌شود
    val totalSum = totalUsageMap.values.sum()
    val scaleFactor = if (totalSum > maxAllowedMillis && totalSum > 0) {
        maxAllowedMillis.toDouble() / totalSum.toDouble()
    } else {
        1.0
    }

    val resultList = mutableListOf<AppUsageInfo>()
    for ((pkg, totalTime) in totalUsageMap) {
        val scaledTotal = (totalTime * scaleFactor).toLong()
        val nightTime = Math.min(nightUsageMap[pkg] ?: 0L, scaledTotal)
        if (scaledTotal >= 10_000L) { // حداقل ۱۰ ثانیه استفاده واقعی
            val appName = getAppReadableName(context, pkg)
            resultList.add(
                AppUsageInfo(
                    packageName = pkg,
                    appName = appName,
                    usageTimeMillis = scaledTotal,
                    nightUsageMillis = nightTime
                )
            )
        }
    }

    return resultList.sortedByDescending { it.usageTimeMillis }
}

/**
 * محاسبه همپوشانی یک نشست کاری با ساعت ۲۲:۳۰ شب تا ۰۵:۰۰ بامداد
 */
private fun computeNightOverlap(start: Long, end: Long): Long {
    var overlap = 0L
    val cal = Calendar.getInstance()
    cal.timeInMillis = start

    // بررسی ساعت ۲۲:۳۰ امروز
    cal.set(Calendar.HOUR_OF_DAY, 22)
    cal.set(Calendar.MINUTE, 30)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    val nightStartToday = cal.timeInMillis

    cal.add(Calendar.DAY_OF_YEAR, 1)
    cal.set(Calendar.HOUR_OF_DAY, 5)
    cal.set(Calendar.MINUTE, 0)
    val morningEndNextDay = cal.timeInMillis

    // همپوشانی با بازه شب جاری
    val s1 = Math.max(start, nightStartToday)
    val e1 = Math.min(end, morningEndNextDay)
    if (e1 > s1) {
        overlap += (e1 - s1)
    }

    // بررسی بازه بامداد امروز (۰۰:۰۰ تا ۰۵:۰۰)
    cal.timeInMillis = start
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    val midnightStart = cal.timeInMillis
    cal.set(Calendar.HOUR_OF_DAY, 5)
    val morningEndToday = cal.timeInMillis

    val s2 = Math.max(start, midnightStart)
    val e2 = Math.min(end, morningEndToday)
    if (e2 > s2) {
        overlap += (e2 - s2)
    }

    return Math.min(overlap, end - start)
}

/**
 * دریافت آمار دقیق ۲۴ ساعت قبل از همان ساعتی که دکمه استخراج زده می‌شود
 */
fun getAppUsageStats(context: Context): List<AppUsageInfo> {
    val now = System.currentTimeMillis()
    val start24hAgo = now - (24 * 60 * 60 * 1000L)
    return calculateAccurateUsageForWindow(context, start24hAgo, now)
}

/**
 * استخراج چندروزه (امروز به همراه روزهای قبل تا ۷ یا ۱۴ روز گذشته)
 * برای ثبت و به‌روزرسانی در دیتابیس سامانه
 */
fun getMultiDayAppUsageStats(context: Context, days: Int = 14): List<DayUsageReport> {
    val reports = mutableListOf<DayUsageReport>()
    val now = System.currentTimeMillis()
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    for (i in 0 until Math.max(1, Math.min(days, 14))) {
        val windowEnd = now - (i * 24 * 60 * 60 * 1000L)
        val windowStart = windowEnd - (24 * 60 * 60 * 1000L)
        val dateStr = sdf.format(Date(windowStart + (12 * 60 * 60 * 1000L)))

        val dayApps = calculateAccurateUsageForWindow(context, windowStart, windowEnd)
        val totalMins = dayApps.sumOf { it.usageTimeMillis } / 60000L
        val nightMins = dayApps.sumOf { it.nightUsageMillis } / 60000L

        reports.add(
            DayUsageReport(
                date = dateStr,
                totalMinutes = totalMins,
                nightMinutes = nightMins,
                apps = dayApps
            )
        )
    }

    return reports
}
