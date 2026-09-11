package com.example.vanitracklinear

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import java.io.InputStream

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make Activity truly fullscreen & hide notification status bar
        hideSystemUI()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.cacheMode = WebSettings.LOAD_NO_CACHE
            
            // Expose native Android methods to Web App
            addJavascriptInterface(WebAppInterface(this@MainActivity), "AndroidNative")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    if (url != null && (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("intent:"))) {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            startActivity(intent)
                            return true
                        } catch (e: Exception) {
                            Toast.makeText(this@MainActivity, "Cannot handle action: " + e.message, Toast.LENGTH_SHORT).show()
                            return true
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, url)
                }

                override fun shouldInterceptRequest(view: WebView?, url: String?): WebResourceResponse? {
                    if (url != null && url.endsWith("track_data.json")) {
                        try {
                            val stream: InputStream = assets.open("track_data.json")
                            return WebResourceResponse("application/json", "UTF-8", stream)
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                    return super.shouldInterceptRequest(view, url)
                }
            }
        }

        setContentView(webView)
        webView.loadUrl("file:///android_asset/linear_diagram.html")
    }

    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
            @Suppress("DEPRECATION")
            window.setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            )
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    class WebAppInterface(private val activity: MainActivity) {
        @JavascriptInterface
        fun dialPhoneNumber(phoneNumber: String) {
            try {
                val cleanNum = phoneNumber.replace(Regex("[^0-9+]"), "")
                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$cleanNum"))
                activity.startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(activity, "Error dialing phone: " + e.message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun openDrawingUrl(url: String) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                activity.startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(activity, "Error opening drawing: " + e.message, Toast.LENGTH_SHORT).show()
            }
        }
    }
}
