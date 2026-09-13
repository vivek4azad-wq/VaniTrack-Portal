plugins {
  alias(libs.plugins.android.application)
}

android {
    namespace = "com.example.vanitracklinear"
    compileSdk = 36

    defaultConfig {
        applicationId = "in.co.dfcc.map"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        create("release") {
            storeFile = file("/Users/vivekazad/Desktop/Vani/dfcc-release.keystore")
            storePassword = "dfcc12345"
            keyAlias = "dfcc-release"
            keyPassword = "dfcc12345"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.activity.compose)
}
