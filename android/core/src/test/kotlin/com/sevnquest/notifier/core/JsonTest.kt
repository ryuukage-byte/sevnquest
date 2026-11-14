package com.sevnquest.notifier.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class JsonTest {
    @Test
    fun quoteEscapesSpecialCharacters() {
        assertEquals("\"a\\\"b\\\\c\\nd\\te\"", Json.quote("a\"b\\c\nd\te"))
        assertEquals("\"\\u0001\\u2028\"", Json.quote("\u0001\u2028"))
    }

    @Test
    fun objKeepsFieldOrderAndTypes() {
        val json = Json.obj(listOf("a" to "x", "b" to 12, "c" to 1700000000000L, "d" to null, "e" to true))
        assertEquals("{\"a\":\"x\",\"b\":12,\"c\":1700000000000,\"d\":null,\"e\":true}", json)
    }

    @Test
    fun outputIsAlwaysSingleLine() {
        val json = Json.obj(listOf("text" to "baris1\nbaris2\r\n\u2028akhir"))
        assertFalse(json.contains('\n'))
        assertFalse(json.contains('\r'))
        assertFalse(json.contains('\u2028'))
        assertEquals("baris1\nbaris2\r\n\u2028akhir", Json.parseObjectOrNull(json)!!["text"])
    }

    @Test
    fun roundTripsUnicodeAndEmoji() {
        val original = "Pembayaran \ud83d\udcb0 diterima \u00e9 \u65e5\u672c"
        val parsed = Json.parseObjectOrNull(Json.obj(listOf("t" to original)))!!
        assertEquals(original, parsed["t"])
    }

    @Test
    fun parsesServerResponse() {
        val o = Json.parseObjectOrNull(""" { "amount": 25001, "result": "approved", "order_code": "SQ-ABC123" } """)!!
        assertEquals(25001L, o.longOrNull("amount"))
        assertEquals("approved", o.stringOrNull("result"))
        assertEquals("SQ-ABC123", o.stringOrNull("order_code"))
    }

    @Test
    fun parsesNullNestedAndNumbers() {
        val o = Json.parseObjectOrNull("""{"amount":null,"n":-3,"f":1.5,"e":2e3,"arr":[1,"a",{"k":false}],"s":"a\/bA"}""")!!
        assertNull(o["amount"])
        assertNull(o.longOrNull("amount"))
        assertEquals(-3L, o.longOrNull("n"))
        assertNull(o.longOrNull("f"))
        assertEquals(2000L, o.longOrNull("e"))
        assertEquals(listOf(1L, "a", mapOf("k" to false)), o["arr"])
        assertEquals("a/bA", o["s"])
        assertNull(o.stringOrNull("n"))
    }

    @Test
    fun rejectsInvalidJson() {
        for (bad in listOf("", "{", "{\"a\":}", "{\"a\":1,}", "[1,2", "{\"a\":1} x", "<html>", "{'a':1}", "\"abc", "{\"a\":tru}", "nul")) {
            assertNull("harus ditolak: $bad", Json.parseObjectOrNull(bad))
        }
        assertNull(Json.parseObjectOrNull(null))
        assertNull("array bukan objek", Json.parseObjectOrNull("[1]"))
    }

    @Test
    fun rejectsDeeplyNestedInput() {
        val deep = "[".repeat(1000) + "]".repeat(1000)
        assertNull(Json.parseObjectOrNull("{\"a\":$deep}"))
    }

    @Test
    fun emptyContainers() {
        assertTrue(Json.parseObjectOrNull("{}")!!.isEmpty())
        assertEquals(emptyList<Any?>(), Json.parseObjectOrNull("{\"a\":[]}")!!["a"])
    }
}
