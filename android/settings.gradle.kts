// SevnQuest Notifier: build Gradle.
//
// Modul:
//   :core  Kotlin/JVM murni (tanpa Android), berisi seluruh logika dan unit test.
//   :app   Aplikasi Android, memakai :core.
//
// Mode "core saja": bila Android SDK tidak tersedia (tidak ada ANDROID_HOME / ANDROID_SDK_ROOT dan
// tidak ada sdk.dir di local.properties), modul :app tidak disertakan dan plugin Android tidak
// diunduh, sehingga `./gradlew :core:test` tetap bisa dijalankan di mesin tanpa SDK.
// Paksa lewat properti: `-PcoreOnly=true` atau `-PcoreOnly=false`.

pluginManagement {
    repositories {
        mavenCentral()
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
    }
}

rootProject.name = "sevnquest-notifier"

fun hasAndroidSdk(): Boolean {
    if (!System.getenv("ANDROID_HOME").isNullOrBlank()) return true
    if (!System.getenv("ANDROID_SDK_ROOT").isNullOrBlank()) return true
    val localProperties = File(rootDir, "local.properties")
    return localProperties.isFile && localProperties.readLines().any { it.trim().startsWith("sdk.dir") }
}

val coreOnly: Boolean = providers.gradleProperty("coreOnly").orNull?.toBoolean() ?: !hasAndroidSdk()

include(":core")
if (coreOnly) {
    // Berkas build akar alternatif yang tidak menyebut plugin Android sama sekali.
    rootProject.buildFileName = "build.core.gradle.kts"
} else {
    include(":app")
}
