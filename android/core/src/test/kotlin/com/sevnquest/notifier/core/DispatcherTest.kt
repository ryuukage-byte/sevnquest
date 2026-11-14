package com.sevnquest.notifier.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.io.IOException

class DispatcherTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private class FakeState(var cfg: ServerConfig? = ServerConfig("https://sevnquest.example/api/payment-notify", "kunci-1")) : DispatchState {
        override fun config() = cfg
        override var authBlocked = false
    }

    private class FakeTransport : Transport {
        data class Call(val url: String, val key: String, val body: String)

        val calls = ArrayList<Call>()
        /** Antrean jawaban; null = galat jaringan. Bila habis memakai [fallback]. */
        val script = ArrayList<HttpResult?>()
        var fallback: HttpResult? = HttpResult(200, "{\"amount\":null,\"result\":\"unmatched\"}")

        override fun post(url: String, key: String, body: String): HttpResult {
            calls.add(Call(url, key, body))
            val next = if (script.isNotEmpty()) script.removeAt(0) else fallback
            return next ?: throw IOException("offline")
        }
    }

    private val hour = 3_600_000L
    private var now = 1_000_000L
    private var nextId = 0
    private lateinit var state: FakeState
    private lateinit var transport: FakeTransport
    private lateinit var outbox: Outbox
    private lateinit var log: EventLog
    private lateinit var dispatcher: Dispatcher
    private val monitored = Packages.DEFAULT

    @Before
    fun setUp() {
        state = FakeState()
        transport = FakeTransport()
        outbox = Outbox(File(tmp.root, "outbox.jsonl"))
        log = EventLog(File(tmp.root, "log.jsonl"))
        dispatcher = newDispatcher()
    }

    private fun newDispatcher() = Dispatcher(
        outbox, log, Deduper(File(tmp.root, "seen.txt")), transport, state,
        clock = { now }, idGenerator = { "id-" + (++nextId) },
    )

    private fun payment(amount: String = "25.001", key: String = "key-$amount", postedAt: Long = now, pkg: String = "com.gojek.gopaymerchant") =
        CapturedNotification(pkg, "Pembayaran diterima", "Rp $amount di Sevnsoul Store", postedAt, key)

    private fun approved(amount: Int, code: String) = HttpResult(200, "{\"amount\":$amount,\"result\":\"approved\",\"order_code\":\"$code\"}")

    @Test
    fun happyPathSendsExactContractAndLogsResult() {
        transport.script.add(approved(25001, "SQ-ABC123"))
        assertEquals(Dispatcher.Accept.QUEUED, dispatcher.accept(payment(), monitored, true))
        assertEquals(1, outbox.size())

        val r = dispatcher.drain()
        assertEquals(DrainResult(1, 0, null, false), r)
        val call = transport.calls.single()
        assertEquals("https://sevnquest.example/api/payment-notify", call.url)
        assertEquals("kunci-1", call.key)
        assertEquals(
            "{\"title\":\"Pembayaran diterima\",\"text\":\"Rp 25.001 di Sevnsoul Store\",\"package\":\"com.gojek.gopaymerchant\",\"posted_at\":1000000}",
            call.body,
        )
        val entry = log.entries().single()
        assertEquals(LogEntry(now, "com.gojek.gopaymerchant", 25001, "approved", "SQ-ABC123"), entry)
    }

    @Test
    fun otherAppsAreNeverQueuedOrSent() {
        assertEquals(Dispatcher.Accept.FILTERED, dispatcher.accept(payment(pkg = "com.whatsapp"), monitored, true))
        assertEquals(Dispatcher.Accept.FILTERED, dispatcher.accept(payment(pkg = "id.bank.lain"), monitored, true))
        dispatcher.drain()
        assertEquals(0, outbox.size())
        assertTrue(transport.calls.isEmpty())
        assertTrue(log.entries().isEmpty())
    }

    @Test
    fun filteredWhenDisabledOrWithoutAmountOrSummary() {
        assertEquals(Dispatcher.Accept.FILTERED, dispatcher.accept(payment(), monitored, false))
        val promo = CapturedNotification("com.gojek.gopay", "Promo", "Diskon besar", now, "p1")
        assertEquals(Dispatcher.Accept.FILTERED, dispatcher.accept(promo, monitored, true))
        assertEquals(Dispatcher.Accept.FILTERED, dispatcher.accept(payment().copy(isGroupSummary = true), monitored, true))
        assertEquals(Dispatcher.Accept.FILTERED, dispatcher.accept(payment().copy(isOngoing = true), monitored, true))
        assertEquals(0, outbox.size())
    }

    @Test
    fun notQueuedWhenNotConfigured() {
        state.cfg = null
        assertEquals(Dispatcher.Accept.NOT_CONFIGURED, dispatcher.accept(payment(), monitored, true))
        assertEquals(0, outbox.size())
        assertEquals(DrainResult(0, 0, null, false), dispatcher.drain())
    }

    @Test
    fun repeatedCallbacksForSameNotificationSendOnce() {
        val n = payment()
        assertEquals(Dispatcher.Accept.QUEUED, dispatcher.accept(n, monitored, true))
        assertEquals(Dispatcher.Accept.DUPLICATE, dispatcher.accept(n, monitored, true))
        assertEquals(Dispatcher.Accept.DUPLICATE, dispatcher.accept(n.copy(postedAt = n.postedAt + 2_000), monitored, true))
        dispatcher.drain()
        assertEquals(1, transport.calls.size)
    }

    @Test
    fun reconnectAfterRestartDoesNotResendActiveNotifications() {
        val n = payment()
        dispatcher.accept(n, monitored, true)
        dispatcher.drain()
        now += 6 * hour
        val afterRestart = newDispatcher()
        assertEquals(Dispatcher.Accept.DUPLICATE, afterRestart.accept(n, monitored, true))
        afterRestart.drain()
        assertEquals(1, transport.calls.size)
    }

    @Test
    fun notificationsOlderThan48HoursAreIgnored() {
        assertEquals(Dispatcher.Accept.TOO_OLD, dispatcher.accept(payment(postedAt = now - 48 * hour - 1), monitored, true))
        assertEquals(0, outbox.size())
    }

    @Test
    fun networkErrorKeepsItemAndBacksOff() {
        transport.fallback = null
        dispatcher.accept(payment(), monitored, true)

        var r = dispatcher.drain()
        assertEquals(DrainResult(0, 1, now + 15_000L, false), r)
        assertEquals(1, outbox.all().single().attempts)
        assertEquals("retry", log.entries().single().result)
        assertEquals("network", log.entries().single().detail)

        // Belum waktunya: tidak ada panggilan jaringan baru.
        now += 10_000L
        r = dispatcher.drain()
        assertEquals(1, transport.calls.size)
        assertEquals(1, r.remaining)

        // Percobaan kedua gagal lagi: jeda berlipat, log tidak bertambah.
        now += 5_000L
        r = dispatcher.drain()
        assertEquals(2, transport.calls.size)
        assertEquals(now + 30_000L, r.nextAttemptAt)
        assertEquals(1, log.entries().size)

        // Jaringan pulih.
        transport.fallback = approved(25001, "SQ-ZZZ999")
        now += 30_000L
        r = dispatcher.drain()
        assertEquals(DrainResult(1, 0, null, false), r)
        assertEquals("approved", log.entries().first().result)
    }

    @Test
    fun failureDefersWholeQueueWithoutBurningAttempts() {
        transport.fallback = HttpResult(503, "")
        dispatcher.accept(payment("10.001"), monitored, true)
        now += 1
        dispatcher.accept(payment("10.002"), monitored, true)
        now += 1
        dispatcher.accept(payment("10.003"), monitored, true)

        val r = dispatcher.drain()
        assertEquals(1, transport.calls.size)
        assertEquals(3, r.remaining)
        assertEquals(now + 15_000L, r.nextAttemptAt)
        assertEquals(listOf(1, 0, 0), outbox.all().map { it.attempts })
        assertTrue(outbox.due(now + 14_999L).isEmpty())
        assertEquals("http_503", log.entries().single().detail)

        transport.fallback = HttpResult(200, "{\"amount\":1,\"result\":\"unmatched\"}")
        now += 15_000L
        assertEquals(DrainResult(3, 0, null, false), dispatcher.drain())
        // Urutan kirim mengikuti waktu posting.
        assertTrue(transport.calls[1].body.contains("10.001"))
        assertTrue(transport.calls[2].body.contains("10.002"))
        assertTrue(transport.calls[3].body.contains("10.003"))
    }

    @Test
    fun rateLimitIsRetried() {
        transport.script.add(HttpResult(429, "{\"error\":\"rate_limited\"}"))
        dispatcher.accept(payment(), monitored, true)
        assertEquals(1, dispatcher.drain().remaining)
        assertEquals("http_429", log.entries().single().detail)
        now += 15_000L
        assertEquals(0, dispatcher.drain().remaining)
    }

    @Test
    fun invalidKeyStopsSendingWithoutRetryAndKeepsQueue() {
        transport.fallback = HttpResult(401, "{\"error\":\"invalid_key\"}")
        dispatcher.accept(payment("10.001"), monitored, true)
        now += 1
        dispatcher.accept(payment("10.002"), monitored, true)

        val r = dispatcher.drain()
        assertEquals(DrainResult(0, 2, null, true), r)
        assertTrue(state.authBlocked)
        assertEquals(1, transport.calls.size)
        assertEquals("auth_failed", log.entries().single().result)
        assertEquals("invalid_key", log.entries().single().detail)

        // Tidak ada percobaan ulang otomatis, berapa pun lamanya.
        now += hour
        assertEquals(DrainResult(0, 2, null, true), dispatcher.drain())
        assertEquals(1, transport.calls.size)
        // Notifikasi baru tetap ditampung selama kunci belum diperbaiki.
        now += 1
        assertEquals(Dispatcher.Accept.QUEUED, dispatcher.accept(payment("10.003"), monitored, true))
        assertEquals(1, transport.calls.size)

        // Pengguna memasang kunci baru: antrean dikirim dengan kunci baru.
        state.cfg = ServerConfig("https://sevnquest.example/api/payment-notify", "kunci-2")
        dispatcher.onConfigChanged()
        transport.fallback = HttpResult(200, "{\"amount\":1,\"result\":\"unmatched\"}")
        assertEquals(DrainResult(3, 0, null, false), dispatcher.drain())
        assertFalse(state.authBlocked)
        assertEquals("kunci-2", transport.calls.last().key)
    }

    @Test
    fun rejectedRequestIsDroppedAndOthersContinue() {
        transport.script.add(HttpResult(400, "{}"))
        dispatcher.accept(payment("10.001"), monitored, true)
        now += 1
        dispatcher.accept(payment("10.002"), monitored, true)
        val r = dispatcher.drain()
        assertEquals(DrainResult(1, 0, null, false), r)
        assertEquals(listOf("unmatched", "rejected"), log.entries().map { it.result })
    }

    @Test
    fun htmlPageWith200IsNotCountedAsDelivered() {
        transport.script.add(HttpResult(200, "<!doctype html><title>SevnQuest</title>"))
        dispatcher.accept(payment(), monitored, true)
        val r = dispatcher.drain()
        assertEquals(1, r.remaining)
        assertEquals("bad_response", log.entries().single().detail)
    }

    @Test
    fun expiredItemsAreDroppedAndLogged() {
        transport.fallback = null
        dispatcher.accept(payment(), monitored, true)
        dispatcher.drain()
        now += 48 * hour + 1
        val r = dispatcher.drain()
        assertEquals(DrainResult(0, 0, null, false), r)
        assertEquals(1, transport.calls.size)
        assertEquals("expired", log.entries().first().result)
        assertEquals(25001, log.entries().first().amount)
    }

    @Test
    fun queueSurvivesRestartAndIsSentLater() {
        transport.fallback = null
        dispatcher.accept(payment(), monitored, true)
        dispatcher.drain()

        // Proses mati; objek baru membaca berkas yang sama.
        outbox = Outbox(File(tmp.root, "outbox.jsonl"))
        log = EventLog(File(tmp.root, "log.jsonl"))
        dispatcher = newDispatcher()
        transport.fallback = approved(25001, "SQ-AAA111")
        now += 60_000L
        assertEquals(DrainResult(1, 0, null, false), dispatcher.drain())
        assertEquals(listOf("approved", "retry"), log.entries().map { it.result })
    }

    @Test
    fun logFallsBackToLocallyParsedAmount() {
        transport.script.add(HttpResult(200, "{\"amount\":null,\"result\":\"no_amount\"}"))
        dispatcher.accept(payment("7.500"), monitored, true)
        dispatcher.drain()
        assertEquals(7500, log.entries().single().amount)
        assertEquals("no_amount", log.entries().single().result)
    }

    @Test
    fun testSendUsesNoAmountTextAndVerifiesKey() {
        transport.script.add(HttpResult(200, "{\"amount\":null,\"result\":\"no_amount\"}"))
        val outcome = dispatcher.sendTest(state.cfg!!, "com.sevnquest.notifier")
        assertEquals(SendOutcome.Delivered("no_amount", null, null), outcome)
        val body = Json.parseObjectOrNull(transport.calls.single().body)!!
        assertEquals("Tes koneksi SevnQuest Notifier", body["text"])
        assertEquals("com.sevnquest.notifier", body["package"])
        assertEquals(now, body["posted_at"])
        assertNull(Rupiah.parseAmount(body["title"].toString() + " " + body["text"]))
        assertEquals("test", log.entries().single().detail)
    }

    @Test
    fun testSendWithBadKeyBlocksAndGoodKeyUnblocks() {
        dispatcher.accept(payment(), monitored, true)
        transport.script.add(HttpResult(401, "{\"error\":\"invalid_key\"}"))
        assertEquals(SendOutcome.AuthFailed("invalid_key"), dispatcher.sendTest(state.cfg!!, "com.sevnquest.notifier"))
        assertTrue(state.authBlocked)
        assertEquals(1, dispatcher.drain().remaining)
        assertEquals(1, transport.calls.size)

        transport.script.add(HttpResult(200, "{\"amount\":null,\"result\":\"no_amount\"}"))
        dispatcher.sendTest(state.cfg!!, "com.sevnquest.notifier")
        assertFalse(state.authBlocked)
        assertEquals(0, dispatcher.drain().remaining)
    }

    @Test
    fun testSendNetworkFailureIsReported() {
        transport.fallback = null
        assertEquals(SendOutcome.Retry(RetryReason.NETWORK), dispatcher.sendTest(state.cfg!!, "com.sevnquest.notifier"))
        assertFalse(state.authBlocked)
        assertEquals(0, outbox.size())
    }

    @Test
    fun overflowIsLogged() {
        outbox = Outbox(File(tmp.root, "small.jsonl"), maxSize = 2)
        dispatcher = newDispatcher()
        for (i in 1..3) {
            now += 1
            dispatcher.accept(payment("10.00$i"), monitored, true)
        }
        assertEquals(2, outbox.size())
        assertEquals("queue_full", log.entries().single().result)
    }

    @Test
    fun secretIsNeverWrittenToQueueOrLogFiles() {
        transport.script.add(HttpResult(401, "{\"error\":\"invalid_key\"}"))
        dispatcher.accept(payment(), monitored, true)
        dispatcher.drain()
        for (f in tmp.root.listFiles()!!) {
            assertFalse(f.name, f.readText().contains("kunci-1"))
        }
    }
}
