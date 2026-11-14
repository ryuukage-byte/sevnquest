package com.sevnquest.notifier.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProtocolTest {
    @Test
    fun bodyMatchesContractExactly() {
        val body = Protocol.buildBody("Pembayaran diterima", "Rp 25.001 di Sevnsoul Store", "com.gojek.gopaymerchant", 1794670000123L)
        assertEquals(
            "{\"title\":\"Pembayaran diterima\",\"text\":\"Rp 25.001 di Sevnsoul Store\"," +
                "\"package\":\"com.gojek.gopaymerchant\",\"posted_at\":1794670000123}",
            body,
        )
    }

    @Test
    fun bodyIsValidJsonWithSpecialCharacters() {
        val body = Protocol.buildBody("Judul \"A\" & <B>", "baris1\nbaris2\t\\ Rp1.000", "com.gojek.gopay", 5L)
        val o = Json.parseObjectOrNull(body)!!
        assertEquals(setOf("title", "text", "package", "posted_at"), o.keys)
        assertEquals("Judul \"A\" & <B>", o["title"])
        assertEquals("baris1\nbaris2\t\\ Rp1.000", o["text"])
        assertEquals(5L, o["posted_at"])
    }

    @Test
    fun bodyTruncatesVeryLongFields() {
        val o = Json.parseObjectOrNull(Protocol.buildBody("t".repeat(5000), "x".repeat(5000), "a.b", 1L))!!
        assertEquals(Limits.MAX_TITLE_CHARS, (o["title"] as String).length)
        assertEquals(Limits.MAX_TEXT_CHARS, (o["text"] as String).length)
    }

    @Test
    fun testMessageHasNoAmount() {
        assertEquals("Tes koneksi SevnQuest Notifier", Protocol.TEST_TEXT)
        assertTrue(!Rupiah.containsAmount(Protocol.TEST_TITLE + " " + Protocol.TEST_TEXT))
    }

    @Test
    fun interpretsSuccessResults() {
        assertEquals(
            SendOutcome.Delivered("approved", 25001, "SQ-ABC123"),
            Protocol.interpret(200, "{\"amount\":25001,\"result\":\"approved\",\"order_code\":\"SQ-ABC123\"}"),
        )
        assertEquals(SendOutcome.Delivered("unmatched", 25001, null), Protocol.interpret(200, "{\"amount\":25001,\"result\":\"unmatched\"}"))
        assertEquals(SendOutcome.Delivered("ambiguous", 5000, null), Protocol.interpret(200, "{\"amount\":5000,\"result\":\"ambiguous\"}"))
        assertEquals(SendOutcome.Delivered("no_amount", null, null), Protocol.interpret(200, "{\"amount\":null,\"result\":\"no_amount\"}\n"))
        assertEquals(SendOutcome.Delivered("no_amount", null, null), Protocol.interpret(200, "{\"result\":\"no_amount\"}"))
    }

    @Test
    fun unauthorizedIsNeverRetried() {
        assertEquals(SendOutcome.AuthFailed("invalid_key"), Protocol.interpret(401, "{\"error\":\"invalid_key\"}"))
        assertEquals(SendOutcome.AuthFailed("missing_key"), Protocol.interpret(401, "{\"error\":\"missing_key\"}"))
        assertEquals(SendOutcome.AuthFailed("invalid_key"), Protocol.interpret(401, ""))
        assertEquals(SendOutcome.AuthFailed("invalid_key"), Protocol.interpret(401, "<html>Unauthorized</html>"))
    }

    @Test
    fun rateLimitAndServerErrorsAreRetried() {
        assertEquals(SendOutcome.Retry(RetryReason.RATE_LIMITED, 429), Protocol.interpret(429, "{\"error\":\"rate_limited\"}"))
        assertEquals(SendOutcome.Retry(RetryReason.SERVER_ERROR, 502), Protocol.interpret(502, "{\"error\":\"upstream_error\"}"))
        assertEquals(SendOutcome.Retry(RetryReason.SERVER_ERROR, 500), Protocol.interpret(500, null))
        assertEquals(SendOutcome.Retry(RetryReason.SERVER_ERROR, 503), Protocol.interpret(503, "Service Unavailable"))
        assertEquals(SendOutcome.Retry(RetryReason.SERVER_ERROR, 599), Protocol.interpret(599, ""))
    }

    @Test
    fun successWithoutKnownResultIsNotTreatedAsDelivered() {
        // Mis. URL salah yang mengembalikan halaman HTML dengan status 200.
        assertEquals(SendOutcome.Retry(RetryReason.BAD_RESPONSE, 200), Protocol.interpret(200, "<!doctype html><html></html>"))
        assertEquals(SendOutcome.Retry(RetryReason.BAD_RESPONSE, 200), Protocol.interpret(200, ""))
        assertEquals(SendOutcome.Retry(RetryReason.BAD_RESPONSE, 200), Protocol.interpret(200, "{}"))
        assertEquals(SendOutcome.Retry(RetryReason.BAD_RESPONSE, 200), Protocol.interpret(200, "{\"result\":\"ok\"}"))
        assertEquals(SendOutcome.Retry(RetryReason.BAD_RESPONSE, 204), Protocol.interpret(204, null))
    }

    @Test
    fun otherStatuses() {
        assertEquals(SendOutcome.Rejected(400), Protocol.interpret(400, "{}"))
        assertEquals(SendOutcome.Rejected(413), Protocol.interpret(413, ""))
        assertEquals(SendOutcome.Retry(RetryReason.UNEXPECTED_STATUS, 404), Protocol.interpret(404, "Not found"))
        assertEquals(SendOutcome.Retry(RetryReason.UNEXPECTED_STATUS, 405), Protocol.interpret(405, "{\"error\":\"method_not_allowed\"}"))
        assertEquals(SendOutcome.Retry(RetryReason.UNEXPECTED_STATUS, 301), Protocol.interpret(301, ""))
        assertEquals(SendOutcome.Retry(RetryReason.UNEXPECTED_STATUS, 403), Protocol.interpret(403, ""))
    }

    @Test
    fun backoffGrowsExponentiallyAndIsCapped() {
        assertEquals(15_000L, RetryPolicy.delayMs(0))
        assertEquals(15_000L, RetryPolicy.delayMs(1))
        assertEquals(30_000L, RetryPolicy.delayMs(2))
        assertEquals(60_000L, RetryPolicy.delayMs(3))
        assertEquals(120_000L, RetryPolicy.delayMs(4))
        assertEquals(30 * 60_000L, RetryPolicy.delayMs(8))
        assertEquals(30 * 60_000L, RetryPolicy.delayMs(20))
        assertEquals(30 * 60_000L, RetryPolicy.delayMs(1000))
        assertEquals(30 * 60_000L, RetryPolicy.delayMs(Int.MAX_VALUE))
        var previous = 0L
        for (attempt in 1..40) {
            val d = RetryPolicy.delayMs(attempt)
            assertTrue(d >= previous && d in 1..RetryPolicy.MAX_DELAY_MS)
            previous = d
        }
    }
}
