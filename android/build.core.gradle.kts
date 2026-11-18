// Berkas build akar untuk mode "core saja" (tanpa Android SDK). Lihat settings.gradle.kts.
// Versi Kotlin harus sama dengan build.gradle.kts.
plugins {
    id("org.jetbrains.kotlin.jvm") version "2.4.10" apply false
}
