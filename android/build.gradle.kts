// Berkas build akar (mode penuh: :core + :app).
// Versi di sini harus sama dengan build.core.gradle.kts untuk plugin Kotlin.
//
// Kompatibilitas (developer.android.com/build/releases/about-agp):
//   AGP 9.5  -> Gradle minimal 9.6.0, JDK 17, API level maksimal 37.
//   AGP 9.x memakai Kotlin bawaan (built-in Kotlin), jadi plugin kotlin-android TIDAK dipakai.
//   Plugin Kotlin JVM dideklarasikan di sini supaya :core dan Kotlin bawaan AGP memakai
//   satu versi Kotlin Gradle Plugin yang sama.
plugins {
    id("com.android.application") version "9.5.1" apply false
    id("org.jetbrains.kotlin.jvm") version "2.4.10" apply false
}
