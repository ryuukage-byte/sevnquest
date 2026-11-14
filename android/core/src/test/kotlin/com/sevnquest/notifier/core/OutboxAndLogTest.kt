package com.sevnquest.notifier.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class OutboxAndLogTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private val hour = 3_600_000L

    private fun item(id: String, postedAt: Long = 0L, text: String = "Rp 10.001 diterima", nextAttemptAt: Long = 0L) =
        QueueItem(id, "GoPay", text, "com.gojek.gopay", postedAt, postedAt, 0, nextAttemptAt)

    @Test
    fun queueItemJsonRoundTrip() {
        val original = QueueItem("id-1", "Judul \"kutip\"", "baris1\nbaris2 Rp 1.000", "com.gojek.gopay", 123L, 456L, 3, 789L)
        val line = original.toJson()
        assertFalse(line.contains('\n'))
        assertEquals(original, QueueItem.fromJson(line))
    }

    @Test
    fun queueItemRejectsBrokenLines() {
        assertNull(QueueItem.fromJson("bukan json"))
        assertNull(QueueItem.fromJson("{\"id\":\"x\"}"))
        assertNull(QueueItem.fromJson("{\"id\":1,\"package\":\"a.b\",\"posted_at\":1,\"enqueued_at\":1}"))
    }

    @Test
    fun survivesProcessRestart() {
        val file = File(tmp.root, "outbox.jsonl")
        val first = Outbox(file)
        first.add(item("a", postedAt = 10L), 10L)
        first.add(item("b", postedAt = 20L, text = "multi\nbaris Rp 5.000"), 20L)
        first.markFailedAttempt("a", 99_000L)

        val second = Outbox(file)
        assertEquals(2, second.size())
        val a = second.all().first { it.id == "a" }
        assertEquals(1, a.attempts)
        assertEquals(99_000L, a.nextAttemptAt)
        assertEquals("multi\nbaris Rp 5.000", second.all().first { it.id == "b" }.text)
    }

    @Test
    fun removePersists() {
        val file = File(tmp.root, "outbox.jsonl")
        val box = Outbox(file)
        box.add(item("a"), 0L)
        assertTrue(box.remove("a"))
        assertFalse(box.remove("a"))
        assertEquals(0, Outbox(file).size())
    }

    @Test
    fun dropsItemsOlderThan48Hours() {
        val box = Outbox(File(tmp.root, "outbox.jsonl"))
        box.add(item("old", postedAt = 0L), 0L)
        box.add(item("edge", postedAt = hour), hour)
        box.add(item("new", postedAt = 40 * hour), 40 * hour)
        assertEquals(3, box.size())

        // Tepat 48 jam masih disimpan; lewat sedikit dibuang.
        assertTrue(box.pruneExpired(48 * hour).isEmpty())
        val expired = box.pruneExpired(48 * hour + 1)
        assertEquals(listOf("old"), expired.map { it.id })
        assertEquals(listOf("edge", "new"), box.all().map { it.id })
    }

    @Test
    fun addAlsoPrunesExpired() {
        val box = Outbox(File(tmp.root, "outbox.jsonl"))
        box.add(item("old", postedAt = 0L), 0L)
        val dropped = box.add(item("new", postedAt = 49 * hour), 49 * hour)
        assertEquals(1, dropped)
        assertEquals(listOf("new"), box.all().map { it.id })
    }

    @Test
    fun capsQueueSizeDroppingOldestFirst() {
        val file = File(tmp.root, "outbox.jsonl")
        val box = Outbox(file, maxSize = 3)
        var dropped = 0
        for (i in 1..5) dropped += box.add(item("i$i", postedAt = i.toLong()), i.toLong())
        assertEquals(2, dropped)
        assertEquals(listOf("i3", "i4", "i5"), box.all().map { it.id })
        assertEquals(listOf("i3", "i4", "i5"), Outbox(file, maxSize = 3).all().map { it.id })
    }

    @Test
    fun defaultLimitsMatchRequirements() {
        assertEquals(48L * 60 * 60 * 1000, Limits.MAX_AGE_MS)
        assertEquals(50, Limits.MAX_LOG)
        assertTrue(Limits.MAX_QUEUE in 50..1000)
    }

    @Test
    fun dueRespectsNextAttemptAndOrdersByPostTime() {
        val box = Outbox(File(tmp.root, "outbox.jsonl"))
        box.add(item("late", postedAt = 30L), 30L)
        box.add(item("early", postedAt = 10L), 30L)
        box.add(item("waiting", postedAt = 5L, nextAttemptAt = 1_000L), 30L)
        assertEquals(listOf("early", "late"), box.due(100L).map { it.id })
        assertEquals(listOf("waiting", "early", "late"), box.due(1_000L).map { it.id })
        assertEquals(0L, box.earliestAttemptAt())
    }

    @Test
    fun deferAllAndMakeAllDue() {
        val box = Outbox(File(tmp.root, "outbox.jsonl"))
        box.add(item("a"), 0L)
        box.add(item("b", nextAttemptAt = 9_000L), 0L)
        box.deferAll(5_000L)
        assertEquals(5_000L, box.all().first { it.id == "a" }.nextAttemptAt)
        assertEquals(9_000L, box.all().first { it.id == "b" }.nextAttemptAt)
        assertEquals(0, box.all().sumOf { it.attempts })
        assertEquals(5_000L, box.earliestAttemptAt())
        box.makeAllDue()
        assertEquals(2, box.due(0L).size)
    }

    @Test
    fun emptyQueueHasNoEarliestAttempt() {
        assertNull(Outbox(File(tmp.root, "none.jsonl")).earliestAttemptAt())
    }

    @Test
    fun corruptLinesAreSkipped() {
        val file = File(tmp.root, "outbox.jsonl")
        file.writeText("rusak\n" + item("ok").toJson() + "\n{\"setengah\":\n")
        assertEquals(listOf("ok"), Outbox(file).all().map { it.id })
    }

    @Test
    fun noTempFileLeftBehind() {
        val file = File(tmp.root, "outbox.jsonl")
        Outbox(file).add(item("a"), 0L)
        assertEquals(listOf("outbox.jsonl"), tmp.root.list()!!.toList())
    }

    @Test
    fun logKeepsNewestFiftyAndPersists() {
        val file = File(tmp.root, "log.jsonl")
        val log = EventLog(file)
        for (i in 1..60) log.add(LogEntry(i.toLong(), "com.gojek.gopay", 10_000 + i, LogResult.UNMATCHED))
        assertEquals(50, log.entries().size)
        assertEquals(60L, log.entries().first().time)
        assertEquals(11L, log.entries().last().time)

        val reloaded = EventLog(file)
        assertEquals(log.entries(), reloaded.entries())
        reloaded.clear()
        assertTrue(EventLog(file).entries().isEmpty())
    }

    @Test
    fun logEntryRoundTripWithOptionalFields() {
        val full = LogEntry(5L, "com.gojek.gopaymerchant", 25001, LogResult.APPROVED, "SQ-ABC123", "x")
        assertEquals(full, LogEntry.fromJson(full.toJson()))
        val minimal = LogEntry(6L, "com.gojek.gopay", null, LogResult.NO_AMOUNT)
        assertEquals(minimal, LogEntry.fromJson(minimal.toJson()))
        assertNotNull(LogEntry.fromJson("{\"time\":1,\"package\":\"a.b\",\"result\":\"retry\"}"))
        assertNull(LogEntry.fromJson("{\"time\":1}"))
    }
}
