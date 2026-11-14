package com.sevnquest.notifier.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.URLEncoder

class SetupLinkTest {
    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8").replace("+", "%20")

    private fun link(url: String, key: String) = "sevnquest-notifier://setup?url=${enc(url)}&key=${enc(key)}"

    private fun errorOf(link: String?): SetupError = (SetupLink.parse(link) as SetupResult.Invalid).error

    @Test
    fun parsesValidLink() {
        val r = SetupLink.parse(link("https://sevnquest.com/api/payment-notify", "sqk_AbC123-xyz")) as SetupResult.Valid
        assertEquals("https://sevnquest.com/api/payment-notify", r.config.endpoint)
        assertEquals("sqk_AbC123-xyz", r.config.key)
        assertEquals("sevnquest.com", r.host)
    }

    @Test
    fun parsesLiteralExample() {
        val r = SetupLink.parse("sevnquest-notifier://setup?url=https%3A%2F%2FApp.Example.id%3A8443%2Fapi%2Fpayment-notify%3Fa%3D1%26b%3D2&key=abc%2B%2F%3D123") as SetupResult.Valid
        assertEquals("https://App.Example.id:8443/api/payment-notify?a=1&b=2", r.config.endpoint)
        assertEquals("abc+/=123", r.config.key)
        assertEquals("app.example.id", r.host)
    }

    @Test
    fun parameterOrderAndExtrasDoNotMatter() {
        val r = SetupLink.parse("sevnquest-notifier://setup/?foo=1&key=k123&url=https%3A%2F%2Fa.example%2Fx#frag") as SetupResult.Valid
        assertEquals("https://a.example/x", r.config.endpoint)
        assertEquals("k123", r.config.key)
    }

    @Test
    fun unencodedPlusInKeyIsKept() {
        val r = SetupLink.parse("sevnquest-notifier://setup?url=https%3A%2F%2Fa.example%2Fx&key=a+b") as SetupResult.Valid
        assertEquals("a+b", r.config.key)
    }

    @Test
    fun firstDuplicateParameterWins() {
        val r = SetupLink.parse("sevnquest-notifier://setup?url=https%3A%2F%2Fgood.example%2Fx&key=k1&url=https%3A%2F%2Fevil.example%2Fx") as SetupResult.Valid
        assertEquals("good.example", r.host)
    }

    @Test
    fun rejectsNonHttps() {
        assertEquals(SetupError.URL_NOT_HTTPS, errorOf(link("http://sevnquest.com/api/payment-notify", "k")))
        assertEquals(SetupError.URL_NOT_HTTPS, errorOf(link("ftp://sevnquest.com/x", "k")))
        assertEquals(SetupError.URL_NOT_HTTPS, errorOf(link("javascript://sevnquest.com/x", "k")))
        assertEquals(SetupError.URL_INVALID, errorOf(link("sevnquest.com/api/payment-notify", "k")))
        assertEquals(SetupError.URL_INVALID, errorOf(link("https://", "k")))
        assertEquals(SetupError.URL_INVALID, errorOf(link("https:///path", "k")))
    }

    @Test
    fun rejectsDeceptiveUrls() {
        assertEquals(SetupError.URL_INVALID, errorOf(link("https://sevnquest.com@evil.example/api", "k")))
        assertEquals(SetupError.URL_INVALID, errorOf(link("https://user:pw@evil.example/api", "k")))
        assertEquals(SetupError.URL_INVALID, errorOf(link("https://evil.example\\@sevnquest.com/api", "k")))
        assertEquals(SetupError.URL_INVALID, errorOf(link("https://sevnquest.com /api", "k")))
        assertEquals(SetupError.URL_INVALID, errorOf(link("https://a.example/x\nHost: b", "k")))
        assertEquals(SetupError.URL_INVALID, errorOf(link("https://a.example/" + "x".repeat(3000), "k")))
    }

    @Test
    fun hostShownIsTheRealHost() {
        val r = SetupLink.parse(link("https://sevnquest.com.evil.example/api/payment-notify", "k1")) as SetupResult.Valid
        assertEquals("sevnquest.com.evil.example", r.host)
    }

