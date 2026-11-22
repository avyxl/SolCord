package app.revenge.manager.installer.util
import java.io.File
import java.security.MessageDigest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails
class BundledLoaderTest {
    @Test fun checksumAndTampering() {
        val file=File.createTempFile("solcord-loader-test-", ".apk")
        try {
            file.writeText("APK fixture")
            val hash=MessageDigest.getInstance("SHA-256").digest(file.readBytes()).joinToString("") { "%02x".format(it) }
            assertEquals(hash, verifyBundledLoader(file, hash))
            file.appendText("tampered")
            assertFails { verifyBundledLoader(file, hash) }
            assertFails { verifyBundledLoader(file, "invalid") }
            file.writeBytes(byteArrayOf())
            assertFails { verifyBundledLoader(file, hash) }
        } finally { file.delete() }
    }
}
