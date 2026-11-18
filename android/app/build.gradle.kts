// Aplikasi Android SevnQuest Notifier.
// AGP 9 memakai Kotlin bawaan (built-in Kotlin): plugin kotlin-android tidak diterapkan di sini.
plugins {
    id("com.android.application")
}

android {
    namespace = "com.sevnquest.notifier"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.sevnquest.notifier"
        minSdk = 26
        targetSdk = 37
        // Di GitHub Actions versionCode mengikuti nomor run supaya APK baru selalu dianggap pembaruan.
        versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1
        versionName = "1.0.0"
    }

    signingConfigs {
        // Keystore debug TETAP yang ikut di repo (android/keystore/debug.keystore), supaya APK dari
        // tiap build CI bertanda tangan sama dan bisa dipasang menimpa versi lama tanpa uninstall.
        // Ini kunci debug untuk sideload pribadi, BUKAN kunci rilis Play Store.
        getByName("debug") {
            storeFile = file("../keystore/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
            storeType = "pkcs12"
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    implementation(project(":core"))
}
