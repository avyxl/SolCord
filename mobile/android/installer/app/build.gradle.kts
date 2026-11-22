import java.security.MessageDigest
import java.io.ByteArrayOutputStream

plugins {
    alias(libs.plugins.aboutlibraries)
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.kotlin.serialization)
    publishing
}

android {
    namespace = "app.revenge.manager"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.solcord.installer.next"
        minSdk = 28
        targetSdk = 34
        versionName = version.toString()
        // major.minor.patch as 1_000_000·major + 1000·minor + patch: joined digits put 1.1.0 (110) below 1.0.10 (1010),
        // and Android refuses an update with a lower code. 1.0.3 is 1000003, above every code made the old way (103).
        versionCode = versionName!!.removePrefix("v").substringBefore("-").split(".")
            .map { it.toInt() }.plus(listOf(0, 0, 0)).take(3)
            .let { (major, minor, patch) ->
                require(minor < 1000 && patch < 1000) { "Version $versionName has a part over 999" }
                major * 1_000_000 + minor * 1_000 + patch
            }


        buildConfigField("String", "MOD_NAME", "\"Solcord\"")
        buildConfigField("String", "MANAGER_NAME", "\"SolcordInstaller\"")
        buildConfigField("String", "REPO", "\"avyxl/SolCord\"")
        buildConfigField("String", "ORG_LINK", "\"https://github.com/avyxl/SolCord\"")
        buildConfigField("String", "INVITE_LINK", "\"https://discord.gg/solcord\"")
        buildConfigField("String", "MODDED_APP_PACKAGE_NAME", "\"com.solcord.next\"")
        // Where the Build workflow publishes the loader. Pass -Psolcord.loaderUrl=http://10.0.2.2:4040/solcord-xposed.apk
        // to install a loader you serve yourself while developing; the signed release has to be served next to it
        // (bundle/scripts/sign-release.mjs), as the emulator test does.
        val loaderUrl = providers.gradleProperty("solcord.loaderUrl")
            .orElse("https://raw.githubusercontent.com/avyxl/SolCord/builds-mobile/solcord-xposed.apk")
            .get()
        buildConfigField("String", "LOADER_URL", "\"$loaderUrl\"")
        val bundledLoader = file("src/main/assets/solcord-xposed.apk")
        val bundledHash = if (bundledLoader.isFile) MessageDigest.getInstance("SHA-256").digest(bundledLoader.readBytes()).joinToString("") { "%02x".format(it) } else ""
        buildConfigField("String", "BUNDLED_LOADER_SHA256", "\"$bundledHash\"")
        // Solcord Classic (on Aliucord's older Discord) is installed by its own installer, which is published next to
        // the loader. -Psolcord.classicInstallerUrl=... points at another copy.
        val classicInstallerUrl = providers.gradleProperty("solcord.classicInstallerUrl")
            .orElse("${loaderUrl.substringBeforeLast('/')}/solcord-classic-installer.apk")
            .get()
        buildConfigField("String", "CLASSIC_INSTALLER_URL", "\"$classicInstallerUrl\"")
        buildConfigField("String", "CLASSIC_INSTALLER_PACKAGE", "\"com.solcord.installer\"")
        // A tracker mirror to try before the public ones, e.g. -Psolcord.mirrorUrl=http://10.0.2.2:4040 for a copy of
        // the Discord APKs served from the developer's machine. Empty in normal builds.
        val mirrorUrl = providers.gradleProperty("solcord.mirrorUrl").orElse("").get()
        buildConfigField("String", "DEV_MIRROR_URL", "\"$mirrorUrl\"")
        // A build that takes its files from the developer's machine over plain http: the Discord it builds is let use
        // plain http too, for a bundle served the same way
        buildConfigField("boolean", "DEV_BUILD", (loaderUrl.startsWith("http://") || mirrorUrl.startsWith("http://")).toString())
        // The key the signed release next to the loader is checked with (bundle/scripts/sign-release.mjs), as the
        // loaders check the bundle; -Psolcord.releaseKey=<base64 SPKI> for a test build signed with another
        val releaseKey = providers.gradleProperty("solcord.releaseKey")
            .orElse(providers.fileContents(rootProject.layout.projectDirectory.file("../../bundle/release-key.pub")).asText)
            .get().trim()
        buildConfigField("String", "RELEASE_KEY", "\"$releaseKey\"")
        buildConfigField("int", "MODDED_APP_ICON", "0xFF100D18") // Solcord night blue
        buildConfigField("int", "MODDED_APP_ICON_ALPHA", "0xFF9945FF") // cobalt (beta)
        buildConfigField("int", "MODDED_APP_ICON_OTHER", "0xFF80F5C4") // ice (alpha)

        buildConfigField("String", "GIT_BRANCH", "\"${getCurrentBranch()}\"")
        buildConfigField("String", "GIT_COMMIT", "\"${getLatestCommit()}\"")
        buildConfigField("boolean", "GIT_LOCAL_COMMITS", "${hasLocalCommits()}")
        buildConfigField("boolean", "GIT_LOCAL_CHANGES", "${hasLocalChanges()}")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isCrunchPngs = true
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )

            val keystoreFile = file(providers.environmentVariable("SOLCORD_ANDROID_KEYSTORE").orElse("keystore.jks").get())
            signingConfig = if (keystoreFile.exists()) {
                 signingConfigs.create("release") {
                    storeFile = keystoreFile
                    storePassword = System.getenv("KEYSTORE_PASSWORD")
                    keyAlias = System.getenv("KEYSTORE_ENTRY_ALIAS")
                    keyPassword = System.getenv("KEYSTORE_ENTRY_PASSWORD")
                }
            } else signingConfigs["debug"]
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
        freeCompilerArgs += listOf(
            "-Xcontext-receivers",
            "-P",
            "plugin:androidx.compose.compiler.plugins.kotlin:reportsDestination=${buildDir.resolve("report").absolutePath}",
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.6"
    }

    applicationVariants.all {
        outputs.all {
            this as com.android.build.gradle.internal.api.ApkVariantOutputImpl

            outputFileName = "${rootProject.name}-$version.apk"
        }
    }

    androidComponents {
        onVariants(selector().withBuildType("release")) {
            it.packaging.resources.excludes.apply {
                // Debug metadata
                add("/**/*.version")
                add("/kotlin-tooling-metadata.json")
                // Kotlin debugging (https://github.com/Kotlin/kotlinx.coroutines/issues/2274)
                add("/DebugProbesKt.bin")
            }
        }
    }

    packaging {
        resources {
            // Reflection symbol list (https://stackoverflow.com/a/41073782/13964629)
            excludes += "/**/*.kotlin_builtins"
        }
    }

    configurations {
        all {
            exclude(module = "listenablefuture")
            exclude(module = "error_prone_annotations")
        }
    }
}

