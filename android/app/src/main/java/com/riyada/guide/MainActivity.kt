package com.riyada.guide

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader

/**
 * نشاط وحيد يستضيف التطبيق (PWA) داخل WebView.
 *
 * تُقدَّم الأصول عبر WebViewAssetLoader على النطاق المحلي:
 *   https://appassets.androidplatform.net/assets/...
 * هذا ضروري لكي يعمل Service Worker والتخزين المحلي (localStorage) بأمان
 * ويعمل التطبيق بدون إنترنت بالكامل.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // محمّل الأصول المحلية (ملفات assets/) على نطاق HTTPS وهمي آمن
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/res/", WebViewAssetLoader.ResourcesPathHandler(this))
            .build()

        webView = WebView(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFF0F172A.toInt())
        }
        setContentView(webView)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = false
            allowContentAccess = false
            mediaPlaybackRequiresUserGesture = true
            // دعم Service Worker
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
        }

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = LocalContentWebViewClient(assetLoader)

        // تفعيل Service Workers عبر androidx.webkit
        androidx.webkit.ServiceWorkerControllerCompat.getInstance().apply {
            setServiceWorkerClient(object : androidx.webkit.ServiceWorkerClientCompat() {
                override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? {
                    return assetLoader.shouldInterceptRequest(request.url)
                }
            })
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(APP_URL)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private companion object {
        const val APP_URL =
            "https://appassets.androidplatform.net/assets/index.html"
    }
}

/**
 * عميل WebView يوجّه كل الطلبات إلى الأصول المحلية.
 */
private class LocalContentWebViewClient(
    private val assetLoader: WebViewAssetLoader
) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? {
        return assetLoader.shouldInterceptRequest(request.url)
    }

    @Deprecated("مطلوب للتوافق مع الإصدارات القديمة")
    override fun shouldInterceptRequest(
        view: WebView,
        url: String
    ): WebResourceResponse? {
        return assetLoader.shouldInterceptRequest(android.net.Uri.parse(url))
    }
}
