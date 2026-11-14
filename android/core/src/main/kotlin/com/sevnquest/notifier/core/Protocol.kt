package com.sevnquest.notifier.core

/**
 * Kontrak dengan server SevnQuest (POST /api/payment-notify).
 *
 * Request : header `Content-Type: application/json` dan `X-Webhook-Key: <kunci>`,
 *           body `{"title","text","package","posted_at"}`.
 * Respons : 200 `{"amount": int|null, "result": "approved"|"unmatched"|"ambiguous"|"no_amount", "order_code"?}`
 *           401 `{"error":"missing_key"|"invalid_key"}` -> kunci salah, jangan dicoba lagi.
 *           429 / 5xx / galat jaringan -> coba lagi nanti.
 */
object Protocol {
    const val HEADER_KEY = "X-Webhook-Key"
    const val CONTENT_TYPE = "application/json"
    const val TEST_TEXT = "Tes koneksi SevnQuest Notifier"
    const val TEST_TITLE = "SevnQuest Notifier"

    val KNOWN_RESULTS = setOf(LogResult.APPROVED, LogResult.UNMATCHED, LogResult.AMBIGUOUS, LogResult.NO_AMOUNT)

    fun buildBody(title: String, text: String, packageName: String, postedAt: Long): String = Json.obj(
        listOf(
            "title" to title.take(Limits.MAX_TITLE_CHARS),
            "text" to text.take(Limits.MAX_TEXT_CHARS),
            "package" to packageName,
            "posted_at" to postedAt,
        )
    )

    fun buildBody(item: QueueItem): String = buildBody(item.title, item.text, item.packageName, item.postedAt)

    /** Menerjemahkan status HTTP + body menjadi tindakan. */
    fun interpret(status: Int, body: String?): SendOutcome {
        val obj = Json.parseObjectOrNull(body?.trim())
        if (status in 200..299) {
            val result = obj?.stringOrNull("result")
            if (obj == null || result == null || result !in KNOWN_RESULTS) {
                // 2xx tanpa "result" yang dikenal hampir pasti berarti URL salah (mis. halaman HTML).
                // Jangan anggap terkirim, supaya notifikasi pembayaran tidak hilang diam-diam.
                return SendOutcome.Retry(RetryReason.BAD_RESPONSE, status)
            }
            val amount = obj.longOrNull("amount")?.takeIf { it > 0 && it <= Int.MAX_VALUE }?.toInt()
            return SendOutcome.Delivered(result, amount, obj.stringOrNull("order_code"))
        }
        return when {
            status == 401 -> SendOutcome.AuthFailed(obj?.stringOrNull("error") ?: "invalid_key")
            status == 429 -> SendOutcome.Retry(RetryReason.RATE_LIMITED, status)
            status >= 500 -> SendOutcome.Retry(RetryReason.SERVER_ERROR, status)
            // Permintaan itu sendiri ditolak; mengulang tidak akan mengubah hasilnya.
            status == 400 || status == 413 || status == 415 || status == 422 -> SendOutcome.Rejected(status)
            // 3xx, 403, 404, 405, 408, dst.: kemungkinan salah URL / gangguan sementara di depan server.
            else -> SendOutcome.Retry(RetryReason.UNEXPECTED_STATUS, status)
        }
    }
}

enum class RetryReason { NETWORK, RATE_LIMITED, SERVER_ERROR, BAD_RESPONSE, UNEXPECTED_STATUS }

sealed class SendOutcome {
    /** Server menerima dan memproses notifikasi. */
    data class Delivered(val result: String, val amount: Int?, val orderCode: String?) : SendOutcome()

    /** 401: kunci salah atau kosong. Jangan dicoba lagi sampai pengguna memperbaiki kunci. */
    data class AuthFailed(val error: String) : SendOutcome()

    /** Gagal sementara; coba lagi dengan backoff. [status] 0 untuk galat jaringan. */
    data class Retry(val reason: RetryReason, val status: Int = 0) : SendOutcome()

    /** Ditolak permanen; item dibuang. */
    data class Rejected(val status: Int) : SendOutcome()
}

/** Kebijakan backoff eksponensial: 15 dtk, 30 dtk, 1 mnt, ... paling lama 30 menit. */
object RetryPolicy {
    const val BASE_DELAY_MS = 15_000L
    const val MAX_DELAY_MS = 30L * 60 * 1000

    /** Jeda sebelum percobaan berikutnya, setelah [failedAttempts] kali gagal (>= 1). */
    fun delayMs(failedAttempts: Int): Long {
        if (failedAttempts <= 1) return BASE_DELAY_MS
        val shift = failedAttempts - 1
        if (shift >= 20) return MAX_DELAY_MS
        return Math.min(MAX_DELAY_MS, BASE_DELAY_MS shl shift)
    }
}