    @Test
    fun rejectsMissingParts() {
        assertEquals(SetupError.MISSING_URL, errorOf("sevnquest-notifier://setup"))
        assertEquals(SetupError.MISSING_URL, errorOf("sevnquest-notifier://setup?key=abc"))
        assertEquals(SetupError.MISSING_URL, errorOf("sevnquest-notifier://setup?url=&key=abc"))
        assertEquals(SetupError.MISSING_KEY, errorOf("sevnquest-notifier://setup?url=https%3A%2F%2Fa.example%2Fx"))
        assertEquals(SetupError.MISSING_KEY, errorOf("sevnquest-notifier://setup?url=https%3A%2F%2Fa.example%2Fx&key=%20"))
    }

    @Test
    fun rejectsOtherLinks() {
        assertEquals(SetupError.NOT_A_SETUP_LINK, errorOf(null))
        assertEquals(SetupError.NOT_A_SETUP_LINK, errorOf(""))
        assertEquals(SetupError.NOT_A_SETUP_LINK, errorOf("https://sevnquest.com/setup?url=x&key=y"))
        assertEquals(SetupError.NOT_A_SETUP_LINK, errorOf("sevnquest-notifier://other?url=x&key=y"))
        assertEquals(SetupError.NOT_A_SETUP_LINK, errorOf("sevnquest-notifier://setupx?url=https%3A%2F%2Fa.example&key=y"))
        assertEquals(SetupError.NOT_A_SETUP_LINK, errorOf("sevnquest-notifier://setup.evil?url=https%3A%2F%2Fa.example&key=y"))
        assertEquals(SetupError.NOT_A_SETUP_LINK, errorOf("sevnquest-notifier://setup/deeper?url=https%3A%2F%2Fa.example&key=y"))
        assertEquals(SetupError.NOT_A_SETUP_LINK, errorOf("sevnquest-notifier:setup?url=x&key=y"))
    }

    @Test
    fun schemeAndHostAreCaseInsensitive() {
        assertTrue(SetupLink.parse("SevnQuest-Notifier://SETUP?url=https%3A%2F%2Fa.example%2Fx&key=k") is SetupResult.Valid)
    }

    @Test
    fun rejectsKeysThatCannotBeAHeaderValue() {
        assertEquals(SetupError.KEY_INVALID, errorOf(link("https://a.example/x", "abc def")))
        assertEquals(SetupError.KEY_INVALID, errorOf(link("https://a.example/x", "abc\r\nX-Evil: 1")))
        assertEquals(SetupError.KEY_INVALID, errorOf(link("https://a.example/x", "kunci\u00e9")))
        assertEquals(SetupError.KEY_INVALID, errorOf(link("https://a.example/x", "k".repeat(600))))
        assertFalse(SetupLink.isValidKey(""))
        assertTrue(SetupLink.isValidKey("A-Za-z0-9_.~+/=!"))
    }

    @Test
    fun malformedPercentEncodingDoesNotCrash() {
        assertEquals(SetupError.MISSING_URL, errorOf("sevnquest-notifier://setup?url=%E0%A4%A&key=abc"))
        assertEquals(SetupError.MISSING_KEY, errorOf("sevnquest-notifier://setup?url=https%3A%2F%2Fa.example&key=%ZZ"))
    }

    @Test
    fun manualEntryUsesSameValidation() {
        val ok = SetupLink.validate("  https://sevnquest.com/api/payment-notify  ", " kunci123 ") as SetupResult.Valid
        assertEquals("https://sevnquest.com/api/payment-notify", ok.config.endpoint)
        assertEquals("kunci123", ok.config.key)
        assertEquals(SetupError.URL_NOT_HTTPS, (SetupLink.validate("http://sevnquest.com/x", "k") as SetupResult.Invalid).error)
        assertEquals(SetupError.MISSING_URL, (SetupLink.validate("", "k") as SetupResult.Invalid).error)
        assertEquals(SetupError.MISSING_KEY, (SetupLink.validate("https://a.example", null) as SetupResult.Invalid).error)
    }

    @Test
    fun maskHidesKey() {
        assertEquals("", Secrets.mask(null))
        assertEquals("", Secrets.mask(""))
        val short = Secrets.mask("rahasia")
        assertFalse(short.contains("r") || short.contains("a"))
        val long = Secrets.mask("sqk_1234567890abcdWXYZ")
        assertTrue(long.endsWith("WXYZ"))
        assertFalse(long.contains("sqk_"))
        assertFalse(long.contains("1234567890"))
    }
}
