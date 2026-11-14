package com.sevnquest.notifier.core

import java.io.File
import java.security.MessageDigest

/**
 * Mencegah notifikasi yang sama dikirim dua kali. Android sering memanggil onNotificationPosted
 * berulang untuk satu notifikasi (update), dan saat listener tersambung ulang notifikasi yang masih
 * aktif dibaca lagi.
 *
 * Dua aturan:
 *  1. key + postTime yang sama (disimpan selama [retentionMs]) = duplikat.
 *  2. paket + judul + teks yang sama dengan selisih waktu posting <= [windowMs] = duplikat.
 *
 * Yang disimpan hanya hash, bukan isi notifikasi. Bila [file] diisi, status bertahan saat proses mati.
 */
class Deduper(
    private val file: File? = null,
    private val windowMs: Long = DEFAULT_WINDOW_MS,
    private val retentionMs: Long = Limits.MAX_AGE_MS,
    private val maxEntries: Int = 500,
) {
    private val byKey = LinkedHashMap<String, Long>()
    private val byContent = LinkedHashMap<String, Long>()
    private var loaded = false

    /**
     * Mengembalikan true bila notifikasi ini sudah pernah terlihat (jangan dikirim).
     * Bila belum, notifikasi dicatat dan mengembalikan false.
     */
    @Synchronized
    fun isDuplicate(n: CapturedNotification, now: Long): Boolean {
        ensureLoaded()
        prune(now)
        val keyHash = hash("k", n.key, n.postedAt.toString())
        val contentHash = hash("c", n.packageName, n.title, n.text)

        val duplicate = when {
            byKey.containsKey(keyHash) -> true
            else -> {
                val last = byContent[contentHash]
                last != null && Math.abs(n.postedAt - last) <= windowMs
            }
        }
        // Selalu catat, supaya rangkaian update yang panjang tetap dianggap satu notifikasi.
        byKey.remove(keyHash)
        byKey[keyHash] = now
        byContent.remove(contentHash)
        byContent[contentHash] = n.postedAt
        trim(byKey)
        trim(byContent)
        persist()
        return duplicate
    }

    @Synchronized
    fun clear() {
        byKey.clear()
        byContent.clear()
        loaded = true
        persist()
    }

    @Synchronized
    fun size(): Int {
        ensureLoaded()
        return byKey.size
    }

    private fun prune(now: Long) {
        val keyIt = byKey.entries.iterator()
        while (keyIt.hasNext()) {
            if (now - keyIt.next().value > retentionMs) keyIt.remove()
        }
        val contentIt = byContent.entries.iterator()
        while (contentIt.hasNext()) {
            // Entri isi hanya berguna selama jendela dedup; simpan sedikit lebih lama untuk jaga-jaga.
            if (now - contentIt.next().value > retentionMs) contentIt.remove()
        }
    }

    private fun trim(map: LinkedHashMap<String, Long>) {
        while (map.size > maxEntries) {
            val it = map.entries.iterator()
            it.next()
            it.remove()
        }
    }

    private fun ensureLoaded() {
        if (loaded) return
        loaded = true
        val f = file ?: return
        for (line in AtomicFiles.readLines(f)) {
            val parts = line.split(' ')
            if (parts.size != 3) continue
            val ts = parts[2].toLongOrNull() ?: continue
            when (parts[0]) {
                "k" -> byKey[parts[1]] = ts
                "c" -> byContent[parts[1]] = ts
            }
        }
    }

    private fun persist() {
        val f = file ?: return
        val lines = ArrayList<String>(byKey.size + byContent.size)
        for ((h, ts) in byKey) lines.add("k $h $ts")
        for ((h, ts) in byContent) lines.add("c $h $ts")
        AtomicFiles.writeLines(f, lines)
    }

    companion object {
        const val DEFAULT_WINDOW_MS = 60_000L

        internal fun hash(vararg parts: String): String {
            val md = MessageDigest.getInstance("SHA-256")
            for (p in parts) {
                val bytes = p.toByteArray(Charsets.UTF_8)
                md.update(bytes.size.toString().toByteArray(Charsets.UTF_8))
                md.update(0)
                md.update(bytes)
            }
            val digest = md.digest()
            val sb = StringBuilder(32)
            for (i in 0 until 16) sb.append(String.format("%02x", digest[i].toInt() and 0xff))
            return sb.toString()
        }
    }
}
