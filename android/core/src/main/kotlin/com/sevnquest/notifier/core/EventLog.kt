package com.sevnquest.notifier.core

import java.io.File

/**
 * Satu baris log kejadian. Sengaja tidak menyimpan isi notifikasi: hanya waktu, paket sumber,
 * nominal yang terbaca, dan hasil.
 */
data class LogEntry(
    val time: Long,
    val packageName: String,
    val amount: Int?,
    /** Kode hasil, lihat [LogResult]. */
    val result: String,
    val orderCode: String? = null,
    val detail: String? = null,
) {
    fun toJson(): String = Json.obj(
        listOf(
            "time" to time,
            "package" to packageName,
            "amount" to amount,
            "result" to result,
            "order_code" to orderCode,
            "detail" to detail,
        )
    )

    companion object {
        fun fromJson(line: String): LogEntry? {
            val o = Json.parseObjectOrNull(line) ?: return null
            return LogEntry(
                time = o.longOrNull("time") ?: return null,
                packageName = o.stringOrNull("package") ?: return null,
                amount = o.longOrNull("amount")?.toInt(),
                result = o.stringOrNull("result") ?: return null,
                orderCode = o.stringOrNull("order_code"),
                detail = o.stringOrNull("detail"),
            )
        }
    }
}

/** Kode hasil di log. Empat yang pertama berasal dari server. */
object LogResult {
    const val APPROVED = "approved"
    const val UNMATCHED = "unmatched"
    const val AMBIGUOUS = "ambiguous"
    const val NO_AMOUNT = "no_amount"

    /** Gagal sementara, akan dicoba lagi. */
    const val RETRY = "retry"
    /** Kunci ditolak server (401). */
    const val AUTH_FAILED = "auth_failed"
    /** Ditolak permanen oleh server, item dibuang. */
    const val REJECTED = "rejected"
    /** Dibuang karena lebih tua dari 48 jam. */
    const val EXPIRED = "expired"
    /** Dibuang karena antrean penuh. */
    const val QUEUE_FULL = "queue_full"
}

/** Log [maxEntries] kejadian terakhir, persisten di disk. Entri terbaru di depan. */
class EventLog(private val file: File, private val maxEntries: Int = Limits.MAX_LOG) {
    private val entries = ArrayList<LogEntry>()
    private var loaded = false

    @Synchronized
    fun add(entry: LogEntry) {
        ensureLoaded()
        entries.add(0, entry)
        while (entries.size > maxEntries) entries.removeAt(entries.size - 1)
        persist()
    }

    @Synchronized
    fun entries(): List<LogEntry> {
        ensureLoaded()
        return ArrayList(entries)
    }

    @Synchronized
    fun clear() {
        ensureLoaded()
        entries.clear()
        persist()
    }

    private fun ensureLoaded() {
        if (loaded) return
        loaded = true
        for (line in AtomicFiles.readLines(file)) {
            LogEntry.fromJson(line)?.let { entries.add(it) }
        }
        while (entries.size > maxEntries) entries.removeAt(entries.size - 1)
    }

    private fun persist() {
        AtomicFiles.writeLines(file, entries.map { it.toJson() })
    }
}
