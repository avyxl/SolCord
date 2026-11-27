#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p results
pkg=com.solcord.installer.next
trap 'adb logcat -d > results/logcat.txt 2>&1 || true' EXIT
adb install -r SolcordInstaller.apk
api=$(adb shell getprop ro.build.version.sdk | tr -d '\r')
if [ "$api" -ge 33 ]; then
  adb shell pm grant "$pkg" android.permission.POST_NOTIFICATIONS
fi
launch() {
  scenario=$1
  adb logcat -c
  adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1
  sleep 10
  adb shell pidof "$pkg" > "results/$scenario.pid"
  adb shell uiautomator dump /sdcard/window.xml
  adb pull /sdcard/window.xml "results/$scenario.xml"
  adb exec-out screencap -p > "results/$scenario.png"
  adb logcat -d > "results/$scenario.log"
  grep -qi solcord "results/$scenario.xml"
  if grep -A 3 'FATAL EXCEPTION' "results/$scenario.log" | grep -q "$pkg"; then
    echo "Release crashed during $scenario"
    exit 1
  fi
}
launch first-launch
if [ "$api" -ge 35 ]; then
  # Exercise the actual release installer and patched client, without signing in.
  adb shell am force-stop "$pkg"
  adb shell appops set "$pkg" REQUEST_INSTALL_PACKAGES allow
  adb shell dumpsys deviceidle whitelist +"$pkg"
  adb logcat -c
  adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1
  python3 ui.py install download
  adb logcat -d > results/install-flow.log
  adb shell pm list packages | grep -qx 'package:com.solcord.next'
  adb shell am force-stop "$pkg"
  adb logcat -c
  adb shell monkey -p com.solcord.next -c android.intent.category.LAUNCHER 1
  sleep 45
  adb shell pidof com.solcord.next > results/patched-client.pid
  adb logcat -d > results/patched-client.log
  adb exec-out screencap -p > results/patched-client.png
  adb shell uiautomator dump /sdcard/client.xml
  adb pull /sdcard/client.xml results/patched-client.xml
  if grep -A 3 'FATAL EXCEPTION' results/patched-client.log | grep -q com.solcord.next; then
    echo 'Patched client crashed'
    exit 1
  fi
  echo 'PASS: release installer installed the patched client and it stayed open' | tee -a results/summary.txt
fi

adb shell am force-stop "$pkg"
adb shell svc wifi disable
adb shell svc data disable
launch offline-launch
adb shell am force-stop "$pkg"
# The disposable emulator permits root; emulate values restored from an older installer.
adb root
adb wait-for-device
uid=$(adb shell cmd package list packages -U "$pkg" | tr -d '\r' | sed -n 's/.* uid:\([0-9]*\).*/\1/p')
test -n "$uid"
cat > results/restored-prefs.xml <<'EOF'
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
  <string name="theme">old_theme_that_no_longer_exists</string>
  <string name="update_duration">unknown_legacy_duration</string>
  <string name="monet">old_boolean_value</string>
</map>
EOF
adb push results/restored-prefs.xml /data/local/tmp/solcord-prefs.xml
adb shell mkdir -p "/data/user/0/$pkg/shared_prefs"
adb shell cp /data/local/tmp/solcord-prefs.xml "/data/user/0/$pkg/shared_prefs/prefs.xml"
adb shell chown "$uid:$uid" "/data/user/0/$pkg/shared_prefs" "/data/user/0/$pkg/shared_prefs/prefs.xml"
adb shell restorecon -R "/data/user/0/$pkg/shared_prefs"
launch restored-preferences
echo 'PASS: first launch, offline cold start and legacy preference recovery' | tee results/summary.txt
