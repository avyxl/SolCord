# Solcord Mobile 1.2.0

## Profiles and badges

New CustomProfile messages use `solcord2 {"kind":"profile","data":...}`, matching the current desktop client. Mobile still reads old `ecp1` messages, but never publishes new profiles with that prefix. Empty profiles use a null-data reset. Message authors determine the profile identity; a supplied arbitrary user ID is not trusted. Bot/webhook profile messages are ignored. Only supported cosmetic fields are shared; email, phone and copied account IDs remain local.

The cross-client tests import the desktop profile reader/publisher and exercise messages in both directions. They also cover profile resets, legacy input, pictures, malformed messages, dates, flags and private fields. Access to the Solcord server's profile channel is still required; this release does not silently join a server or impersonate a different account.

CustomBadge and OwnerBadge keep their existing mobile implementation and validation. This release does not alter badge grant keys or grant additional staff access.

## Settings and upgrade behavior

Settings use a bundled full-color Solcord image through a dedicated image component, avoiding Discord's monochrome icon tint. General, About and Version show the mobile release clearly; General includes the release changelog.

Both native loaders enforce a release baseline compiled into the app. A saved signed bundle from an older mobile release cannot silently replace the freshly embedded client after an upgrade. New downloads retain signature, hash and monotonic release checks. Android release builds pass `-Psolcord.bundledSequence=<Unix seconds>`; iOS builds pass `SOLCORD_BUNDLED_SEQUENCE=<Unix seconds>`. Use increasing release timestamps. A manually chosen development bundle remains an explicit development setting.

Android installer preference reads fall back when a restored value has a wrong type or an enum value removed by a newer version. Notification permission is requested on Android 13 and later.

## Install and update

Android: open `SolcordInstaller-Android-1.2.0.apk`, then run its install/update flow. Updating the installer alone does not replace the loader already patched into Discord. Android 9 or newer is required. The installer and installed Solcord are different apps.

iOS: sideload `Solcord-iOS-1.2.0.ipa` using Apple ID Sideload in Sideloadly or another compatible signing tool. The IPA includes verified temporary signatures and resource seals; your sideloading tool must still provision and sign it for your device. Use the same signing identity when possible to retain stored settings. The underlying Discord version is separate from the Solcord release number shown in settings.

The mobile plugin library is separate from the desktop plugin library; availability depends on the plugin, platform and Discord version.

## Validation

The client passes its test suite and TypeScript checks. The iOS workflow compiles a new native loader, embeds the new client, checks JSI symbols against the included Discord, seals the finished app inside out and verifies its temporary signatures and resources. These checks do not replace physical-device testing or Apple ID provisioning.

Android unit checks and release startup validation results are recorded with the build artifacts. No Discord account credentials are used for automated launch checks. If a particular phone still closes at startup, its model, OS version and crash log are needed to distinguish an installer failure from a Discord/native-loader failure.

Private keys, keystores, account tokens and dependency caches are excluded from the shared source archive. Original upstream licensing notices remain in the source.
