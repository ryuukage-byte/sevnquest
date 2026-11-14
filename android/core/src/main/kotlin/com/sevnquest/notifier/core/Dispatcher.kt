package com.sevnquest.notifier.core

import java.io.IOException

/** Status yang harus bertahan di luar proses (di aplikasi: SharedPreferences). */
interface DispatchState {
    /** Konfigurasi saat ini, atau null bila belum dihubungkan. */
    fun config(): ServerConfig?

    /** true bila server menolak kunci (401). Pengiriman dihentikan sampai kunci diperbarui. */
    var authBlocked: Boolean
}

data class DrainResult(
    val delivered: Int,
    val remaining: Int,
    /** Waktu percobaan berikutnya (epoch ms) bila masih ada yang tertunda dan boleh dicoba; null bila tidak perlu dijadwalkan. */
    val nextAttemptAt: Long?,
    val authBlocked: Boolean,
)

/**
 * Inti alur kerja: menerima notifikasi (filter + dedup + masuk antrean) dan menguras antrean ke server.
 * Tidak bergantung pada Android, supaya bisa diuji di JVM.
 */
class Dispatcher(
    private val outbox: Outbox,
    private val log: EventLog,
    private val deduper: Deduper,
    private val transport: Transport,
    private val state: DispatchState,
    private val clock: () -> Long = { System.currentTimeMillis() },
    private val idGenerator: () -> String = { java.util.UUID.randomUUID().toString() },
) {
    enum class Accept { QUEUED, DUPLICATE, FILTERED, NOT_CONFIGURED, TOO_OLD }

    /**
     * Memproses satu notifikasi. Hanya notifikasi dari paket yang dipantau, bukan group summary /
     * ongoing, dan mengandung nominal rupiah yang masuk antrean.
     */
    fun accept(n: CapturedNotification, monitored: Collection<String>, enabled: Boolean): Accept {
        if (NotificationFilter.decide(n, monitored, enabled) != FilterDecision.FORWARD) return Accept.FILTERED
        if (state.config() == null) return Accept.NOT_CONFIGURED
        val now = clock()
        if (now - n.postedAt > Limits.MAX_AGE_MS) return Accept.TOO_OLD
        if (deduper.isDuplicate(n, now)) return Accept.DUPLICATE
        val item = QueueItem(
            id = idGenerator(),
            title = n.title.take(Limits.MAX_TITLE_CHARS),
            text = n.text.take(Limits.MAX_TEXT_CHARS),
            packageName = n.packageName,
            postedAt = n.postedAt,
            enqueuedAt = now,
        )
        val dropped = outbox.add(item, now)
        if (dropped > 0) {
            log.add(LogEntry(now, n.packageName, null, LogResult.QUEUE_FULL, detail = dropped.toString()))
        }
        return Accept.QUEUED
    }

    /** Mengirim semua item yang sudah waktunya. Aman dipanggil dari beberapa thread (diserialkan). */
    @Synchronized
    fun drain(): DrainResult {
        var delivered = 0
        val start = clock()
        for (expired in outbox.pruneExpired(start)) {
            log.add(LogEntry(start, expired.packageName, amountOf(expired), LogResult.EXPIRED))
        }
        val config = state.config()
        if (config == null || state.authBlocked) {
            return DrainResult(0, outbox.size(), null, state.authBlocked)
        }

        for (item in outbox.due(start)) {
            val outcome = send(config, Protocol.buildBody(item))
            val now = clock()
            when (outcome) {
                is SendOutcome.Delivered -> {
                    outbox.remove(item.id)
                    delivered++
                    log.add(LogEntry(now, item.packageName, outcome.amount ?: amountOf(item), outcome.result, outcome.orderCode))
                }
                is SendOutcome.Rejected -> {
                    outbox.remove(item.id)
                    log.add(LogEntry(now, item.packageName, amountOf(item), LogResult.REJECTED, detail = outcome.status.toString()))
                }
                is SendOutcome.AuthFailed -> {
                    state.authBlocked = true
                    log.add(LogEntry(now, item.packageName, amountOf(item), LogResult.AUTH_FAILED, detail = outcome.error))
                    return DrainResult(delivered, outbox.size(), null, true)
                }
                is SendOutcome.Retry -> {
                    val delay = RetryPolicy.delayMs(item.attempts + 1)
                    outbox.markFailedAttempt(item.id, now + delay)
                    // Server/jaringan sedang bermasalah: tunda juga item lain, jangan dihujani.
                    outbox.deferAll(now + delay)
                    // Catat hanya kegagalan pertama tiap item supaya log tidak penuh.
                    if (item.attempts == 0) {
                        log.add(LogEntry(now, item.packageName, amountOf(item), LogResult.RETRY, detail = describe(outcome)))
                    }
                    return DrainResult(delivered, outbox.size(), outbox.earliestAttemptAt(), false)
                }
            }
        }
        val remaining = outbox.size()
        return DrainResult(delivered, remaining, if (remaining > 0) outbox.earliestAttemptAt() else null, false)
    }

    /**
     * "Kirim uji": mengirim teks tanpa nominal supaya server mencatat `no_amount` dan memverifikasi kunci.
     * Bila berhasil, blokir kunci dicabut.
     */
    fun sendTest(config: ServerConfig, sourcePackage: String): SendOutcome {
        val now = clock()
        val outcome = send(config, Protocol.buildBody(Protocol.TEST_TITLE, Protocol.TEST_TEXT, sourcePackage, now))
        when (outcome) {
            is SendOutcome.Delivered -> {
                if (state.authBlocked) {
                    state.authBlocked = false
                    outbox.makeAllDue()
                }
                log.add(LogEntry(clock(), sourcePackage, null, outcome.result, outcome.orderCode, detail = "test"))
            }
            is SendOutcome.AuthFailed -> {
                state.authBlocked = true
                log.add(LogEntry(clock(), sourcePackage, null, LogResult.AUTH_FAILED, detail = outcome.error))
            }
            is SendOutcome.Retry -> log.add(LogEntry(clock(), sourcePackage, null, LogResult.RETRY, detail = describe(outcome)))
            is SendOutcome.Rejected -> log.add(LogEntry(clock(), sourcePackage, null, LogResult.REJECTED, detail = outcome.status.toString()))
        }
        return outcome
    }

    /** Dipanggil setelah pengguna menyimpan kunci/URL baru. */
    fun onConfigChanged() {
        state.authBlocked = false
        outbox.makeAllDue()
    }

    private fun send(config: ServerConfig, body: String): SendOutcome {
        val result = try {
            transport.post(config.endpoint, config.key, body)
        } catch (e: IOException) {
            return SendOutcome.Retry(RetryReason.NETWORK)
        }
        return Protocol.interpret(result.status, result.body)
    }

    private fun amountOf(item: QueueItem): Int? = Rupiah.parseAmount(item.title + " " + item.text)

    companion object {
        /** Keterangan singkat untuk log: "network", "http_503", "bad_response". */
        fun describe(outcome: SendOutcome.Retry): String = when (outcome.reason) {
            RetryReason.NETWORK -> "network"
            RetryReason.BAD_RESPONSE -> "bad_response"
            else -> "http_" + outcome.status
        }
    }
}
