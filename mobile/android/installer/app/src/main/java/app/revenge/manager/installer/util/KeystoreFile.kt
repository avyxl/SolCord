package app.revenge.manager.installer.util

import java.io.ByteArrayOutputStream
import java.io.File
import java.io.OutputStream

/** A keystore provider may close its output. Keep it away from the descriptor we must sync before committing. */
internal fun persistNewKeystore(out: File, encode: (OutputStream) -> Unit) {
    check(!out.exists()) { "A signing key already exists; it must not be replaced" }
    val bytes = ByteArrayOutputStream().use { buffer ->
        encode(buffer)
        buffer.toByteArray()
    }
    val staged = File.createTempFile("solcord-signing-", ".tmp", out.absoluteFile.parentFile)
    try {
        staged.outputStream().use { stream ->
            stream.write(bytes)
            stream.flush()
            stream.fd.sync()
        }
        check(!out.exists() && staged.renameTo(out)) { "Unable to save the signing key" }
    } finally {
        bytes.fill(0)
        staged.delete()
    }
}
