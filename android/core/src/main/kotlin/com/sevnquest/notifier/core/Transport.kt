package com.sevnquest.notifier.core

import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

data class HttpResult(val status: Int, val body: String)

interface Transport {
    /** Mengirim POST. Melempar [IOException] untuk galat jaringan. */
    @Throws(IOException::class)
    fun post(url: String, key: String, body: String): HttpResult
}

/** Transport berbasis HttpURLConnection (tersedia di JVM maupun Android, tanpa dependensi). */
class HttpUrlTransport(
    private val connectTimeoutMs: Int = 15_000,
    private val readTimeoutMs: Int = 20_000,
) : Transport {
    override fun post(url: String, key: String, body: String): HttpResult {
        val conn = try {
            URL(url).openConnection() as HttpURLConnection
        } catch (e: ClassCastException) {
            throw IOException("URL bukan HTTP")
        }
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = connectTimeoutMs
            conn.readTimeout = readTimeoutMs
            conn.instanceFollowRedirects = false
            conn.useCaches = false
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", Protocol.CONTENT_TYPE)
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty(Protocol.HEADER_KEY, key)
            conn.setRequestProperty("User-Agent", "SevnQuestNotifier/1")
            val bytes = body.toByteArray(Charsets.UTF_8)
            conn.setFixedLengthStreamingMode(bytes.size)
            conn.outputStream.use { it.write(bytes) }

            val status = conn.responseCode
            val stream: InputStream? = if (status >= 400) conn.errorStream else conn.inputStream
            val text = stream?.use { readLimited(it) } ?: ""
            return HttpResult(status, text)
        } catch (e: IOException) {
            throw e
        } catch (e: RuntimeException) {
            // Mis. IllegalArgumentException untuk nilai header yang tidak sah, atau SecurityException.
            throw IOException(e.javaClass.simpleName)
        } finally {
            conn.disconnect()
        }
    }

    private fun readLimited(input: InputStream): String {
        val out = ByteArrayOutputStream()
        val buf = ByteArray(4096)
        while (out.size() < MAX_RESPONSE_BYTES) {
            val n = input.read(buf)
            if (n < 0) break
            out.write(buf, 0, n)
        }
        return String(out.toByteArray(), Charsets.UTF_8)
    }

    companion object {
        const val MAX_RESPONSE_BYTES = 64 * 1024
    }
}
