package app.revenge.manager.installer.util

import java.io.IOException
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

class KeystoreFileTest {
    @Test fun `a provider that closes its output still produces a committed key`() {
        val dir = Files.createTempDirectory("solcord-key-test").toFile()
        try {
            val out = dir.resolve("ks.keystore")
            val bytes = byteArrayOf(1, 7, 3, 9)
            persistNewKeystore(out) { providerOutput ->
                providerOutput.write(bytes)
                providerOutput.close()
            }
            assertContentEquals(bytes, out.readBytes())
            assertEquals(listOf(out.name), dir.listFiles()!!.map { it.name })
        } finally { dir.deleteRecursively() }
    }

    @Test fun `a serialization failure never commits a partial key`() {
        val dir = Files.createTempDirectory("solcord-key-test").toFile()
        try {
            val out = dir.resolve("ks.keystore")
            assertFailsWith<IOException> {
                persistNewKeystore(out) { stream ->
                    stream.write(1)
                    throw IOException("Test provider failure")
                }
            }
            assertFalse(out.exists())
            assertEquals(0, dir.listFiles()!!.size)
        } finally { dir.deleteRecursively() }
    }

    @Test fun `an existing signing identity is never replaced`() {
        val dir = Files.createTempDirectory("solcord-key-test").toFile()
        try {
            val out = dir.resolve("ks.keystore")
            val original = byteArrayOf(4, 2, 8)
            out.writeBytes(original)
            assertFailsWith<IllegalStateException> { persistNewKeystore(out) { it.write(0) } }
            assertContentEquals(original, out.readBytes())
        } finally { dir.deleteRecursively() }
    }
}
