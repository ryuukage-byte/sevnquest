package com.sevnquest.notifier.core

import java.io.File
import java.io.FileOutputStream
import java.io.IOException

/** Batas bersama. */
object Limits {
    /** Server hanya mencocokkan pesanan yang berumur <= 48 jam, jadi item lebih tua tidak berguna. */
    const val MAX_AGE_MS = 48L * 60 * 60 * 1000
    const val MAX_QUEUE = 200
    const val MAX_LOG = 50
    const val MAX_TITLE_CHARS = 200
    const val MAX_TEXT_CHARS = 1000
}

/** Baca/tulis berkas baris-per-baris secara atomik (tulis ke berkas sementara lalu ganti nama). */
internal object AtomicFiles {
    fun readLines(file: File): List<String> {
        return try {
            if (!file.isFile) emptyList() else file.readLines(Charsets.UTF_8).filter { it.isNotBlank() }
        } catch (e: IOException) {
            emptyList()
        }
    }

    /** Mengembalikan false bila gagal menulis (mis. disk penuh); data lama tetap utuh. */
    fun writeLines(file: File, lines: List<String>): Boolean {
        val tmp = File(file.parentFile, file.name + ".tmp")
        return try {
            file.parentFile?.mkdirs()
            FileOutputStream(tmp).use { out ->
                val sb = StringBuilder()
                for (line in lines) sb.append(line).append('\n')
                out.write(sb.toString().toByteArray(Charsets.UTF_8))
                out.fd.sync()
            }
            if (!tmp.renameTo(file)) {
                // Sebagian sistem berkas tidak mau menimpa lewat rename.
                file.delete()
                if (!tmp.renameTo(file)) {
                    tmp.delete()
                    return false
                }
            }
            true
        } catch (e: IOException) {
            tmp.delete()
            false
        }
    }
}
