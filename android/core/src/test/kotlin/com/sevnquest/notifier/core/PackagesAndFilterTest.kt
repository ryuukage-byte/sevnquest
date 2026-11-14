package com.sevnquest.notifier.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PackagesAndFilterTest {
    private val monitored = Packages.DEFAULT

    private fun notif(
        pkg: String = "com.gojek.gopaymerchant",
        title: String = "Pembayaran diterima",
        text: String = "Rp 25.001 di Sevnsoul Store",
        summary: Boolean = false,
        ongoing: Boolean = false,
    ) = CapturedNotification(pkg, title, text, 1_000L, "0|$pkg|1|null|10", summary, ongoing)

    @Test
    fun defaultsContainTheFourGoToApps() {
        assertEquals(
            setOf("com.gojek.gopay", "com.gojek.app", "com.gojek.gopaymerchant", "com.gojek.resto"),
            Packages.DEFAULT.toSet(),
        )
        assertTrue(Packages.DEFAULT.all { Packages.isValidName(it) })
    }

    @Test
    fun parseListAcceptsVariousSeparators() {
        val parsed = Packages.parseList(" com.a.b,com.c.d ;com.e.f\ncom.g.h\r\n\tcom.a.b ")
        assertEquals(listOf("com.a.b", "com.c.d", "com.e.f", "com.g.h"), parsed.valid)
        assertTrue(parsed.invalid.isEmpty())
    }

    @Test
    fun parseListReportsInvalidNames() {
        val parsed = Packages.parseList("com.ok.app, gopay, com..x, 1com.a, com.a-b.c, https://x.y")
        assertEquals(listOf("com.ok.app"), parsed.valid)
        assertEquals(listOf("gopay", "com..x", "1com.a", "com.a-b.c", "https://x.y"), parsed.invalid)
    }

    @Test
    fun parseListCapsSize() {
        val many = (1..50).joinToString(",") { "com.app.n$it" }
        assertEquals(Packages.MAX_PACKAGES, Packages.parseList(many).valid.size)
    }

    @Test
    fun storedListFallsBackToDefaultOnlyWhenNeverSaved() {
        assertEquals(Packages.DEFAULT, Packages.fromStored(null))
        assertEquals(emptyList<String>(), Packages.fromStored(""))
        assertEquals(listOf("id.custom.app"), Packages.fromStored(Packages.serialize(listOf("id.custom.app"))))
    }

    @Test
    fun pickTextPrefersLongest() {
        assertEquals("panjang sekali", NotificationFilter.pickText("pendek", "panjang sekali"))
        assertEquals("teks biasa", NotificationFilter.pickText("teks biasa", "big"))
        assertEquals("a", NotificationFilter.pickText("a", null))
        assertEquals("b", NotificationFilter.pickText(null, " b "))
        assertEquals("", NotificationFilter.pickText(null, null))
    }

    @Test
    fun forwardsMonitoredPaymentNotification() {
        assertEquals(FilterDecision.FORWARD, NotificationFilter.decide(notif(), monitored, true))
        assertEquals(FilterDecision.FORWARD, NotificationFilter.decide(notif(pkg = "com.gojek.gopay"), monitored, true))
    }

    @Test
    fun amountMayBeInTitleOnly() {
        val n = notif(title = "Kamu menerima Rp10.001", text = "Cek saldo kamu")
        assertEquals(FilterDecision.FORWARD, NotificationFilter.decide(n, monitored, true))
    }

    @Test
    fun neverForwardsOtherApps() {
        for (pkg in listOf("com.whatsapp", "com.bca", "com.gojek.gopaymerchant.evil", "com.gojek", "")) {
            assertEquals(pkg, FilterDecision.NOT_MONITORED, NotificationFilter.decide(notif(pkg = pkg), monitored, true))
            assertFalse(NotificationFilter.isMonitored(pkg, monitored))
        }
        assertFalse(NotificationFilter.isMonitored(null, monitored))
    }

    @Test
    fun respectsUserEditedList() {
        val custom = listOf("id.bank.lain")
        assertEquals(FilterDecision.FORWARD, NotificationFilter.decide(notif(pkg = "id.bank.lain"), custom, true))
        assertEquals(FilterDecision.NOT_MONITORED, NotificationFilter.decide(notif(), custom, true))
        assertEquals(FilterDecision.NOT_MONITORED, NotificationFilter.decide(notif(), emptyList(), true))
    }

    @Test
    fun skipsSummaryOngoingDisabledAndNoAmount() {
        assertEquals(FilterDecision.GROUP_SUMMARY, NotificationFilter.decide(notif(summary = true), monitored, true))
        assertEquals(FilterDecision.ONGOING, NotificationFilter.decide(notif(ongoing = true), monitored, true))
        assertEquals(FilterDecision.DISABLED, NotificationFilter.decide(notif(), monitored, false))
        assertEquals(
            FilterDecision.NO_AMOUNT,
            NotificationFilter.decide(notif(title = "Promo", text = "Diskon 50% hari ini"), monitored, true),
        )
    }
}
