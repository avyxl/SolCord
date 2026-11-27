# Solcord Mobile 1.2.0

## Profiles and badges

New CustomProfile messages use `solcord2 {"kind":"profile","data":...}`, matching the current desktop client. Mobile still reads old `ecp1` messages, but never publishes new profiles with that prefix. Empty profiles use a null-data reset. Message authors determine the profile identity; a supplied arbitrary user ID is not trusted. Bot/webhook profile messages are ignored. Only supported cosmetic fields are shared; email, phone and copied account IDs remain local.

The cross-client tests import the desktop profile reader/publisher and exercise messages in both directions. They also cover profile resets, legacy input, pictures, malformed messages, dates, flags and private fields. Access to the Solcord server's profile channel is still required; this release does not silently join a server or impersonate a different account.

CustomBadge and OwnerBadge keep their existing mobile implementation and validation. This release does not alter badge grant keys or grant additional staff access.

## Settings and upgrade behavior

Settings use a bundled full-color Solcord image through a dedicated image component, avoiding Discord's monochrome icon tint. General, About and Version show the mobile release clearly; General includes the release changelog.

Both native loaders enforce a release baseline compiled into the app. A saved signed bundle from an older mobile release cannot silently replace the freshly embedded client after an upgrade. New downloads retain signature, hash and monotonic release checks. Android release builds pass `-Psolcord.bundledSequence=<Unix seconds>`; iOS builds pass `SOLCORD_BUNDLED_SEQUENCE=<Unix seconds>`. Use increasing release timestamps. A manually chosen development bundle remains an explicit development setting.

Android installer preference reads fall back when a restored value has a wrong type or an enum value removed by a newer version. Notification permission is requested on Android 13 and later.

The full installation test also exposed a first-install signing failure: a keystore provider can close its output before the installer synchronizes the file. Key serialization now uses a memory buffer, followed by a separately owned file write, sync and commit. Existing signing keys are preserved. Regression tests cover providers closing their stream, serialization failure and refusing to replace an existing key.

## Install and update

Android: open `SolcordInstaller-Android-1.2.0.apk`, then run its install/update flow. Updating the installer alone does not replace the loader already patched into Discord. Android 9 or newer is required. The installer and installed Solcord are different apps.

iOS: sideload `Solcord-iOS-1.2.0.ipa` using Apple ID Sideload in Sideloadly or another compatible signing tool. The IPA includes verified temporary signatures and resource seals; your sideloading tool must still provision and sign it for your device. Use the same signing identity when possible to retain stored settings. The underlying Discord version is separate from the Solcord release number shown in settings.

The mobile plugin library is separate from the desktop plugin library; availability depends on the plugin, platform and Discord version.

## Validation

The client passes its test suite and TypeScript checks. The iOS workflow compiles a new native loader, embeds the new client, checks JSI symbols against the included Discord, seals the finished app inside out and verifies its temporary signatures and resources. These checks do not replace physical-device testing or Apple ID provisioning.

Android unit checks and release startup validation results are recorded with the build artifacts. No Discord account credentials are used for automated launch checks. If a particular phone still closes at startup, its model, OS version and crash log are needed to distinguish an installer failure from a Discord/native-loader failure.

Release validation completed:

- All 33 client test runs and the TypeScript check passed, including actual desktop/mobile profile reader and publisher interoperability.
- The final iOS package passed native compilation, JSI compatibility checks, temporary signatures and strict resource-seal validation in [build 46071735103](https://github.com/avyxl/SolCord/actions/runs/46071735103).
- Android installer first launch, offline cold start and recovery from invalid restored preferences passed on Android 10 and Android 15 emulators.
- The corrected signed release installer successfully patched an installed Discord 355.10, installed Solcord and opened its welcome/login screen on Android 15, staying open through the observation period. The native loader loaded the bundled client. Installer offline and restored-preference checks also passed in the [final run 46074686153](https://github.com/avyxl/SolCord/actions/runs/46074686153).
- Android signing regressions passed: a provider closing its stream, interrupted serialization and preservation of an existing signing identity.

Live profile publishing with a signed-in Discord account, physical iPhone use and the reported Samsung handset were not tested in this automated run. The remote APK mirror had an intermittent connection failure during a separate download-path check; the completed installation test used the Discord already on the emulator, matching the installer's installed-app option.

Private keys, keystores, account tokens and dependency caches are excluded from the shared source archive. Original upstream licensing notices remain in the source.
