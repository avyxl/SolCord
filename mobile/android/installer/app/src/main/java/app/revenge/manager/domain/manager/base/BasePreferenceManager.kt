package app.revenge.manager.domain.manager.base

import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.core.content.edit
import java.io.File
import kotlin.reflect.KProperty

abstract class BasePreferenceManager(
    private val prefs: SharedPreferences
) {
    protected fun getString(key: String, defaultValue: String?) =
        try { prefs.getString(key, defaultValue) ?: defaultValue.orEmpty() } catch (_: ClassCastException) { defaultValue.orEmpty() }

    private fun getBoolean(key: String, defaultValue: Boolean) = try { prefs.getBoolean(key, defaultValue) } catch (_: ClassCastException) { defaultValue }
    private fun getInt(key: String, defaultValue: Int) = try { prefs.getInt(key, defaultValue) } catch (_: ClassCastException) { defaultValue }
    private fun getFloat(key: String, defaultValue: Float) = try { prefs.getFloat(key, defaultValue) } catch (_: ClassCastException) { defaultValue }
    private fun getColor(key: String, defaultValue: Color): Color {
        val c = try { prefs.getString(key, null)?.toULongOrNull() } catch (_: ClassCastException) { null }
        return if (c == null) defaultValue else Color(c)
    }

    private fun getFile(key: String, defaultValue: File) =
        File(getString(key, defaultValue.absolutePath))

    protected inline fun <reified E : Enum<E>> getEnum(key: String, defaultValue: E) =
        enumValues<E>().firstOrNull { it.name == getString(key, defaultValue.name) } ?: defaultValue

    protected fun putString(key: String, value: String?) = prefs.edit { putString(key, value) }
    private fun putBoolean(key: String, value: Boolean) = prefs.edit { putBoolean(key, value) }
    private fun putInt(key: String, value: Int) = prefs.edit { putInt(key, value) }
    private fun putFloat(key: String, value: Float) = prefs.edit { putFloat(key, value) }
    private fun putColor(key: String, value: Color) =
        prefs.edit { putString(key, value.value.toString()) }

    private fun putFile(key: String, value: File) =
        putString(key, value.absolutePath)

    protected inline fun <reified E : Enum<E>> putEnum(key: String, value: E) =
        putString(key, value.name)

    protected class Preference<T>(
        private val key: String,
        defaultValue: T,
        getter: (key: String, defaultValue: T) -> T,
        private val setter: (key: String, newValue: T) -> Unit
    ) {
        @Suppress("RedundantSetter")
        var value by mutableStateOf(getter(key, defaultValue))
            private set

        operator fun getValue(thisRef: Any?, property: KProperty<*>) = value
        operator fun setValue(thisRef: Any?, property: KProperty<*>, newValue: T) {
            value = newValue
            setter(key, newValue)
        }
    }

    protected fun stringPreference(
        key: String,
        defaultValue: String = ""
    ) = Preference(
        key = key,
        defaultValue = defaultValue,
        getter = ::getString,
        setter = ::putString
    )

    protected fun booleanPreference(
        key: String,
        defaultValue: Boolean
    ) = Preference(
        key = key,
        defaultValue = defaultValue,
        getter = ::getBoolean,
        setter = ::putBoolean
    )

    protected fun intPreference(
        key: String,
        defaultValue: Int
    ) = Preference(
        key = key,
        defaultValue = defaultValue,
        getter = ::getInt,
        setter = ::putInt
    )

    protected fun floatPreference(
        key: String,
        defaultValue: Float
    ) = Preference(
        key = key,
        defaultValue = defaultValue,
        getter = ::getFloat,
        setter = ::putFloat
    )

    protected fun colorPreference(
        key: String,
        defaultValue: Color
    ) = Preference(
        key = key,
        defaultValue = defaultValue,
        getter = ::getColor,
        setter = ::putColor
    )

    protected fun filePreference(
        key: String,
        defaultValue: File
    ) = Preference(
        key = key,
        defaultValue = defaultValue,
        getter = ::getFile,
        setter = ::putFile
    )

    protected inline fun <reified E : Enum<E>> enumPreference(
        key: String,
        defaultValue: E
    ) = Preference(
        key = key,
        defaultValue = defaultValue,
        getter = ::getEnum,
        setter = ::putEnum
    )
}