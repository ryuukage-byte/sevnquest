package com.sevnquest.notifier

import android.content.Context
import android.content.SharedPreferences
import com.sevnquest.notifier.core.DispatchState
import com.sevnquest.notifier.core.Packages
import com.sevnquest.notifier.core.ServerConfig

/**
 * Pengaturan aplikasi di SharedPreferences privat (MODE_PRIVATE). Kunci webhook hanya disimpan di
 * sini: tidak pernah ditulis ke logcat, antrean, atau log kejadian, dan tidak ikut cadangan
 * (allowBackup=false + data_extraction_rules).
 */
class Prefs(context: Context) : DispatchState {
    private val sp: SharedPreferences =
        context.applicationContext.getSharedPreferences("settings", Context.MODE_PRIVATE)

    @Volatile
    private var cachedPackages: List<String>? = null

    override fun config(): ServerConfig? {
        val endpoint = sp.getString(KEY_ENDPOINT, null)
        val key = sp.getString(KEY_SECRET, null)
        return if (endpoint.isNullOrEmpty() || key.isNullOrEmpty()) null else ServerConfig(endpoint, key)
    }

    fun saveConfig(config: ServerConfig) {
        sp.edit()
            .putString(KEY_ENDPOINT, config.endpoint)
            .putString(KEY_SECRET, config.key)
            .remove(KEY_LAST_TEST)
            .remove(KEY_LAST_TEST_AT)
            .apply()
    }

    override var authBlocked: Boolean
        get() = sp.getBoolean(KEY_AUTH_BLOCKED, false)
        set(value) {
            sp.edit().putBoolean(KEY_AUTH_BLOCKED, value).apply()
        }

    var enabled: Boolean
        get() = sp.getBoolean(KEY_ENABLED, true)
        set(value) {
            sp.edit().putBoolean(KEY_ENABLED, value).apply()
        }

    /**
     * Saat penerusan terakhir kali diaktifkan/dihubungkan (epoch ms). Notifikasi yang diposting
     * sebelum waktu ini tidak ikut "dikejar" ketika layanan tersambung.
     */
    var activeSince: Long
        get() = sp.getLong(KEY_ACTIVE_SINCE, 0L)
        set(value) {
            sp.edit().putLong(KEY_ACTIVE_SINCE, value).apply()
        }

    var packages: List<String>
        get() {
            cachedPackages?.let { return it }
            val loaded = Packages.fromStored(sp.getString(KEY_PACKAGES, null))
            cachedPackages = loaded
            return loaded
        }
        set(value) {
            cachedPackages = ArrayList(value)
            sp.edit().putString(KEY_PACKAGES, Packages.serialize(value)).apply()
        }

    val lastTest: String?
        get() = sp.getString(KEY_LAST_TEST, null)

    val lastTestAt: Long
        get() = sp.getLong(KEY_LAST_TEST_AT, 0L)

    fun saveLastTest(message: String, at: Long) {
        sp.edit().putString(KEY_LAST_TEST, message).putLong(KEY_LAST_TEST_AT, at).apply()
    }

    private companion object {
        const val KEY_ENDPOINT = "endpoint"
        const val KEY_SECRET = "webhook_key"
        const val KEY_AUTH_BLOCKED = "auth_blocked"
        const val KEY_ENABLED = "enabled"
        const val KEY_ACTIVE_SINCE = "active_since"
        const val KEY_PACKAGES = "packages"
        const val KEY_LAST_TEST = "last_test"
        const val KEY_LAST_TEST_AT = "last_test_at"
    }
}
