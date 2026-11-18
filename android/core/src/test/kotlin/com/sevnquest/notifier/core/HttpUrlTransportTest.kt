package com.sevnquest.notifier.core

import com.sun.net.httpserver.HttpServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.io.IOException
import java.net.InetSocketAddress

/** Menguji transport sungguhan terhadap server HTTP lokal. */
class HttpUrlTransportTest {
    private lateinit var server: HttpServer
    private var status = 200
    private var responseBody = "{\"amount\":null,\"result\":\"no_amount\"}"
    private var seenMethod: String? = null
    private var seenKey: String? = null
    private var seenContentType: String? = null
    private var seenBody: String? = null

    @Before
    fun start() {
        server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/api/payment-notify") { ex ->
            seenMethod = ex.requestMethod
            seenKey = ex.requestHeaders.getFirst("X-Webhook-Key")
            seenContentType = ex.requestHeaders.getFirst("Content-Type")
            seenBody = String(ex.requestBody.readBytes(), Charsets.UTF_8)
            val bytes = responseBody.toByteArray(Charsets.UTF_8)
            if (status in 300..399) ex.responseHeaders.add("Location", "http://127.0.0.1:1/elsewhere")
            ex.sendResponseHeaders(status, if (bytes.isEmpty()) -1 else bytes.size.toLong())
            if (bytes.isNotEmpty()) ex.responseBody.use { it.write(bytes) }
            ex.close()
        }
        server.start()
    }

    @After
    fun stop() {
        server.stop(0)
    }

    private fun url() = "http://127.0.0.1:${server.address.port}/api/payment-notify"

    @Test
    fun sendsPostWithHeadersAndUtf8Body() {
        val body = Protocol.buildBody("Pembayaran diterima", "Rp 25.001 \u2014 terima kasih", "com.gojek.gopaymerchant", 7L)
        val result = HttpUrlTransport().post(url(), "kunci-rahasia", body)
        assertEquals(200, result.status)
        assertEquals("POST", seenMethod)
        assertEquals("kunci-rahasia", seenKey)
        assertEquals("application/json", seenContentType)
        assertEquals(body, seenBody)
        assertEquals(SendOutcome.Delivered("no_amount", null, null), Protocol.interpret(result.status, result.body))
    }

    @Test
    fun readsErrorBodies() {
        status = 401
        responseBody = "{\"error\":\"invalid_key\"}"
        val result = HttpUrlTransport().post(url(), "salah", "{}")
        assertEquals(401, result.status)
        assertEquals(SendOutcome.AuthFailed("invalid_key"), Protocol.interpret(result.status, result.body))

        status = 429
        responseBody = "{\"error\":\"rate_limited\"}"
        assertEquals(429, HttpUrlTransport().post(url(), "k", "{}").status)

        status = 502
        responseBody = ""
        val bad = HttpUrlTransport().post(url(), "k", "{}")
        assertEquals(502, bad.status)
        assertEquals("", bad.body)
    }

    @Test
    fun doesNotFollowRedirects() {
        status = 302
        responseBody = ""
        val result = HttpUrlTransport().post(url(), "k", "{}")
        assertEquals(302, result.status)
        assertTrue(Protocol.interpret(result.status, result.body) is SendOutcome.Retry)
    }

    @Test
    fun connectionFailureThrowsIOException() {
        val deadPort = server.address.port
        server.stop(0)
        try {
            HttpUrlTransport(connectTimeoutMs = 2_000, readTimeoutMs = 2_000).post("http://127.0.0.1:$deadPort/api/payment-notify", "k", "{}")
            fail("seharusnya melempar IOException")
        } catch (expected: IOException) {
            // benar
        }
    }

    @Test
    fun invalidUrlThrowsIOException() {
        for (bad in listOf("bukan url", "file:///etc/hosts")) {
            try {
                HttpUrlTransport().post(bad, "k", "{}")
                fail("seharusnya melempar IOException untuk $bad")
            } catch (expected: IOException) {
                // benar
            }
        }
    }
}
