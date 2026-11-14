package com.sevnquest.notifier.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class DeduperTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private fun n(key: String = "k1", postedAt: Long = 1_000L, text: String = "Rp 10.001 diterima", pkg: String = "com.gojek.gopay", title: String = "GoPay") =
        CapturedNotification(pkg, title, text, postedAt, key)

    @Test
    fun firstSightingIsNotDuplicate() {
        val d = Deduper()
        assertFalse(d.isDuplicate(n(), 1_000L))
    }

    @Test
    fun sameKeyAndPostTimeIsDuplicate() {
        val d = Deduper()
        assertFalse(d.isDuplicate(n(), 1_000L))
        assertTrue(d.isDuplicate(n(), 1_001L))
        // Tetap duplikat walau isi berubah dan sudah lama, selama key + postTime sama.
        assertTrue(d.isDuplicate(n(text = "Rp 10.001 diterima (diperbarui)"), 10 * 60_000L))
    }

    @Test
    fun sameContentWithinWindowIsDuplicateEvenWithNewKeyOrPostTime() {
        val d = Deduper()
        assertFalse(d.isDuplicate(n(key = "k1", postedAt = 1_000L), 1_000L))
        assertTrue(d.isDuplicate(n(key = "k1", postedAt = 5_000L), 5_000L))
        assertTrue(d.isDuplicate(n(key = "k2", postedAt = 30_000L), 30_000L))
    }

    @Test
    fun windowSlidesWithRepeatedUpdates() {
        val d = Deduper(windowMs = 60_000L)
        assertFalse(d.isDuplicate(n(postedAt = 0L, key = "a"), 0L))
        assertTrue(d.isDuplicate(n(postedAt = 50_000L, key = "b"), 50_000L))
        assertTrue(d.isDuplicate(n(postedAt = 100_000L, key = "c"), 100_000L))
    }

    @Test
    fun sameContentAfterWindowIsNewPayment() {
        val d = Deduper(windowMs = 60_000L)
        assertFalse(d.isDuplicate(n(key = "k1", postedAt = 0L), 0L))
        assertFalse(d.isDuplicate(n(key = "k2", postedAt = 60_001L), 60_001L))
    }

    @Test
    fun differentContentIsNotDuplicate() {
        val d = Deduper()
        assertFalse(d.isDuplicate(n(key = "k1", text = "Rp 10.001 diterima"), 1_000L))
        assertFalse(d.isDuplicate(n(key = "k2", text = "Rp 10.002 diterima"), 1_000L))
        assertFalse(d.isDuplicate(n(key = "k3", pkg = "com.gojek.gopaymerchant"), 1_000L))
        assertFalse(d.isDuplicate(n(key = "k4", title = "GoPay Merchant"), 1_000L))
    }

    @Test
    fun fieldBoundariesAreNotConfused() {
        val d = Deduper()
        assertFalse(d.isDuplicate(CapturedNotification("com.a.b", "ab", "c Rp1", 0L, "x"), 0L))
        assertFalse(d.isDuplicate(CapturedNotification("com.a.b", "a", "bc Rp1", 0L, "y"), 0L))
    }

    @Test
    fun persistsAcrossInstancesSoReconnectDoesNotResend() {
        val file = File(tmp.root, "seen.txt")
        val first = Deduper(file)
        assertFalse(first.isDuplicate(n(key = "k1", postedAt = 1_000L), 1_000L))

        // Proses mati, listener tersambung lagi berjam-jam kemudian dan membaca notifikasi aktif yang sama.
        val second = Deduper(file)
        assertTrue(second.isDuplicate(n(key = "k1", postedAt = 1_000L), 5 * 3_600_000L))
        assertFalse(second.isDuplicate(n(key = "k9", postedAt = 5 * 3_600_000L, text = "Rp 77.001 diterima"), 5 * 3_600_000L))
        // Berkas hanya berisi hash, tidak ada isi notifikasi.
        assertFalse(file.readText().contains("10.001"))
        assertFalse(file.readText().contains("gopay"))
    }

    @Test
    fun forgetsKeysAfterRetention() {
        val d = Deduper(retentionMs = 1_000L, windowMs = 10L)
        assertFalse(d.isDuplicate(n(key = "k1", postedAt = 0L), 0L))
        assertFalse(d.isDuplicate(n(key = "k1", postedAt = 0L), 5_000L))
    }

    @Test
    fun boundedSize() {
        val d = Deduper(maxEntries = 10)
        for (i in 0 until 100) d.isDuplicate(n(key = "k$i", postedAt = i.toLong(), text = "Rp $i.001"), i.toLong())
        assertEquals(10, d.size())
    }

    @Test
    fun corruptFileIsIgnored() {
        val file = File(tmp.root, "seen.txt")
        file.writeText("ini bukan format\nk abc\nk abc bukanangka\n\n")
        val d = Deduper(file)
        assertFalse(d.isDuplicate(n(), 1_000L))
        assertTrue(Deduper(file).isDuplicate(n(), 2_000L))
    }
}
