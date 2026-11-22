package app.revenge.manager.installer

import app.revenge.manager.installer.utils.ArscUtil.getMainArscChunk
import app.revenge.manager.installer.utils.ArscUtil.resourceFileNames
import app.revenge.manager.installer.utils.ArscUtil.retargetFileResource
import app.revenge.manager.installer.utils.AxmlUtil
import com.google.devrel.gmscore.tools.apk.arsc.BinaryResourceFile
import com.google.devrel.gmscore.tools.apk.arsc.BinaryResourceIdentifier
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File
import java.util.zip.ZipFile

class IconResourceTest {
    @Test fun imageReplacementKeepsResourceIdsAndSurvivesSerialization() {
        val fixture = System.getenv("SOLCORD_ICON_TEST_APK")?.let(::File)
        assumeTrue("Supply a compiled APK for the real resource-table fixture", fixture?.isFile == true)
        ZipFile(fixture!!).use { zip ->
            val data = zip.getInputStream(zip.getEntry("resources.arsc")).use { it.readBytes() }
            val arsc = BinaryResourceFile(data)
            val table = arsc.getMainArscChunk()
            val candidates = zip.entries().asSequence().filter { it.name.endsWith(".xml") }.toList()
                .sortedBy { if (it.name.contains("ic_launcher")) 0 else 1 }
            val foreground = candidates.asSequence().mapNotNull { entry ->
                runCatching { AxmlUtil.readAdaptiveIconReferences(zip.getInputStream(entry).use { it.readBytes() })["foreground"] }.getOrNull()
            }.firstOrNull() ?: error("The fixture has no adaptive foreground")
            val id = foreground.resourceId()
            val original = table.resourceFileNames(foreground)
            assertTrue(original.isNotEmpty())
            val counts = table.packages.single().getTypeChunks(foreground.typeId()).map { it.totalEntryCount }
            val target = "res/drawable/solcord_fixture.png"
            assertTrue(table.retargetFileResource(foreground, target) > 0)
            assertEquals(id, foreground.resourceId())
            val rebuilt = BinaryResourceFile(arsc.toByteArray()).getMainArscChunk()
            assertEquals(setOf(target), rebuilt.resourceFileNames(BinaryResourceIdentifier.create(id)))
            assertEquals(counts, rebuilt.packages.single().getTypeChunks(foreground.typeId()).map { it.totalEntryCount })
        }
    }
}
