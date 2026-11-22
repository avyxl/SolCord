package app.revenge.manager.domain.manager

import app.revenge.manager.BuildConfig
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PackageNameTest {
    @Test
    fun `package names Solcord can be installed as`() {
        assertTrue(isUsablePackageName("com.solcord.next"))
        assertTrue(isUsablePackageName("com.my_app.x2"))
    }

    @Test
    fun `names that can't be a package, or are Discord's or the installer's own`() {
        assertFalse(isUsablePackageName(""))
        assertFalse(isUsablePackageName("solcord"))
        assertFalse(isUsablePackageName("com..solcord"))
        assertFalse(isUsablePackageName("1com.solcord"))
        assertFalse(isUsablePackageName("com.end cord"))
        assertFalse(isUsablePackageName("com.solcord."))
        assertFalse(isUsablePackageName("com.discord"))
        assertFalse(isUsablePackageName(BuildConfig.APPLICATION_ID))
        assertFalse(isUsablePackageName("a." + "b".repeat(300)))
    }
}