dependencies {
    implementation(platform(libs.compose.bom))

    implementation(libs.bundles.accompanist)
    implementation(libs.bundles.androidx)
    implementation(libs.bundles.coil)
    implementation(libs.bundles.compose)
    implementation(libs.bundles.koin)
    implementation(libs.bundles.ktor)
    implementation(libs.bundles.shizuku)
    implementation(libs.bundles.voyager)

    implementation(files("libs/lspatch.aar"))

    implementation(libs.aboutlibraries.core)
    implementation(libs.binaryResources) {
        exclude(module = "checker-qual")
        exclude(module = "jsr305")
        exclude(module = "guava")
    }
    implementation(libs.kotlinx.datetime)
    implementation(libs.kotlinx.collections)
    implementation(libs.zip.android) {
        artifact {
            type = "aar"
        }
    }

    testImplementation(libs.kotlin.test)
}

fun getCurrentBranch(): String =
    exec("git", "symbolic-ref", "--short", "HEAD") ?: "mobile-dev"

fun getLatestCommit(): String =
    exec("git", "rev-parse", "--short", "HEAD") ?: "local"

fun hasLocalCommits(): Boolean {
    val branch = getCurrentBranch() ?: return false
    return exec("git", "log", "origin/$branch..HEAD")?.isNotBlank() ?: false
}

fun hasLocalChanges(): Boolean =
    exec("git", "status", "-s")?.isNotEmpty() ?: false

fun exec(vararg command: String): String? {
    return try {
        val stdout = ByteArrayOutputStream()
        val errout = ByteArrayOutputStream()

        exec {
            commandLine = command.toList()
            standardOutput = stdout
            errorOutput = errout
            isIgnoreExitValue = true
        }

        if (errout.size() > 0) return null

        stdout.toString(Charsets.UTF_8).trim()
    } catch (e: Throwable) {
        null
    }
}

// Used by gradle-semantic-release-plugin.
// Tracking: https://github.com/KengoTODA/gradle-semantic-release-plugin/issues/435.
tasks.publish {
    dependsOn("assembleRelease")
}


// Allow CI/local tests to use a compatible JVM for Java 21 dependencies.
tasks.withType<Test>().configureEach {
    providers.environmentVariable("SOLCORD_TEST_JAVA").orNull?.let { executable = it }
}
