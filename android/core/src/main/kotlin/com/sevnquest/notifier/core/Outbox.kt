package com.sevnquest.notifier.core

import java.io.File

/** Satu notifikasi yang menunggu dikirim ke server. */
data class QueueItem(
    val id: String,
    val title: String,
    val text: String,
    val packageName: String,
    val postedAt: Long,
    val enqueuedAt: Long,
    val attempts: Int = 0,
    val nextAttemptAt: Long = 0,
) {
    fun toJson(): String = Json.obj(
        listOf(
            "id" to id,
            "title" to title,
            "text" to text,
            "package" to packageName,
            "posted_at" to postedAt,
            "enqueued_at" to enqueuedAt,
            "attempts" to attempts,
            "next_attempt_at" to nextAttemptAt,
        )
    )

    companion object {
        fun fromJson(line: String): QueueItem? {
            val o = Json.parseObjectOrNull(line) ?: return null
            return QueueItem(
                id = o.stringOrNull("id") ?: return null,
                title = o.stringOrNull("title") ?: "",
                text = o.stringOrNull("text") ?: "",
                packageName = o.stringOrNull("package") ?: return null,
                postedAt = o.longOrNull("posted_at") ?: return null,
                enqueuedAt = o.longOrNull("enqueued_at") ?: return null,
                attempts = (o.longOrNull("attempts") ?: 0L).toInt(),
                nextAttemptAt = o.longOrNull("next_attempt_at") ?: 0L,
            )
        }
    }
}

/**
 * Antrean keluar yang persisten di disk (satu objek JSON per baris). Bertahan saat proses mati
 * atau HP dinyalakan ulang. Item lebih tua dari [maxAgeMs] dibuang; ukuran dibatasi [maxSize]
 * (yang paling lama dibuang lebih dulu).
 */
class Outbox(
    private val file: File,
    private val maxSize: Int = Limits.MAX_QUEUE,
    private val maxAgeMs: Long = Limits.MAX_AGE_MS,
) {
    private val items = ArrayList<QueueItem>()
    private var loaded = false

    /** Menambah item. Mengembalikan jumlah item lama yang terbuang (kedaluwarsa atau melebihi batas). */
    @Synchronized
    fun add(item: QueueItem, now: Long): Int {
        ensureLoaded()
        items.add(item)
        var dropped = pruneLocked(now)
        while (items.size > maxSize) {
            items.removeAt(0)
            dropped++
        }
        persist()
        return dropped
    }

    /** Membuang item kedaluwarsa. Mengembalikan item yang dibuang. */
    @Synchronized
    fun pruneExpired(now: Long): List<QueueItem> {
        ensureLoaded()
        val expired = items.filter { isExpired(it, now) }
        if (expired.isNotEmpty()) {
            pruneLocked(now)
            persist()
        }
        return expired
    }

    @Synchronized
    fun all(): List<QueueItem> {
        ensureLoaded()
        return ArrayList(items)
    }

    /** Item yang sudah waktunya dicoba, urut dari yang paling lama diposting. */
    @Synchronized
    fun due(now: Long): List<QueueItem> {
        ensureLoaded()
        return items.filter { it.nextAttemptAt <= now }.sortedBy { it.postedAt }
    }

    @Synchronized
    fun size(): Int {
        ensureLoaded()
        return items.size
    }

    /** Waktu percobaan berikutnya yang paling awal, atau null bila antrean kosong. */
    @Synchronized
    fun earliestAttemptAt(): Long? {
        ensureLoaded()
        return items.minOfOrNull { it.nextAttemptAt }
    }

    @Synchronized
    fun remove(id: String): Boolean {
        ensureLoaded()
        val removed = items.removeAll { it.id == id }
        if (removed) persist()
        return removed
    }

    /** Mencatat percobaan gagal: attempts bertambah satu dan dijadwalkan ulang pada [nextAttemptAt]. */
    @Synchronized
    fun markFailedAttempt(id: String, nextAttemptAt: Long): QueueItem? {
        ensureLoaded()
        val index = items.indexOfFirst { it.id == id }
        if (index < 0) return null
        val updated = items[index].copy(attempts = items[index].attempts + 1, nextAttemptAt = nextAttemptAt)
        items[index] = updated
        persist()
        return updated
    }

    /** Menunda semua item yang jadwalnya lebih awal dari [until] (tanpa menambah attempts). */
    @Synchronized
    fun deferAll(until: Long) {
        ensureLoaded()
        var changed = false
        for (i in items.indices) {
            if (items[i].nextAttemptAt < until) {
                items[i] = items[i].copy(nextAttemptAt = until)
                changed = true
            }
        }
        if (changed) persist()
    }

    /** Membuat semua item boleh dicoba sekarang juga (mis. setelah kunci diperbaiki). */
    @Synchronized
    fun makeAllDue() {
        ensureLoaded()
        var changed = false
        for (i in items.indices) {
            if (items[i].nextAttemptAt != 0L) {
                items[i] = items[i].copy(nextAttemptAt = 0L)
                changed = true
            }
        }
        if (changed) persist()
    }

    @Synchronized
    fun clear() {
        ensureLoaded()
        items.clear()
        persist()
    }

    private fun isExpired(item: QueueItem, now: Long) = now - item.postedAt > maxAgeMs

    private fun pruneLocked(now: Long): Int {
        val before = items.size
        items.removeAll { isExpired(it, now) }
        return before - items.size
    }

    private fun ensureLoaded() {
        if (loaded) return
        loaded = true
        for (line in AtomicFiles.readLines(file)) {
            QueueItem.fromJson(line)?.let { items.add(it) }
        }
    }

    private fun persist() {
        AtomicFiles.writeLines(file, items.map { it.toJson() })
    }
}
