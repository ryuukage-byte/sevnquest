import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// Logika murni SevnQuest Notifier. Tidak boleh bergantung pada Android.
// Catatan: kode di sini berjalan di Android (minSdk 26), jadi hanya pakai API java.* yang
// tersedia di Android API 26 (hindari mis. InputStream.readAllBytes, List.removeFirst, java.net.http).
plugins {
    id("org.jetbrains.kotlin.jvm")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}

tasks.test {
    useJUnit()
    testLogging {
        events("failed", "skipped")
        showStandardStreams = false
    }
}
