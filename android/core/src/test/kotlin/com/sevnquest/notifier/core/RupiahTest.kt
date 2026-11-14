package com.sevnquest.notifier.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RupiahTest {
    @Test
    fun parsesCommonFormats() {
        assertEquals(25001, Rupiah.parseAmount("Rp25.001"))
        assertEquals(25001, Rupiah.parseAmount("Rp 25.001,00"))
        assertEquals(25001, Rupiah.parseAmount("IDR 25,001"))
        assertEquals(25001, Rupiah.parseAmount("Rp25001"))
        assertEquals(25001, Rupiah.parseAmount("rp. 25.001"))
        assertEquals(25001, Rupiah.parseAmount("IDR25,001.00"))
        assertEquals(1500000, Rupiah.parseAmount("Kamu menerima Rp1.500.000 dari BUDI"))
        assertEquals(4999, Rupiah.parseAmount("Rp 4.999 di Sevnsoul Store, Digital & Kreatif."))
        assertEquals(16983, Rupiah.parseAmount("Pembayaran QRIS statis diterima Rp16.983."))
    }

    @Test
    fun takesFirstAmount() {
        assertEquals(10001, Rupiah.parseAmount("Masuk Rp10.001, saldo Rp250.000"))
    }

    @Test
    fun keepsTwoDigitGroupWithoutThousandsSeparator() {
        // Sama dengan server: "Rp25,00" tanpa pemisah ribuan tidak dianggap punya sen.
        assertEquals(2500, Rupiah.parseAmount("Rp25,00"))
    }

    @Test
    fun rejectsMissingOrOutOfRange() {
        assertNull(Rupiah.parseAmount(null))
        assertNull(Rupiah.parseAmount(""))
        assertNull(Rupiah.parseAmount("Tes koneksi SevnQuest Notifier"))
        assertNull(Rupiah.parseAmount("Rp"))
        assertNull(Rupiah.parseAmount("Rp abc"))
        assertNull(Rupiah.parseAmount("Rp0"))
        assertNull(Rupiah.parseAmount("Rp100.000.000"))
        assertNull(Rupiah.parseAmount("Rp99999999999999999999"))
        assertEquals(99999999, Rupiah.parseAmount("Rp99.999.999"))
    }

    @Test
    fun containsAmountMatchesContract() {
        assertTrue(Rupiah.containsAmount("Uang masuk Rp 10.000"))
        assertTrue(Rupiah.containsAmount("IDR 5000 received"))
        assertTrue(Rupiah.containsAmount("idr5000"))
        assertTrue(Rupiah.containsAmount("Rp.5000"))
        assertFalse(Rupiah.containsAmount("Tes koneksi SevnQuest Notifier"))
        assertFalse(Rupiah.containsAmount("Promo untukmu! Rp spesial"))
        assertFalse(Rupiah.containsAmount("Ada 3 pesan baru"))
        assertFalse(Rupiah.containsAmount(null))
        assertFalse(Rupiah.containsAmount(""))
    }

    @Test
    fun formatsWithThousandsSeparator() {
        assertEquals("Rp 1", Rupiah.format(1))
        assertEquals("Rp 999", Rupiah.format(999))
        assertEquals("Rp 1.000", Rupiah.format(1000))
        assertEquals("Rp 25.001", Rupiah.format(25001))
        assertEquals("Rp 1.500.000", Rupiah.format(1500000))
    }
}
