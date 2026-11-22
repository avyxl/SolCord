// Copyright (c) 2026 avyxl
package app.revenge.manager.installer.util

import java.io.File
import java.security.MessageDigest

/** The APK-signed installer pins its own built-in module. Network releases use SignedRelease separately. */
fun verifyBundledLoader(file: File, expectedSha256: String): String {
    require(expectedSha256.matches(Regex("[a-f0-9]{64}"))) { "Invalid built-in loader checksum" }
    require(file.isFile && file.length() in 1..(32L * 1024 * 1024)) { "Built-in loader is missing or oversized" }
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
        val buffer = ByteArray(64 * 1024)
        while (true) { val count = input.read(buffer); if (count < 0) break; digest.update(buffer, 0, count) }
    }
    val hash = digest.digest().joinToString("") { "%02x".format(it) }
    check(hash == expectedSha256) { "Built-in Solcord loader failed its checksum" }
    return hash
}
