package com.tahzib.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_REQUEST_CODE = 1001

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

        // تنظیم DownloadListener برای هدایت دانلود فایل‌های APK و سایر فرمت‌ها به مدیریت دانلود اندروید
        webView.setDownloadListener { url, _, _, _, _ ->
            try {
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                startActivity(intent)
            } catch (e: Exception) {
                Log.e("MainActivity", "DownloadListener error: ${e.message}", e)
            }
        }

        // لاگ‌گیری خطاهای جاوااسکریپت و پشتیبانی نیتیو از انتخاب و آپلود فایل (FileChooser) در اندروید
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(
                    "TahzibAppWebView",
                    "[${consoleMessage.messageLevel()}] ${consoleMessage.message()} -- line ${consoleMessage.lineNumber()} (${consoleMessage.sourceId()})"
                )
                return true
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    Log.e("MainActivity", "Error launching file chooser: ${e.message}")
                    return false
                }
                return true
            }
        }

        // راه‌اندازی WebViewAssetLoader برای سرو امن فایل‌ها تحت پروتکل مجازی https://
        // این کار خطای CORS و مسدود شدن ماژول‌های ES (type="module") و مسیرهای مطلق /assets/ را کاملاً حل می‌کند
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", PublicAssetPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.endsWith(".apk") || url.contains("/download/tahzib.apk")) {
                    try {
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Error launching APK download intent: ${e.message}")
                    }
                }
                return super.shouldOverrideUrlLoading(view, request)
            }

            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url ?: return null
                val intercepted = assetLoader.shouldInterceptRequest(url)
                if (intercepted != null) {
                    return intercepted
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                val failingUrl = request?.url.toString()
                if (request?.isForMainFrame == true && failingUrl.startsWith("http")) {
                    Log.w("MainActivity", "Server unreachable: $failingUrl. Falling back to local appassets.")
                    view?.loadUrl(BuildConfig.FALLBACK_ASSET_URL)
                }
            }
        }

        // بارگذاری آدرس فعال سرور با اولویت تنظیمات سفارشی مسئول فنی
        reloadAppUrl()
    }

    /**
     * بارگذاری مجدد برنامه بر اساس آدرس سرور زنده یا سفارشی
     */
    fun reloadAppUrl() {
        val prefs = getSharedPreferences("tahzib_config", Context.MODE_PRIVATE)
        val customUrl = prefs.getString("custom_server_url", null)
        val targetUrl = if (!customUrl.isNullOrBlank()) {
            customUrl.trim()
        } else {
            BuildConfig.SERVER_URL
        }

        Log.i("MainActivity", "Loading Live URL in WebView: $targetUrl")
        webView.loadUrl(targetUrl)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    /**
     * دریافت نتیجه انتخاب فایل توسط کاربر و بازگرداندن URI آن به جاوااسکریپت WebView
     */
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return
            var results: Array<Uri>? = null
            if (resultCode == RESULT_OK && data != null) {
                val dataString = data.dataString
                val clipData = data.clipData
                if (clipData != null) {
                    results = Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                } else if (dataString != null) {
                    results = arrayOf(Uri.parse(dataString))
                }
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
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
                // اگر درخواست مربوط به API سرور باشد، به هیچ وجه index.html برنگردان
                if (cleanPath.startsWith("public/api/") || cleanPath.contains("/api/")) {
                    val jsonError = "{\"success\":false,\"connected\":false,\"message\":\"API endpoint is hosted on remote server, not local appassets.\"}"
                    return WebResourceResponse("application/json", "UTF-8", jsonError.byteInputStream())
                }

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

