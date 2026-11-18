package com.sevnquest.notifier.core

/** Notifikasi yang sudah diambil dari sistem, dalam bentuk netral (tanpa kelas Android). */
data class CapturedNotification(
    val packageName: String,
    val title: String,
    val text: String,
    val postedAt: Long,
    /** Kunci unik notifikasi dari sistem (StatusBarNotification.getKey()). */
    val key: String,
    val isGroupSummary: Boolean = false,
    val isOngoing: Boolean = false,
)

enum class FilterDecision {
    FORWARD,
    DISABLED,
    NOT_MONITORED,
    GROUP_SUMMARY,
    ONGOING,
    NO_AMOUNT,
}

object NotificationFilter {
    /** Memilih isi notifikasi: yang paling panjang di antara android.text dan android.bigText. */
    fun pickText(text: CharSequence?, bigText: CharSequence?): String {
        val a = text?.toString()?.trim().orEmpty()
        val b = bigText?.toString()?.trim().orEmpty()
        return if (b.length > a.length) b else a
    }

    /**
     * Pemeriksaan murah yang dilakukan lebih dulu: notifikasi dari paket di luar daftar pantau
     * tidak boleh dibaca isinya sama sekali.
     */
    fun isMonitored(packageName: String?, monitored: Collection<String>): Boolean =
        packageName != null && monitored.contains(packageName)

    fun decide(n: CapturedNotification, monitored: Collection<String>, enabled: Boolean): FilterDecision = when {
        !enabled -> FilterDecision.DISABLED
        !isMonitored(n.packageName, monitored) -> FilterDecision.NOT_MONITORED
        n.isGroupSummary -> FilterDecision.GROUP_SUMMARY
        n.isOngoing -> FilterDecision.ONGOING
        !Rupiah.containsAmount(n.title + " " + n.text) -> FilterDecision.NO_AMOUNT
        else -> FilterDecision.FORWARD
    }
}
