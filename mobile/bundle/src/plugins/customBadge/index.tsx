/* Copyright (c) 2026 avyxl. SPDX-License-Identifier: GPL-3.0-or-later */
import { tx } from "@core/i18n";
import { Button, Stack, Text, TextInput } from "@metro/common/components";
import { useEffect, useState } from "react";
import { Image, View } from "react-native";

import { definePlugin } from "../api";
import { extendProfileBadges, linkedBadge } from "../profileBadges";
import { badgeAccountId, badgeCommunityJoined, getBadgeRecord, publishBadgeRecord, refreshBadgeRecords, startBadgeChannel, watchBadgeRecords } from "../shared/communityBadgeChannel";
import { customBadgeSlots } from "../shared/communityBadgeFormat";
import { pickBadgeImage } from "../shared/communityBadgePicker";

function CustomBadgeSettings() {
    const [, redraw] = useState(0), [slot, setSlot] = useState(0), [preview, setPreview] = useState("");
    const [label, setLabel] = useState("Custom Badge"), [status, setStatus] = useState(""), [busy, setBusy] = useState(false);
    const account = badgeAccountId(), record = getBadgeRecord(account, "badge"), slots = customBadgeSlots(record);
    useEffect(() => { const stop = startBadgeChannel(), unwatch = watchBadgeRecords(() => redraw(n => n + 1)); void refreshBadgeRecords().catch(() => {}); return () => { unwatch(); stop(); }; }, []);
    useEffect(() => { setPreview(""); setLabel(customBadgeSlots(record)[slot]?.label ?? "Custom Badge"); }, [account, slot, record]);
    const run = async (work: () => Promise<unknown>, done: string) => {
        if (busy) return; setBusy(true); setStatus("");
        try { await work(); setStatus(done); } catch (error) { setStatus(error instanceof Error ? error.message : "The badge could not be updated."); }
        finally { setBusy(false); }
    };
    return <Stack spacing={12}>
        <Text variant="text-md/semibold">Your custom image badges</Text>
        <Text variant="text-sm/medium" color="text-muted">Choose one of two slots. Images are shared with Solcord users through the community profiles channel, including Windows, Android and iPhone.</Text>
        {!badgeCommunityJoined() && <Text variant="text-sm/medium">Join discord.gg/solcord before publishing.</Text>}
        <View style={{ flexDirection: "row", gap: 8 }}>{[0, 1].map(index => <Button key={index} size="sm" variant={slot === index ? "primary" : "secondary"} text={`Badge ${index + 1}`} disabled={busy} onPress={() => setSlot(index)} />)}</View>
        <Text variant="text-sm/medium" color="text-muted">{slots.filter(Boolean).length}/2 badges published</Text>
        <TextInput label="Badge name" value={label} maxLength={40} onChange={setLabel} />
        {(preview || slots[slot]?.image) ? <Image source={{ uri: preview || slots[slot]!.image }} resizeMode="contain" style={{ width: 64, height: 64 }} /> : null}
        <Button size="sm" variant="secondary" text="Choose image" disabled={busy} onPress={() => { void run(async () => { const image = await pickBadgeImage(); if (image && account === badgeAccountId()) setPreview(image); }, "Image selected. Tap Publish badge to share it."); }} />
        <Button text="Publish badge" disabled={busy || !badgeCommunityJoined() || !label.trim() || !(preview || slots[slot])} onPress={() => { void run(async () => {
            const next = customBadgeSlots(getBadgeRecord(account, "badge")); next[slot] = { image: preview || next[slot]!.image, label: label.trim() };
            await publishBadgeRecord("badge", { badges: next }, account); setPreview("");
        }, "Badge published."); }} />
        <Button size="sm" variant="secondary" text="Remove this badge" disabled={busy || !slots[slot] || !badgeCommunityJoined()} onPress={() => { void run(async () => {
            const next = customBadgeSlots(getBadgeRecord(account, "badge")); next[slot] = null;
            await publishBadgeRecord("badge", next.some(Boolean) ? { badges: next } : null, account); setPreview("");
        }, "Badge removed."); }} />
        {!!status && <Text variant="text-sm/medium">{status}</Text>}
    </Stack>;
}
export default definePlugin({
    id: "solcord.custom-badge",
    name: "CustomBadge",
    description: tx("Upload two custom image badges and share them with other Solcord users on phones and PCs."),
    icon: "MedalIcon",
    tags: ["Appearance", "Customisation"],
    enabledByDefault: true,
    SettingsComponent: CustomBadgeSettings,
    start({ cleanup }) {
        cleanup(startBadgeChannel());
        cleanup(extendProfileBadges("solcord-custom-badge", (id, badges) => [...badges, ...customBadgeSlots(getBadgeRecord(id, "badge")).flatMap((badge, slot) => badge ? [linkedBadge(`solcord-custom-${id}-${slot}`, `Custom badge: ${badge.label}`, badge.image)] : [])]));
    },
});
