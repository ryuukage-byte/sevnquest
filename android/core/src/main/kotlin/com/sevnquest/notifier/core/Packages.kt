package com.sevnquest.notifier.core

/** Daftar paket (aplikasi sumber notifikasi) yang dipantau. */
object Packages {
    /**
     * Bawaan: GoPay, Gojek, GoPay Merchant, dan GoBiz (kini bernama GoFood Merchant di Play Store).
     * Pengguna bisa mengubah daftar ini di aplikasi.
     */
    val DEFAULT: List<String> = listOf(
        "com.gojek.gopaymerchant",
        "com.gojek.gopay",
        "com.gojek.app",
        "com.gojek.resto",
    )

    const val MAX_PACKAGES = 20

    private val VALID = Regex("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$")
    private val SEPARATORS = Regex("[\\s,;]+")

    fun isValidName(name: String): Boolean = name.length <= 255 && VALID.matches(name)

    data class Parsed(val valid: List<String>, val invalid: List<String>)

    /** Mengurai masukan pengguna (dipisah baris baru, spasi, koma, atau titik koma). */
    fun parseList(input: String?): Parsed {
        val valid = LinkedHashSet<String>()
        val invalid = LinkedHashSet<String>()
        if (input != null) {
            for (token in input.split(SEPARATORS)) {
                val name = token.trim()
                if (name.isEmpty()) continue
                if (isValidName(name)) {
                    if (valid.size < MAX_PACKAGES) valid.add(name)
                } else {
                    invalid.add(name)
                }
            }
        }
        return Parsed(valid.toList(), invalid.toList())
    }

    fun serialize(packages: Collection<String>): String = packages.joinToString("\n")

    /** Daftar tersimpan; bila belum pernah disimpan (null) memakai bawaan. */
    fun fromStored(stored: String?): List<String> = if (stored == null) DEFAULT else parseList(stored).valid
}
