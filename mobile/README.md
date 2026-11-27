<div align="center">

<img src="docs/images/banner.png" alt="Solcord" width="420">

# Solcord Mobile

Current release: **1.2.0**. See [release and upgrade notes](docs/MOBILE-1.2.0.md). Developed by [avyxl](https://avyxl.github.io/portfolio/).

**Plugins, themes and privacy for the Discord app on your Android phone, iPhone and iPad**

[![Downloads](https://img.shields.io/badge/Download-Solcord-9945FF?style=for-the-badge)](https://solcord.site)
[![Join the Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/solcord)

![Plugins](https://img.shields.io/badge/plugins-362-5865F2)
![Android](https://img.shields.io/badge/Android-9%2B-3DDC84?logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-16%2B-000000?logo=apple&logoColor=white)
![No root or jailbreak](https://img.shields.io/badge/root%20or%20jailbreak-not%20needed-3DDC84)
![Languages](https://img.shields.io/badge/languages-5-F59E0B)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

[Website](https://solcord.site) · [Solcord PC](https://github.com/avyxl/SolCord) · [Plugin list](docs/PLUGINS.md)

</div>

Solcord is on every platform: this repository is the mobile app for **Android** and **iOS / iPadOS**, and
[Solcord PC](https://github.com/avyxl/SolCord) is the separate desktop project.

| | Android | iOS and iPadOS |
| --- | --- | --- |
| **Version** | Android 9 or newer | iOS 16 or newer, Discord 332 or newer |
| **Install with** | Solcord Installer | An IPA, with Sideloadly, AltStore, SideStore, Feather, KSign or ESign |
| **Root or jailbreak** | Not needed | Not needed |
| **Plugins, themes, fonts** | Yes | Yes |
| **Signed updates** | Yes | Yes |
| **Code** | [`android/`](android) | [`ios/`](ios) |

Both run the same Solcord, from [`bundle/`](bundle), so plugins and themes work the same on each.

## Features

- **362 plugins built in.** 319 of them come from Solcord PC and 43 are made for phones. They are all off until you
  turn them on, each with its own settings, and you can search and filter them by tag like on desktop. Plugins whose
  work Discord can punish say so, and ask before they turn on. See the [full list](docs/PLUGINS.md).
- **Custom profiles everyone sees.** A profile made with CustomProfile is shared with every Solcord user, on phones and
  on Solcord PC, through the Solcord server, and theirs show to you.
- **Themes and fonts.** Solcord's own theme and eight more from Solcord PC's
  Theme Studio, each one tap away and readable in dark and light. Eight suggested fonts. Browse community themes and
  Catppuccin without leaving the app, or add your own. The status bar follows your theme.
- **Private by default.** NoTrack is on from the start, so Discord's analytics, telemetry and crash reports are never
  sent.
- **Your language.** English, Türkçe, Русский, Español and Français, following Discord's language or the one you pick.
- **Light on older phones.** Only a list of plugins loads when Discord starts. A plugin's code loads the first time you
  turn it on.
- **Always up to date.** Solcord updates itself every time the app starts. On Android, the installer rebuilds it when
  Discord updates.
- **Signed updates.** Every update is signed, and the app checks that signature and refuses older versions, so changing
  the files on the server isn't enough to run code on your phone.
- **Hard to break.** A plugin that fails turns itself off and tells you why, instead of crashing Discord. Safe Mode
  and a recovery menu are always one step away. If Discord doesn't open three times in a row, Solcord starts in Safe
  Mode by itself and offers to turn off the plugins you turned on since it last opened. On Android, an update that
  doesn't open three times in a row is replaced by the version before it.
- **Your settings are kept.** A copy of your settings is kept every day, and one before every restore, so you can go
  back to an earlier day. A damaged settings file comes back from its last good copy.
- **Careful with what you install.** Before a community plugin is installed, its code is checked for things plugins
  rarely need, like reading your account's token, and you're asked first. **Solcord → Security** shows what was really
  checked, and nothing there shows as fine without a check behind it. SecretGuard and SuspiciousLinks, from Solcord PC,
  stop a message with a token or password in it and warn you about links that pretend to be Discord or Steam.
- **Compatible.** Vendetta and Revenge plugins and themes work too, and you can browse community plugins in the app.

## Install on Android

No root needed. Solcord installs next to Discord as a separate app, and your Discord stays exactly as it is.

1. Download **SolcordInstaller-Android-1.2.0.apk** from this release
   and open it. If Android asks, allow your browser to install apps.
2. In **Solcord Installer**, tap **Install**. It uses the Discord on your phone, or downloads the latest one.
3. Open **Solcord** and sign in. Solcord's settings are in Discord's settings, under **Solcord**.

Requires Android 9 or newer. After updating the installer, run its install/update flow to refresh the loader in the installed Solcord app as well.

<details>
<summary><b>Rooted? Run Solcord inside the real Discord with LSPosed</b></summary>

<br>

Nothing is reinstalled: the Play Store Discord runs Solcord.

1. Install [LSPosed](https://github.com/JingMatrix/LSPosed) or another Xposed framework.
2. Download `solcord-xposed.apk` from the [`builds-mobile` branch](https://github.com/avyxl/SolCord/tree/builds-mobile)
   and install it.
3. In LSPosed, enable the **Solcord Xposed** module for **Discord** (`com.discord`).
4. Force-stop Discord and open it again.

</details>

## Install on iPhone and iPad

No jailbreak needed. iOS 16 or newer.

1. Download **Solcord-iOS-1.2.0.ipa** from this release.
2. Install it with one of these:
   - **[Sideloadly](https://sideloadly.io)** on a computer, with your own Apple ID. Change the bundle ID in its advanced
     options if you want to keep the App Store Discord too.
   - **AltStore or SideStore**, adding this source:
     `https://raw.githubusercontent.com/avyxl/SolCord/builds-ios/apps.json`
   - **Feather, KSign or ESign**, with a certificate of your own.
3. Open **Solcord** and sign in. Solcord's settings are in Discord's settings, under **Solcord**.

With a free Apple ID the app has to be signed again every 7 days. Shared free certificates can be revoked by Apple at
any time, and everything signed with one then stops opening until it's signed with another.

<details>
<summary><b>Jailbroken, or using your own Discord IPA?</b></summary>

<br>

The [iOS release](https://github.com/avyxl/SolCord/releases/tag/ios-v1.0.8) also has a rootless `.deb` and
`Solcord.dylib`, to inject into your own decrypted Discord IPA (Discord 332 or newer) with Substrate or ElleKit included.

</details>

<details>
<summary><b>What doesn't work on iOS?</b></summary>

<br>

Apple limits sideloaded apps, whichever mod you use: notifications don't arrive while the app is closed or in the
background, and passkeys and sharing to Discord from other apps don't work. SmoothType needs iOS 17 or newer.

</details>

## FAQ

<details>
<summary><b>Can I use Aliucord plugins?</b></summary>

<br>

Not in this app. Aliucord plugins are written for the older Discord that Aliucord is built on and can't run on the
current one. [Solcord Classic](https://github.com/avyxl/SolCord/tree/main) runs both Solcord's and
Aliucord's plugins, and Solcord Installer can set it up for you.

</details>

<details>
<summary><b>How do I update?</b></summary>

<br>

You don't need to do anything for Solcord itself: it downloads its newest version every time the app starts. On
Android, when Discord updates, Solcord Installer sends a notification: tap it to rebuild Solcord. The installer also
tells you when a new version of itself is out. On iOS, a new Discord comes as a new IPA, which AltStore and SideStore
update for you.

</details>

<details>
<summary><b>Solcord won't start, or a plugin broke something</b></summary>

<br>

- Shake the phone for the recovery menu, or on Android hold two fingers on the screen for 3 seconds right after Solcord
  opens: reload, recovery mode (plugins and themes off), delete the downloaded Solcord, or reset the loader settings.
- Solcord → General → **Safe Mode** reloads without plugins and themes. It also turns on by itself when Discord
  doesn't open three times in a row.
- Solcord → General → **Earlier settings** goes back to the settings of an earlier day.
- A plugin that fails to start turns itself off and says so. Turn it back on after the next update.

</details>

<details>
<summary><b>Will I get banned?</b></summary>

<br>

Client mods are against Discord's Terms of Service. Bans for using one are rare, but they can happen, so use Solcord
at your own risk. Plugins that act for you, like scheduled messages, stay off until you turn them on.

</details>

## What's in this repository

| Directory | What it is |
| --- | --- |
| [`bundle/`](bundle) | The Solcord that runs inside Discord on both platforms: plugins, themes and settings |
| [`android/`](android) | The Android loader and Solcord Installer |
| [`ios/`](ios) | The iOS tweak, and its tests |
| [`docs/`](docs) | Development, the plugin list and how to write a plugin |

## Contributing

Bug reports, translations and plugins are welcome: open an issue or come to our
[Discord](https://discord.gg/BNapnPqGku). [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) explains how the repository is laid
out, how to build and test Solcord, and how releases work; [docs/PLUGINS.md](docs/PLUGINS.md) shows how to write a
plugin.

## Credits and license

Solcord Mobile is a fork of [Revenge](https://github.com/revenge-mod), which continues Bunny and Vendetta, and its iOS
tweak of [RainTweak](https://codeberg.org/raincord/RainTweak); see [UPSTREAM.md](UPSTREAM.md) for the exact upstream
commits. It would not exist without them,
[LSPatch](https://github.com/LSPosed/LSPatch) and the Vendetta tracker mirrors that serve the Discord APKs.
MessageLogger and FakeNitro follow the approaches of the
[Revenge community plugins](https://github.com/revenge-mod/revenge-community-plugins) (GPL-3.0); oneko's cat is
[oneko.js](https://github.com/adryd325/oneko.js) by adryd; ThemeLibrary lists [Catppuccin](https://github.com/catppuccin/vendetta)
and the community [theme marketplace](https://github.com/kmmiio99o/theme-marketplace).

© 2026 rootpoi and contributors. Each directory keeps the license of the project it was forked from: `bundle/`
BSD-3-Clause, `android/loader/` GPL-3.0, `android/installer/` and `ios/` OSL-3.0. Solcord's plugins (`bundle/src/plugins`) and the other files
marked `SPDX-License-Identifier: GPL-3.0-or-later` are GPL-3.0-or-later, like Endcord PC, so the built bundle as a
whole is distributed under the GPL-3.0. The original copyright notices of Team Vendetta, pylixonly and Team Revenge
are kept in the source files and shown in the installer's About screen.

<sub>Solcord is not affiliated with or endorsed by Discord Inc., Apple or the Revenge and Rain teams.</sub>
