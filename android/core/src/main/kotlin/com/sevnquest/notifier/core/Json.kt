package com.sevnquest.notifier.core

/**
 * JSON minimal (tanpa dependensi) untuk membentuk body request, mengurai respons server,
 * dan menyimpan antrean/log ke disk.
 *
 * Hasil [parse]: Map<String, Any?>, List<Any?>, String, Long, Double, Boolean, atau null.
 */
object Json {
    class ParseException(message: String) : Exception(message)

    fun quote(value: String): String {
        val sb = StringBuilder(value.length + 2)
        sb.append('"')
        for (ch in value) {
            when (ch) {
                '"' -> sb.append("\\\"")
                '\\' -> sb.append("\\\\")
                '\n' -> sb.append("\\n")
                '\r' -> sb.append("\\r")
                '\t' -> sb.append("\\t")
                '\b' -> sb.append("\\b")
                '\u000C' -> sb.append("\\f")
                else -> {
                    // Karakter kontrol, pemisah baris Unicode, dan surrogate di-escape supaya
                    // satu objek selalu muat dalam satu baris dan aman dikirim apa adanya.
                    if (ch < ' ' || ch == '\u2028' || ch == '\u2029' || ch.isSurrogate() || ch == '\u007F') {
                        sb.append("\\u").append(String.format("%04x", ch.code))
                    } else {
                        sb.append(ch)
                    }
                }
            }
        }
        sb.append('"')
        return sb.toString()
    }

    /** Menyusun objek JSON satu baris. Nilai yang didukung: String, Number, Boolean, null. */
    fun obj(fields: List<Pair<String, Any?>>): String {
        val sb = StringBuilder("{")
        var first = true
        for ((name, value) in fields) {
            if (!first) sb.append(',')
            first = false
            sb.append(quote(name)).append(':')
            when (value) {
                null -> sb.append("null")
                is String -> sb.append(quote(value))
                is Boolean -> sb.append(if (value) "true" else "false")
                is Int, is Long -> sb.append(value.toString())
                is Number -> {
                    val d = value.toDouble()
                    if (d.isNaN() || d.isInfinite()) sb.append("null") else sb.append(d.toString())
                }
                else -> throw IllegalArgumentException("Tipe JSON tidak didukung: ${value::class}")
            }
        }
        sb.append('}')
        return sb.toString()
    }

    @Throws(ParseException::class)
    fun parse(text: String): Any? {
        val p = Parser(text)
        p.skipWs()
        val v = p.readValue(0)
        p.skipWs()
        if (!p.atEnd()) throw ParseException("Karakter berlebih di posisi ${p.pos}")
        return v
    }

    /** Mengurai objek JSON; null bila bukan objek atau tidak valid. */
    fun parseObjectOrNull(text: String?): Map<String, Any?>? {
        if (text == null) return null
        return try {
            @Suppress("UNCHECKED_CAST")
            parse(text) as? Map<String, Any?>
        } catch (e: ParseException) {
            null
        }
    }

    private class Parser(private val s: String) {
        var pos = 0

        fun atEnd() = pos >= s.length

        fun skipWs() {
            while (pos < s.length) {
                val c = s[pos]
                if (c == ' ' || c == '\n' || c == '\r' || c == '\t') pos++ else break
            }
        }

        fun readValue(depth: Int): Any? {
            if (depth > 32) throw ParseException("JSON terlalu dalam")
            if (atEnd()) throw ParseException("JSON terpotong")
            return when (val c = s[pos]) {
                '{' -> readObject(depth)
                '[' -> readArray(depth)
                '"' -> readString()
                't' -> literal("true", true)
                'f' -> literal("false", false)
                'n' -> literal("null", null)
                else -> if (c == '-' || c in '0'..'9') readNumber() else throw ParseException("Karakter tak terduga '$c' di posisi $pos")
            }
        }

        private fun literal(word: String, value: Any?): Any? {
            if (!s.startsWith(word, pos)) throw ParseException("Literal tidak valid di posisi $pos")
            pos += word.length
            return value
        }

        private fun readObject(depth: Int): Map<String, Any?> {
            val out = LinkedHashMap<String, Any?>()
            pos++ // {
            skipWs()
            if (!atEnd() && s[pos] == '}') { pos++; return out }
            while (true) {
                skipWs()
                if (atEnd() || s[pos] != '"') throw ParseException("Nama field diharapkan di posisi $pos")
                val name = readString()
                skipWs()
                if (atEnd() || s[pos] != ':') throw ParseException("':' diharapkan di posisi $pos")
                pos++
                skipWs()
                out[name] = readValue(depth + 1)
                skipWs()
                if (atEnd()) throw ParseException("JSON terpotong")
                when (s[pos]) {
                    ',' -> pos++
                    '}' -> { pos++; return out }
                    else -> throw ParseException("',' atau '}' diharapkan di posisi $pos")
                }
            }
        }

        private fun readArray(depth: Int): List<Any?> {
            val out = ArrayList<Any?>()
            pos++ // [
            skipWs()
            if (!atEnd() && s[pos] == ']') { pos++; return out }
            while (true) {
                skipWs()
                out.add(readValue(depth + 1))
                skipWs()
                if (atEnd()) throw ParseException("JSON terpotong")
                when (s[pos]) {
                    ',' -> pos++
                    ']' -> { pos++; return out }
                    else -> throw ParseException("',' atau ']' diharapkan di posisi $pos")
                }
            }
        }

        private fun readString(): String {
            pos++ // "
            val sb = StringBuilder()
            while (true) {
                if (atEnd()) throw ParseException("String terpotong")
                val c = s[pos++]
                when {
                    c == '"' -> return sb.toString()
                    c == '\\' -> {
                        if (atEnd()) throw ParseException("Escape terpotong")
                        when (val e = s[pos++]) {
                            '"' -> sb.append('"')
                            '\\' -> sb.append('\\')
                            '/' -> sb.append('/')
                            'n' -> sb.append('\n')
                            'r' -> sb.append('\r')
                            't' -> sb.append('\t')
                            'b' -> sb.append('\b')
                            'f' -> sb.append('\u000C')
                            'u' -> {
                                if (pos + 4 > s.length) throw ParseException("Escape unicode terpotong")
                                val hex = s.substring(pos, pos + 4)
                                val code = hex.toIntOrNull(16) ?: throw ParseException("Escape unicode tidak valid: $hex")
                                sb.append(code.toChar())
                                pos += 4
                            }
                            else -> throw ParseException("Escape tidak dikenal: \\$e")
                        }
                    }
                    else -> sb.append(c)
                }
            }
        }

        private fun readNumber(): Any {
            val start = pos
            if (s[pos] == '-') pos++
            var isFloat = false
            while (pos < s.length) {
                val c = s[pos]
                if (c in '0'..'9') {
                    pos++
                } else if (c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-') {
                    isFloat = true
                    pos++
                } else {
                    break
                }
            }
            val raw = s.substring(start, pos)
            if (!isFloat) raw.toLongOrNull()?.let { return it }
            return raw.toDoubleOrNull() ?: throw ParseException("Angka tidak valid: $raw")
        }
    }
}

/** Membaca field angka bulat dari objek hasil [Json.parse]; null bila tidak ada atau bukan bilangan bulat. */
fun Map<String, Any?>.longOrNull(name: String): Long? = when (val v = this[name]) {
    is Long -> v
    is Double -> if (v == Math.floor(v) && !v.isInfinite() && Math.abs(v) < 9.0e15) v.toLong() else null
    else -> null
}

fun Map<String, Any?>.stringOrNull(name: String): String? = this[name] as? String
