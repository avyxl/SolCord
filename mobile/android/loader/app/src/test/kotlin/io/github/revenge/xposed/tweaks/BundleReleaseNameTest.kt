package io.github.revenge.xposed.tweaks

import io.github.revenge.xposed.tweaks.plugins.repos.sha256Hex
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class BundleReleaseNameTest {
    private val js = "the bundle".toByteArray()
    private val hbc = "the bytecode bundle".toByteArray()
    private val apk = "a signed loader APK".toByteArray()

    private fun entry(bytes: ByteArray, url: String? = null) =
        """{ "size": ${bytes.size}, "sha256": "${sha256Hex(bytes).uppercase()}"${url?.let { """, "url": "$it"""" } ?: ""} }"""

    private val release = assertNotNull(
        BundleRelease.ofVerifiedManifest(
            """
            {
              "format": 1,
              "sequence": 42,
              "commit": "abc",
              "files": {
                "solcord.min.js": ${entry(js, "https://example/abc/solcord.min.js")},
                "solcord.v96.hbc": ${entry(hbc)},
                "solcord-xposed.apk": ${entry(apk)}
              }
            }
            """.trimIndent().toByteArray()
        )
    )

    @Test
    fun `a file counts only as the file the release lists it as`() {
        assertTrue(release.lists("solcord.min.js", js))
        assertTrue(release.lists("solcord.v96.hbc", hbc))
        assertTrue(release.lists("solcord-xposed.apk", apk))

        // The loader's APK, or the other bundle, served in the bundle's place
        assertFalse(release.lists("solcord.min.js", apk))
        assertFalse(release.lists("solcord.min.js", hbc))
        assertFalse(release.lists("solcord.v96.hbc", js))
        assertFalse(release.lists("solcord.v94.hbc", hbc))
        assertFalse(release.lists("solcord.min.js", js + 0.toByte()))
    }

    @Test
    fun `what else a release says`() {
        assertEquals(42L, release.sequence)
        assertEquals("https://example/abc/solcord.min.js", release.pinnedUrlOf("solcord.min.js"))
        assertNull(release.pinnedUrlOf("solcord.v96.hbc"))
        assertNull(BundleRelease.ofVerifiedManifest("""{ "format": 2, "sequence": 1, "files": {} }""".toByteArray()))
        assertNull(BundleRelease.ofVerifiedManifest("not json".toByteArray()))
        // Without the key the loader is built with checked, nothing is taken
        assertNull(BundleRelease.parse("""{ "format": 1, "sequence": 1, "files": {} }""".toByteArray(), ByteArray(64)))
    }
}
