package com.sevnquest.notifier.core

/**
 * Deteksi nominal rupiah di teks notifikasi. Sengaja disamakan dengan `parseIdrAmount` di server
 * (api/_paymentNotify.ts). Server tetap yang memutuskan; hasil di sini hanya dipakai untuk
 * menyaring notifikasi yang layak diteruskan dan untuk tampilan log.
 */
object Rupiah {
    private val AMOUNT = Regex("(?:Rp\\.?|IDR)\\s*([0-9][0-9.,]*)", RegexOption.IGNORE_CASE)
    private val TRAILING_SEPARATOR = Regex("[.,]$")
    private val CENTS_SUFFIX = Regex("[.,]\\d{2}$")
    private val THOUSANDS_GROUP = Regex("[.,]\\d{3}")

    /** true bila teks mengandung "Rp" / "IDR" yang diikuti angka. */
    fun containsAmount(text: String?): Boolean = !text.isNullOrEmpty() && AMOUNT.containsMatchIn(text)

    /**
     * Nominal rupiah pertama di teks, atau null. Menerima "Rp25.001", "Rp 25.001,00", "IDR 25,001", "Rp25001".
     */
    fun parseAmount(text: String?): Int? {
        if (text.isNullOrEmpty()) return null
        val m = AMOUNT.find(text) ?: return null
        var raw = m.groupValues[1].replace(TRAILING_SEPARATOR, "")
        // Desimal sen di akhir (",00" / ".00") dibuang hanya bila ada pemisah ribuan sebelumnya.
        if (CENTS_SUFFIX.containsMatchIn(raw) && THOUSANDS_GROUP.containsMatchIn(raw)) {
            raw = raw.substring(0, raw.length - 3)
        }
        val digits = raw.replace(".", "").replace(",", "")
        if (digits.isEmpty() || digits.length > 9) return null
        val n = digits.toLongOrNull() ?: return null
        return if (n > 0 && n < 100_000_000L) n.toInt() else null
    }

    /** "Rp 25.001" untuk tampilan. */
    fun format(amount: Int): String {
        val s = amount.toString()
        val sb = StringBuilder()
        for (i in s.indices) {
            if (i > 0 && (s.length - i) % 3 == 0) sb.append('.')
            sb.append(s[i])
        }
        return "Rp $sb"
    }
}
