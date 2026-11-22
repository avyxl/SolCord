# Solcord Mobile 1.1.0

This update adds CustomBadge and OwnerBadge to Android and iPhone and replaces the old app icon artwork with an opaque square icon. The Android installer also replaces the installed Discord client's adaptive and legacy icon artwork, with a separate alpha mask for themed icons.

## CustomBadge

Open Solcord settings, Plugins, CustomBadge, then its settings. Choose Badge 1 or Badge 2, select a PNG/JPG from Photos, give it a name and tap Publish badge. Native image selection resizes it to a small static badge. Removing one slot preserves the other. Join https://discord.gg/solcord before publishing.

Badges use the same solcord2 records and profiles channel as the Windows client. People need Solcord, the corresponding plugin enabled, and access to the community profiles channel to see them. Ordinary Discord does not display these custom badges. A custom image is a user-uploaded picture, not a verified staff grant.

## OwnerBadge

Open OwnerBadge settings and redeem your existing Owner, Developer or Contributor key on this device. Keys are sent only to the existing Solcord staff service and are not saved in plugin settings. Unlock each role separately, then select any combination, including all three. Hide all removes the published selection without revoking your keys.

Profiles display a staff role only after the service verifies its signed proof against the Discord message author's account. Pasting a Discord ID or inventing a channel record cannot produce a valid staff proof. Universal keys still grant their role to anyone who possesses them; keep them with the intended recipients.

## Installation

Android: update Solcord Installer with the APK, then use Install/Update to rebuild your installed Solcord client. Updating the installer alone does not replace the client already on the phone. The Android release uses the same Android signing keystore as 1.0.4.

iPhone: use Apple ID Sideload in Sideloadly, with the same Apple ID as your working install. The IPA includes the client for first launch. It still requires signing for your device. Its temporary signatures and final resource seals are checked after packaging.

The app icons are square and opaque for iOS; Android applies its own adaptive mask over a black background. Existing home-screen icon caches can require removing and re-adding the shortcut or restarting the launcher after a successful app update.

## Source and verification

The main repository branch is unchanged. This mobile source and the iPhone build are in the solcord/mobile-builds-2026-11-22 branch. Upstream licenses and credits are retained in UPSTREAM.md and the component license files.

Badges share one bounded channel reader, rather than one reader per plugin. Background refreshes pause, staff checks are batched, and retained badge/source caches are limited. Local/native fixtures do not prove correct behavior on every physical device or Discord release. Signed mobile network updates still require publication of the mobile feed; no signing secrets are included in the APK, IPA or repository.
