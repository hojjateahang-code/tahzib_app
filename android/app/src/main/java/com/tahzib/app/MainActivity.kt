package com.tahzib.app

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setContentView(webView)

        // فعال‌سازی Remote Debugging جهت عیب‌یابی مستقیم از طریق مرورگر کامپیوتر در chrome://inspect
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        webSettings.databaseEnabled = true
        webSettings.setSupportZoom(false)

        try {
            webSettings.allowFileAccessFromFileURLs = true
            webSettings.allowUniversalAccessFromFileURLs = true
        } catch (e: Exception) {
            Log.w("MainActivity", "Could not set universal file access", e)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // اضافه کردن پل ارتباطی JavascriptInterface برای اتصال وب به نیتیو اندروید
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        // لاگ‌گیری خطاهای جاوااسکریپت در پنجره Logcat اندروید استودیو با تگ TahzibAppWebView
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(
                    "TahzibAppWebView",
                    "[${consoleMessage.messageLevel()}] ${consoleMessage.message()} -- line ${consoleMessage.lineNumber()} (${consoleMessage.sourceId()})"
                )
                return true
            }
        }

        // راه‌اندازی WebViewAssetLoader برای سرو امن فایل‌ها تحت پروتکل مجازی https://
        // این کار خطای CORS و مسدود شدن ماژول‌های ES (type="module") و مسیرهای مطلق /assets/ را کاملاً حل می‌کند
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", PublicAssetPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val intercepted = assetLoader.shouldInterceptRequest(request.url)
                if (intercepted != null) {
                    return intercepted
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                super.onReceivedError(view, request, error)
                Log.e("TahzibAppWebView", "Error loading ${request.url}: ${error.description} (code: ${error.errorCode})")
            }
        }

        // دریافت آدرس سرور یا استفاده از لودر امن محلی جهت کارکرد کامل آفلاین
        var appUrl = BuildConfig.SERVER_URL
        if (appUrl.isNullOrEmpty() || 
            appUrl.contains("run.app") || 
            appUrl.contains("google") || 
            appUrl.startsWith("file://")
        ) {
            appUrl = "https://appassets.androidplatform.net/index.html"
        }
        
        Log.i("MainActivity", "Loading URL in WebView: $appUrl")
        webView.loadUrl(appUrl)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    /**
     * هندلر لود دارایی‌های برنامه از پوشه assets/public داخل APK
     */
    private class PublicAssetPathHandler(private val context: Context) : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            val cleanPath = when {
                path.isEmpty() || path == "/" || path == "index.html" -> "public/index.html"
                path.startsWith("public/") -> path
                else -> "public/" + path.trimStart('/')
            }

            return try {
                val mimeType = when {
                    cleanPath.endsWith(".html") -> "text/html"
                    cleanPath.endsWith(".js") -> "application/javascript"
                    cleanPath.endsWith(".css") -> "text/css"
                    cleanPath.endsWith(".json") -> "application/json"
                    cleanPath.endsWith(".png") -> "image/png"
                    cleanPath.endsWith(".jpg") || cleanPath.endsWith(".jpeg") -> "image/jpeg"
                    cleanPath.endsWith(".svg") -> "image/svg+xml"
                    cleanPath.endsWith(".ico") -> "image/x-icon"
                    cleanPath.endsWith(".woff2") -> "font/woff2"
                    cleanPath.endsWith(".woff") -> "font/woff"
                    cleanPath.endsWith(".ttf") -> "font/ttf"
                    cleanPath.endsWith(".txt") -> "text/plain"
                    else -> null
                }
                val inputStream = context.assets.open(cleanPath)
                WebResourceResponse(mimeType, "UTF-8", inputStream)
            } catch (e: Exception) {
                if (!cleanPath.contains('.')) {
                    try {
                        val inputStream = context.assets.open("public/index.html")
                        return WebResourceResponse("text/html", "UTF-8", inputStream)
                    } catch (fallbackEx: Exception) {
                        Log.e("PublicAssetPathHandler", "Fallback index.html failed", fallbackEx)
                    }
                }
                Log.w("PublicAssetPathHandler", "Asset not found: $cleanPath")
                null
            }
        }
    }
}

