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
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import java.io.InputStream

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var backPressedTime: Long = 0
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)
            fileUploadCallback?.onReceiveValue(uris)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make Activity truly fullscreen & hide notification status bar
        try {
            hideSystemUI()
        } catch (e: Exception) {
            android.util.Log.e("DFC_MAP", "hideSystemUI error: ${e.message}")
        }

        // Check runtime permissions for live GPS tracking & Camera inspection
        try {
            val permissionsToRequest = mutableListOf<String>()
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(android.Manifest.permission.ACCESS_FINE_LOCATION)
                permissionsToRequest.add(android.Manifest.permission.ACCESS_COARSE_LOCATION)
            }
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(android.Manifest.permission.CAMERA)
            }
            if (permissionsToRequest.isNotEmpty()) {
                requestPermissions(permissionsToRequest.toTypedArray(), 1001)
            }
        } catch (e: Exception) {
            android.util.Log.e("DFC_MAP", "Permission error: ${e.message}")
        }

        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.parseColor("#070a13"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.setGeolocationEnabled(true)
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.allowFileAccessFromFileURLs = true
            settings.allowUniversalAccessFromFileURLs = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            settings.mediaPlaybackRequiresUserGesture = false

            setDownloadListener { url, _, _, _, _ ->
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Download handler error: " + e.message, Toast.LENGTH_SHORT).show()
                }
            }
            
            // Expose native Android methods to Web App
            addJavascriptInterface(WebAppInterface(this@MainActivity), "AndroidNative")

            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    callback?.invoke(origin, true, false)
                }

                override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                    android.util.Log.d("DFC_MAP_JS", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
                    return true
                }

                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    this@MainActivity.fileUploadCallback?.onReceiveValue(null)
                    this@MainActivity.fileUploadCallback = filePathCallback
                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "image/*"
                    }
                    try {
                        fileChooserLauncher.launch(intent)
                    } catch (e: Exception) {
                        this@MainActivity.fileUploadCallback = null
                        return false
                    }
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                    val url = request?.url?.toString()
                    if (url != null && (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("intent:") || url.startsWith("https://wa.me/"))) {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            startActivity(intent)
                            return true
                        } catch (e: Exception) {
                            Toast.makeText(this@MainActivity, "Cannot handle action: " + e.message, Toast.LENGTH_SHORT).show()
                            return true
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, request)
                }

                @Deprecated("Deprecated in Java")
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    if (url != null && (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("intent:") || url.startsWith("https://wa.me/"))) {
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

                override fun onReceivedError(view: WebView?, request: android.webkit.WebResourceRequest?, error: android.webkit.WebResourceError?) {
                    super.onReceivedError(view, request, error)
                    android.util.Log.e("DFC_MAP", "WebView Error: ${error?.description}")
                }
            }
        }

        setContentView(webView)
        webView.loadUrl("file:///android_asset/index.html")
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
        webView.evaluateJavascript(
            "(function() { " +
            "  try { " +
            "    if (window.onAndroidBackButton && typeof window.onAndroidBackButton === 'function') { " +
            "      return window.onAndroidBackButton() ? 'true' : 'false'; " +
            "    } " +
            "  } catch(e) {} " +
            "  return 'false'; " +
            "})()"
        ) { result ->
            if ("\"true\"" == result || "true" == result) {
                // Handled by web app (dismissed popup, diagram to map, or modal)
                return@evaluateJavascript
            }

            if (webView.canGoBack()) {
                webView.goBack()
                return@evaluateJavascript
            }

            if (backPressedTime + 2000 > System.currentTimeMillis()) {
                super.onBackPressed()
            } else {
                backPressedTime = System.currentTimeMillis()
                Toast.makeText(this, "Press back again to exit DFC MAP", Toast.LENGTH_SHORT).show()
            }
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

        @JavascriptInterface
        fun openPdfExternal(url: String) {
            try {
                if (url.isBlank()) return
                var fullUrl = url
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    fullUrl = if (url.startsWith("/")) "https://smun.web.app$url" else "https://smun.web.app/$url"
                }
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(fullUrl), "application/pdf")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
                }
                val chooser = Intent.createChooser(intent, "Open with PDF Reader (ReadEra / Drive)")
                chooser.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                activity.startActivity(chooser)
            } catch (e: Exception) {
                try {
                    val fallback = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    fallback.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    activity.startActivity(fallback)
                } catch (ex: Exception) {
                    Toast.makeText(activity, "Cannot open PDF reader: " + ex.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
