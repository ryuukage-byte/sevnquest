package com.sevnquest.notifier.core

import java.net.URI
import java.net.URISyntaxException
import java.net.URLDecoder

/** Konfigurasi koneksi ke server. */
data class ServerConfig(val endpoint: String, val key: String)

enum class SetupError {
    NOT_A_SETUP_LINK,
    MISSING_URL,
    MISSING_KEY,
    URL_NOT_HTTPS,
    URL_INVALID,
    KEY_INVALID,
}

sealed class SetupResult {
    data class Valid(val config: ServerConfig, val host: String) : SetupResult()
    data class Invalid(val error: SetupError) : SetupResult()
}

/**
 * Deep link pemasangan: `sevnquest-notifier://setup?url=<endpoint url-encoded>&key=<kunci url-encoded>`.
 * Hanya menerima endpoint `https://`.
 */
object SetupLink {
    const val SCHEME = "sevnquest-notifier"
    const val HOST = "setup"
    const val MAX_URL_LENGTH = 2000
    const val MAX_KEY_LENGTH = 512

    fun parse(link: String?): SetupResult {
        if (link == null) return SetupResult.Invalid(SetupError.NOT_A_SETUP_LINK)
        val trimmed = link.trim()
        val prefix = "$SCHEME://$HOST"
        if (!trimmed.regionMatches(0, prefix, 0, prefix.length, ignoreCase = true)) {
            return SetupResult.Invalid(SetupError.NOT_A_SETUP_LINK)
        }
        var rest = trimmed.substring(prefix.length)
        val fragment = rest.indexOf('#')
        if (fragment >= 0) rest = rest.substring(0, fragment)
        val queryStart = rest.indexOf('?')
        val path = if (queryStart >= 0) rest.substring(0, queryStart) else rest
        // Setelah host hanya boleh kosong atau "/"; "setupx" atau "setup.evil" bukan link pemasangan.
        if (path.isNotEmpty() && path != "/") return SetupResult.Invalid(SetupError.NOT_A_SETUP_LINK)
        val query = if (queryStart >= 0) rest.substring(queryStart + 1) else ""

        val params = parseQuery(query)
        val url = params["url"]?.trim()
        val key = params["key"]?.trim()
        if (url.isNullOrEmpty()) return SetupResult.Invalid(SetupError.MISSING_URL)
        if (key.isNullOrEmpty()) return SetupResult.Invalid(SetupError.MISSING_KEY)
        return validate(url, key)
    }

    /** Validasi yang sama dipakai untuk masukan manual. */
    fun validate(endpoint: String?, key: String?): SetupResult {
        val url = endpoint?.trim().orEmpty()
        val k = key?.trim().orEmpty()
        if (url.isEmpty()) return SetupResult.Invalid(SetupError.MISSING_URL)
        if (k.isEmpty()) return SetupResult.Invalid(SetupError.MISSING_KEY)
        val host = when (val r = validateEndpoint(url)) {
            is EndpointCheck.Ok -> r.host
            is EndpointCheck.Bad -> return SetupResult.Invalid(r.error)
        }
        if (!isValidKey(k)) return SetupResult.Invalid(SetupError.KEY_INVALID)
        return SetupResult.Valid(ServerConfig(url, k), host)
    }

    sealed class EndpointCheck {
        data class Ok(val host: String) : EndpointCheck()
        data class Bad(val error: SetupError) : EndpointCheck()
    }

    fun validateEndpoint(url: String): EndpointCheck {
        if (url.length > MAX_URL_LENGTH) return EndpointCheck.Bad(SetupError.URL_INVALID)
        if (url.any { it.isWhitespace() || it < ' ' || it == '\\' }) return EndpointCheck.Bad(SetupError.URL_INVALID)
        val uri = try {
            URI(url)
        } catch (e: URISyntaxException) {
            // Bedakan "bukan https" dari "rusak" supaya pesan galatnya tepat.
            return EndpointCheck.Bad(
                if (url.startsWith("https://", ignoreCase = true)) SetupError.URL_INVALID
                else if (url.contains("://")) SetupError.URL_NOT_HTTPS
                else SetupError.URL_INVALID
            )
        }
        val scheme = uri.scheme ?: return EndpointCheck.Bad(SetupError.URL_INVALID)
        if (!scheme.equals("https", ignoreCase = true)) return EndpointCheck.Bad(SetupError.URL_NOT_HTTPS)
        val host = uri.host
        if (host.isNullOrEmpty()) return EndpointCheck.Bad(SetupError.URL_INVALID)
        // Tolak "https://nama:sandi@host" (sering dipakai untuk mengelabui tampilan host).
        if (uri.rawUserInfo != null) return EndpointCheck.Bad(SetupError.URL_INVALID)
        if (uri.rawFragment != null) return EndpointCheck.Bad(SetupError.URL_INVALID)
        return EndpointCheck.Ok(host.lowercase())
    }

    /** Kunci harus bisa dikirim sebagai nilai header HTTP: ASCII tercetak tanpa spasi. */
    fun isValidKey(key: String): Boolean =
        key.isNotEmpty() && key.length <= MAX_KEY_LENGTH && key.all { it in '!'..'~' }

    internal fun parseQuery(query: String): Map<String, String> {
        val out = LinkedHashMap<String, String>()
        for (pair in query.split('&')) {
            if (pair.isEmpty()) continue
            val eq = pair.indexOf('=')
            val rawName = if (eq >= 0) pair.substring(0, eq) else pair
            val rawValue = if (eq >= 0) pair.substring(eq + 1) else ""
            val name = decode(rawName) ?: continue
            val value = decode(rawValue) ?: continue
            // Parameter pertama yang menang; duplikat diabaikan.
            if (!out.containsKey(name)) out[name] = value
        }
        return out
    }

    private fun decode(s: String): String? = try {
        // "+" dibiarkan apa adanya: pengirim memakai encodeURIComponent (spasi = %20, plus = %2B).
        URLDecoder.decode(s.replace("+", "%2B"), "UTF-8")
    } catch (e: IllegalArgumentException) {
        null
    }
}

object Secrets {
    /** Menyamarkan kunci untuk tampilan: hanya 4 karakter terakhir yang terlihat. */
    fun mask(key: String?): String {
        if (key.isNullOrEmpty()) return ""
        val dots = "\u2022".repeat(8)
        return if (key.length >= 12) dots + key.takeLast(4) else dots
    }
}
