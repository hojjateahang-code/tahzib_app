import React, { useState } from 'react';
import { X, Copy, Check, Code, Smartphone, ShieldCheck, Download, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AndroidStudioExportModal({ isOpen, onClose }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.tahzib.app">

    <!-- دسترسی اینترنت -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- دسترسی استخراج آمار استفاده از گوشی (Digital Wellbeing) -->
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" 
        tools:ignore="ProtectedPermissions" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="سامانه تهذیب"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.TahzibApp">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`;

  const webAppInterfaceKotlin = `package com.tahzib.app

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

class WebAppInterface(private val mContext: Context) {

    /**
     * ۱. بررسی داشتن مجوز PACKAGE_USAGE_STATS
     */
    @JavascriptInterface
    fun hasUsageStatsPermission(): Boolean {
        val appOps = mContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            mContext.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /**
     * ۲. هدایت کاربر به صفحه تنظیمات جهت اعطای دسترسی
     */
    @JavascriptInterface
    fun requestUsageStatsPermission() {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        mContext.startActivity(intent)
    }

    /**
     * ۳. دریافت آمار استفاده از برنامه‌ها و خروجی JSON برای برنامک
     */
    @JavascriptInterface
    fun getAppUsageStats(): String {
        val usageStatsManager = mContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        
        val calendar = Calendar.getInstance()
        val endTime = calendar.timeInMillis
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        val startTime = calendar.timeInMillis

        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        )

        val jsonArray = JSONArray()
        if (stats != null) {
            val sortedList = stats.filter { it.totalTimeInForeground > 0 }
                .sortedByDescending { it.totalTimeInForeground }

            for (stat in sortedList) {
                val obj = JSONObject()
                obj.put("packageName", stat.packageName)
                obj.put("usageTimeMillis", stat.totalTimeInForeground)
                jsonArray.put(obj)
            }
        }
        return jsonArray.toString()
    }
}`;

  const mainActivityKotlin = `package com.tahzib.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        webSettings.databaseEnabled = true

        // اضافه کردن رابط کاتلین برای اتصال برنامک با نیتیو اندروید
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        webView.webViewClient = WebViewClient()

        // آدرس وب‌اپلیکیشن یا فایل index.html محلی
        val appUrl = "https://ais-dev-ef5fjznqypc7c7a4bgzzpu-584824184963.us-west2.run.app"
        webView.loadUrl(appUrl)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}`;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/30">
              <Smartphone className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">راهنمای خروجی اندروید استادیو و برنامک ایتا</h3>
              <p className="text-xs text-emerald-200/90 font-medium">کدها و اسکریپت‌های نیتیو کاتلین جهت اتصال Digital Wellbeing به سامانه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-200">
          
          {/* Explanation Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200 text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>پشتیبانی دوگانه: خروجی اپلیکیشن اندروید (APK) + برنامک ایتا (MiniApp)</span>
            </div>
            <p className="leading-relaxed">
              این برنامک به‌گونه‌ای طراحی شده که هم به صورت وب‌اپلیکیشن در <strong className="text-emerald-700 dark:text-emerald-300">پیام‌رسان ایتا</strong> اجرا می‌شود و هم با کپی کردن این پروژه‌ی آماده در <strong className="text-emerald-700 dark:text-emerald-300">اندروید استادیو</strong> می‌توانید آن را به یک فایل <strong className="text-emerald-700 dark:text-emerald-300">APK نیتیو</strong> تبدیل کنید.
              در حالت APK نیتیو، دکمه <strong className="text-emerald-700 dark:text-emerald-300">«دریافت هوشمند آمار از اندروید»</strong> آمار واقعی گوشی را از <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">UsageStatsManager</code> استخراج می‌کند و در حالت ایتا/وب نیز امکان ثبت دستی و ارسال اسکرین‌شات فراهم است.
            </p>
          </div>

          {/* Section 1: AndroidManifest.xml */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
                <Code className="w-4 h-4 text-emerald-600" />
                <span>۱. فایل AndroidManifest.xml</span>
              </span>
              <button
                onClick={() => copyToClipboard(manifestXml, 'manifest')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {copiedKey === 'manifest' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'manifest' ? 'کپی شد!' : 'کپی کد XML'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto text-left dir-ltr">
              {manifestXml}
            </pre>
          </div>

          {/* Section 2: WebAppInterface.kt */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
                <Code className="w-4 h-4 text-indigo-600" />
                <span>۲. کلاس پل ارتباطی WebAppInterface.kt (Kotlin)</span>
              </span>
              <button
                onClick={() => copyToClipboard(webAppInterfaceKotlin, 'interface')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {copiedKey === 'interface' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'interface' ? 'کپی شد!' : 'کپی کلاس کاتلین'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-indigo-200 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto text-left dir-ltr">
              {webAppInterfaceKotlin}
            </pre>
          </div>

          {/* Section 3: MainActivity.kt */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-sm">
                <Code className="w-4 h-4 text-teal-600" />
                <span>۳. اکتیویتی اصلی MainActivity.kt</span>
              </span>
              <button
                onClick={() => copyToClipboard(mainActivityKotlin, 'activity')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {copiedKey === 'activity' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'activity' ? 'کپی شد!' : 'کپی اکتیویتی'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-teal-200 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto text-left dir-ltr">
              {mainActivityKotlin}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md"
          >
            بستن راهنما
          </button>
        </div>

      </div>
    </div>
  );
}
