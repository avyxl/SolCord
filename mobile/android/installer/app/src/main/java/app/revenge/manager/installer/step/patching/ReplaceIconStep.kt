package app.revenge.manager.installer.step.patching

import android.content.Context
import com.github.diamondminer88.zip.ZipWriter
import app.revenge.manager.R
import app.revenge.manager.domain.manager.PreferenceManager
import app.revenge.manager.installer.step.Step
import app.revenge.manager.installer.step.StepGroup
import app.revenge.manager.installer.step.StepRunner
import app.revenge.manager.installer.utils.ArscUtil
import app.revenge.manager.installer.utils.ArscUtil.retargetFileResource
import app.revenge.manager.installer.utils.ArscUtil.resourceFileNames
import app.revenge.manager.installer.utils.ArscUtil.getMainArscChunk
import app.revenge.manager.installer.utils.ArscUtil.getPackageChunk
import app.revenge.manager.installer.utils.ArscUtil.getResourceFileName
import app.revenge.manager.installer.utils.AxmlUtil
import app.revenge.manager.utils.DiscordVersion
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.koin.core.component.inject
import java.util.zip.ZipFile

/**
 * Replaces the installed client's artwork and background with Solcord's launcher assets.
 */
class ReplaceIconStep : Step() {

    private val preferences: PreferenceManager by inject()

    val context: Context by inject()

    override val group = StepGroup.PATCHING
    override val nameRes = R.string.step_change_icon

    override suspend fun run(runner: StepRunner) {
        val baseApk = runner.baseApk()

        runner.logger.i("Reading resources.arsc")
        val arsc = ArscUtil.readArsc(baseApk)
        
        val iconRscIds = AxmlUtil.readManifestIconInfo(baseApk)
        val table = arsc.getMainArscChunk()
        val iconFiles = (table.resourceFileNames(iconRscIds.squareIcon) + table.resourceFileNames(iconRscIds.roundIcon)).filter { it.endsWith(".xml") }

        runner.logger.i("Patching all icon configuration variants (${iconFiles.size} XML resources)")

        val foregroundPath = "res/drawable/solcord_fullbleed.png"
        val monochromePath = "res/drawable/solcord_monochrome.png"
        val legacyPath = "res/drawable/solcord_legacy.png"

        val postfix = when (preferences.channel) {
            DiscordVersion.Type.BETA -> "beta"
            DiscordVersion.Type.ALPHA -> "canary"
            else -> null
        }
        
        val apkEntries = withContext(Dispatchers.IO) {
            ZipFile(baseApk).use { zip -> zip.entries().asSequence().map { it.name }.toSet() }
        }

        // setOf to not possibly patch same file twice
        for (rscFile in iconFiles) {
            // Discord recently enabled resource shrinking, which strips the other channels' icons,
            // so some icons may not exist
            val referencePath = postfix
                ?.let { rscFile.replace("_$it.xml", ".xml") }
                ?.takeIf { it in apkEntries }
                ?: rscFile
        
            runner.logger.i("Patching adaptive icon ($rscFile <- $referencePath)")

            val references = withContext(Dispatchers.IO) {
                ZipFile(baseApk).use { zip ->
                    AxmlUtil.readAdaptiveIconReferences(zip.getInputStream(zip.getEntry(referencePath)).use { it.readBytes() })
                }
            }
            val foreground = references["foreground"] ?: continue
            check(table.retargetFileResource(foreground, foregroundPath) > 0) { "The icon foreground could not be replaced" }
            references["monochrome"]?.takeIf { it.resourceId() != foreground.resourceId() }?.let {
                table.retargetFileResource(it, monochromePath)
            }

            AxmlUtil.patchAdaptiveIcon(
                apk = baseApk,
                resourcePath = rscFile,
                referencePath = referencePath,
                backgroundArgb = 0xFF000000.toInt(),
            )
        }

        for (icon in setOf(iconRscIds.squareIcon, iconRscIds.roundIcon)) table.retargetFileResource(icon, legacyPath, rasterOnly = true)

        runner.logger.i("Writing and compiling resources.arsc")
        ZipWriter(baseApk, /* append = */ true).use {
            it.deleteEntry("resources.arsc")
            it.writeEntry("resources.arsc", arsc.toByteArray())
            for ((entry, asset) in listOf(foregroundPath to "solcord-icon-adaptive.png", monochromePath to "solcord-monochrome.png", legacyPath to "solcord-icon-legacy.png")) {
                if (entry in apkEntries) it.deleteEntry(entry)
                it.writeEntry(entry, context.assets.open(asset).use { input -> input.readBytes() })
            }
        }
    }

}
