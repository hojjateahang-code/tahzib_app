package com.tahzib.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Process
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
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

/**
 * کلمات کلیدی عناوین سیستمی جهت مسدودسازی قطعی نمایش آن‌ها در لیست برنامه‌ها
 */
private val SYSTEM_LABEL_KEYWORDS = listOf(
    "سیستم",
    "راه‌انداز",
    "لانچر",
    "صفحه اصلی",
    "امنیت",
    "تنظیمات",
    "خدمات google",
    "system ui",
    "android system",
    "settings",
    "security",
    "launcher",
    "system launcher",
    "quick ball",
    "always on display",
    "xiaomi service",
    "google play services",
    "device care",
    "smart capture"
)

/**
 * لیست سیاه قطعی بسته‌ها و فرآیندهای سیستمی (شیائومی MIUI/HyperOS، سامسونگ، گوگل و اندروید خام)
 */
private val SYSTEM_PACKAGE_BLACKLIST = setOf(
    "android",
    "com.android.systemui",
    "com.android.settings",
    "com.android.keyguard",
    "com.android.phone",
    "com.android.server.telecom",
    "com.android.incallui",
    "com.android.captiveportallogin",
    "com.android.permissioncontroller",
    "com.android.packageinstaller",
    "com.google.android.packageinstaller",
    "com.google.android.permissioncontroller",
    "com.google.android.gms",
    "com.google.android.gsf",
    "com.google.android.setupwizard",

    // سرویس‌های سیستمی و پس‌زمینه شیائومی (Xiaomi MIUI & HyperOS)
    "com.miui.home",                 // لانچر و صفحه اصلی شیائومی
    "com.miui.securitycenter",       // امنیت و بهینه‌ساز شیائومی
    "com.miui.securityadd",          // افزونه‌های امنیت شیائومی
    "com.miui.powerkeeper",          // بهینه‌ساز باتری شیائومی
    "com.miui.cleanmaster",          // پاک‌کننده حافظه
    "com.miui.system",               // هسته سیستم شیائومی
    "com.miui.screenrecorder",       // ضبط صفحه
    "com.miui.touchassistant",       // دستیار لمسی و کلید شناور
    "com.miui.aod",                  // صفحه نمایش همیشه روشن
    "com.miui.notification",         // مدیریت اعلان‌ها
    "com.miui.hybrid",               // موتور وب داخلی
    "com.miui.miservice",            // پشتیبانی شیائومی
    "com.miui.msa.global",           // فریم‌ورک سرویس‌های شیائومی
    "com.miui.contentcatcher",       // اسکنر محتوای شیائومی
    "com.miui.personalassistant",    // دستیار هوشمند و App Vault
    "com.miui.weather2",             // ویجت هوای پس‌زمینه
    "com.miui.gallery.cloud",        // همگام‌ساز گالری شیائومی
    "com.xiaomi.misettings",         // تنظیمات تکمیلی شیائومی
    "com.xiaomi.joyose",             // کنترل بازی و باتری شیائومی
    "com.xiaomi.xmsf",               // سرویس پوش نوتیفیکیشن شیائومی
    "com.mi.android.globallauncher", // لانچر پوکو

    // سرویس‌های سامسونگ
    "com.sec.android.app.launcher",
    "com.samsung.android.app.cocktailbarservice",
    "com.samsung.android.app.smartcapture",
    "com.samsung.android.lool",
    "com.samsung.android.honeyboard",

    // هواوی
    "com.huawei.android.launcher"
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
 * تشخیص هوشمند لانچر پیش‌فرض یا رابط کاربری صفحه اصلی
 */
private fun isLauncherApp(context: Context, packageName: String): Boolean {
    return try {
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val resolveInfos = context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
        resolveInfos.any { it.activityInfo?.packageName == packageName }
    } catch (e: Exception) {
        false
    }
}

/**
 * تشخیص کیبوردها و ورودی‌های متنی (Input Method)
 */
private fun isKeyboardApp(context: Context, packageName: String): Boolean {
    return try {
        val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager ?: return false
        imm.enabledInputMethodList.any { it.packageName == packageName }
    } catch (e: Exception) {
        false
    }
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
 * اعتبارسنجی قطعی اینکه آیا یک پکیج، یک برنامه کاربردی واقعی و مستقل توسط کاربر است یا فرآیند سیستمی
 */
fun isRealUserApp(context: Context, packageName: String): Boolean {
    val cleanPkg = packageName.trim().lowercase()

    // ۱. بررسی لیست سیاه پکیج‌ها
    if (SYSTEM_PACKAGE_BLACKLIST.contains(cleanPkg)) return false

    // ۲. فیلتر کردن سرویس‌های سیستمی شیائومی و سامسونگ
    if (cleanPkg.startsWith("com.miui.") || cleanPkg.startsWith("com.xiaomi.")) {
        if (cleanPkg != "com.mi.globalbrowser" && cleanPkg != "com.android.browser") {
            return false
        }
    }
    if (cleanPkg.startsWith("com.sec.android.") || cleanPkg.startsWith("com.samsung.android.app.")) {
        if (!cleanPkg.contains("browser") && !cleanPkg.contains("notes")) {
            return false
        }
    }

    // ۳. فیلتر لانچر و کیبورد
    if (isLauncherApp(context, packageName)) return false
    if (isKeyboardApp(context, packageName)) return false

    // ۴. برنامه حتماً باید توسط کاربر قابل لمس و باز شدن باشد (دارای آیکون لانچر)
    try {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
        if (launchIntent == null) return false
    } catch (e: Exception) {
        return false
    }

    // ۵. بررسی عنوان برنامه (فیلتر عناوینی که شامل سیستم، لانچر، امنیت یا تنظیمات هستند)
    val label = getAppReadableName(context, packageName).lowercase(Locale.ROOT)
    for (kw in SYSTEM_LABEL_KEYWORDS) {
        if (label.contains(kw)) {
            return false
        }
    }

    return true
}

/**
 * محاسبه دقیق مدت زمان استفاده در یک بازه زمانی معین
 * با فیلتر دقیق برنامه‌های سیستمی و سقف ریاضی شبانه‌روز
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

    // روش اول: تحلیل دقیق رویدادهای پیش‌زمینه (UsageEvents)
    try {
        val events = usageStatsManager.queryEvents(windowStart, windowEnd)
        val event = UsageEvents.Event()
        val appLastResume = mutableMapOf<String, Long>()

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            val time = Math.max(windowStart, Math.min(event.timeStamp, windowEnd))

            // فیلتر کامل برنامه‌های سیستمی، لانچرها و فریم‌ورک شیائومی/اندروید
            if (!isRealUserApp(context, pkg)) continue

            when (event.eventType) {
                UsageEvents.Event.MOVE_TO_FOREGROUND,
                UsageEvents.Event.ACTIVITY_RESUMED -> {
                    // با باز شدن برنامه جدید، نشست برنامه قبلی پایان می‌یابد
                    for ((otherPkg, start) in appLastResume.toMap()) {
                        if (otherPkg != pkg && start != null && time > start) {
                            val rawSession = time - start
                            val sessionDuration = Math.min(rawSession, 2 * 60 * 60 * 1000L) // سقف ۲ ساعت برای نشست پیوسته
                            if (sessionDuration > 0) {
                                totalUsageMap[otherPkg] = (totalUsageMap[otherPkg] ?: 0L) + sessionDuration
                                val nightPortion = computeNightOverlap(start, start + sessionDuration)
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
                        val rawSession = time - start
                        val sessionDuration = Math.min(rawSession, 2 * 60 * 60 * 1000L)
                        if (sessionDuration > 0) {
                            totalUsageMap[pkg] = (totalUsageMap[pkg] ?: 0L) + sessionDuration
                            val nightPortion = computeNightOverlap(start, start + sessionDuration)
                            if (nightPortion > 0) {
                                nightUsageMap[pkg] = (nightUsageMap[pkg] ?: 0L) + nightPortion
                            }
                        }
                    }
                }
                16 /* SCREEN_NON_INTERACTIVE */,
                18 /* KEYGUARD_SHOWN */ -> {
                    // با خاموش یا قفل شدن صفحه گوشی، نشست فعال بسته می‌شود
                    for ((otherPkg, start) in appLastResume.toMap()) {
                        if (start != null && time > start) {
                            val rawSession = time - start
                            val sessionDuration = Math.min(rawSession, 2 * 60 * 60 * 1000L)
                            if (sessionDuration > 0) {
                                totalUsageMap[otherPkg] = (totalUsageMap[otherPkg] ?: 0L) + sessionDuration
                                val nightPortion = computeNightOverlap(start, start + sessionDuration)
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

        // برای برنامه‌ای که در انتهای بازه هنوز باز مانده بود
        for ((pkg, start) in appLastResume) {
            if (windowEnd > start) {
                val rawSession = windowEnd - start
                val sessionDuration = Math.min(rawSession, 30 * 60 * 1000L)
                totalUsageMap[pkg] = (totalUsageMap[pkg] ?: 0L) + sessionDuration
                val nightPortion = computeNightOverlap(start, start + sessionDuration)
                if (nightPortion > 0) {
                    nightUsageMap[pkg] = (nightUsageMap[pkg] ?: 0L) + nightPortion
                }
            }
        }
    } catch (e: Exception) {
        // نادیده گرفتن خطا
    }

    // روش دوم (پشتیبان): بازیابی تجمیعی صرفاً برای برنامه‌های کاربر واقعی در صورت خالی بودن رویدادها
    if (totalUsageMap.isEmpty()) {
        try {
            val aggregated = usageStatsManager.queryAndAggregateUsageStats(windowStart, windowEnd)
            if (aggregated != null) {
                for ((pkg, stats) in aggregated) {
                    if (!isRealUserApp(context, pkg)) continue
                    val time = stats.totalTimeInForeground
                    if (time > 0) {
                        totalUsageMap[pkg] = Math.min(time, windowDuration)
                    }
                }
            }
        } catch (e: Exception) {
            // نادیده گرفتن
        }
    }

    // سقف قطعی ریاضی: هیچ برنامه‌ای نمی‌تواند بیش از مدت بازه باشد
    val maxAllowedMillis = Math.min(windowDuration, 24 * 60 * 60 * 1000L)
    for ((pkg, time) in totalUsageMap) {
        if (time > maxAllowedMillis) {
            totalUsageMap[pkg] = maxAllowedMillis
        }
    }

    // نرمال‌سازی مجموع کل برنامه‌ها اگر از ۲۴ ساعت فراتر رفته باشد
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
        // حداقل ۶۰ ثانیه (۱ دقیقه) استفاده در طول ۲۴ ساعت تا بیدارباش‌های ناچیز پس‌زمینه فیلتر شوند
        if (scaledTotal >= 60_000L) {
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

    // بررسی ساعت ۲۲:۳۰ همان روز
    cal.set(Calendar.HOUR_OF_DAY, 22)
    cal.set(Calendar.MINUTE, 30)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    val nightStartToday = cal.timeInMillis

    cal.add(Calendar.DAY_OF_YEAR, 1)
    cal.set(Calendar.HOUR_OF_DAY, 5)
    cal.set(Calendar.MINUTE, 0)
    val morningEndNextDay = cal.timeInMillis

    val s1 = Math.max(start, nightStartToday)
    val e1 = Math.min(end, morningEndNextDay)
    if (e1 > s1) {
        overlap += (e1 - s1)
    }

    // بررسی بازه بامداد (۰۰:۰۰ تا ۰۵:۰۰)
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
 * استخراج آمار ۲۴ ساعت روز قبل (از ساعت ۰۰:۰۰ بامداد روز قبل تا ۰۰:۰۰ بامداد روز جاری)
 * برای مثال: اگر در روز ۲۶م دکمه استخراج زده شود، بازه از ۰۰:۰۰ بامداد ۲۵م تا ۰۰:۰۰ بامداد ۲۶م محاسبه می‌شود
 */
fun getAppUsageStatsForDate(context: Context, dateStr: String? = null): DayUsageReport {
    val cal = Calendar.getInstance()
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    if (!dateStr.isNullOrBlank()) {
        try {
            val parsed = sdf.parse(dateStr.trim())
            if (parsed != null) {
                cal.time = parsed
            } else {
                cal.add(Calendar.DAY_OF_YEAR, -1)
            }
        } catch (e: Exception) {
            cal.add(Calendar.DAY_OF_YEAR, -1)
        }
    } else {
        // به صورت پیش‌فرض: روز قبل
        cal.add(Calendar.DAY_OF_YEAR, -1)
    }

    // شروع بازه: ساعت 00:00:00 روز قبل (مثلاً ۲۵م)
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    val windowStart = cal.timeInMillis
    val targetDateStr = sdf.format(Date(windowStart))

    // پایان بازه: ساعت 00:00:00 روز جاری (مثلاً ۲۶م / صفر بامداد روز فعلی)
    cal.add(Calendar.DAY_OF_YEAR, 1)
    val windowEnd = cal.timeInMillis

    val dayApps = calculateAccurateUsageForWindow(context, windowStart, windowEnd)
    val totalMins = dayApps.sumOf { it.usageTimeMillis } / 60000L
    val nightMins = dayApps.sumOf { it.nightUsageMillis } / 60000L

    return DayUsageReport(
        date = targetDateStr,
        totalMinutes = totalMins,
        nightMinutes = nightMins,
        apps = dayApps
    )
}

/**
 * متد پیش‌فرض استخراج برای ۲۴ ساعت روز قبل
 */
fun getAppUsageStats(context: Context): List<AppUsageInfo> {
    return getAppUsageStatsForDate(context, null).apps
}

/**
 * استخراج چندروزه بر مبنای روزهای کامل تقویمی گذشته (شروع از روز قبل)
 * روز ۱ = روز قبل (از 00:00 دیروز تا 00:00 امروز)
 * روز ۲ = دو روز قبل (از 00:00 دو روز قبل تا 00:00 دیروز)
 */
fun getMultiDayAppUsageStats(context: Context, days: Int = 14): List<DayUsageReport> {
    val reports = mutableListOf<DayUsageReport>()
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val count = Math.max(1, Math.min(days, 14))

    for (i in 1..count) {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -i)

        // شروع: ساعت 00:00:00 آن روز
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val dayStart = cal.timeInMillis
        val dateStr = sdf.format(Date(dayStart))

        // پایان: ساعت 00:00:00 روز بعد (۲۴ ساعت کامل)
        cal.add(Calendar.DAY_OF_YEAR, 1)
        val dayEnd = cal.timeInMillis

        val dayApps = calculateAccurateUsageForWindow(context, dayStart, dayEnd)
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
