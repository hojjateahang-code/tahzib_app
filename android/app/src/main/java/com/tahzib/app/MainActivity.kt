package com.tahzib.app

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

        // اضافه کردن پل ارتباطی JavascriptInterface برای اتصال وب به نیتیو اندروید
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        webView.webViewClient = WebViewClient()

        // دریافت آدرس سرور یا استفاده از فایل محلی آفلاین جهت عدم وابستگی به گوگل/سرور پیش‌فرض
        var appUrl = BuildConfig.SERVER_URL
        if (appUrl.isNullOrEmpty() || appUrl.contains("run.app") || appUrl.contains("google")) {
            appUrl = "file:///android_asset/public/index.html"
        }
        
        webView.loadUrl(appUrl)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
