/* Copyright (c) 2026 avyxl. SPDX-License-Identifier: GPL-3.0-or-later */
import { tx } from "@core/i18n";
import { Button, Stack, Text, TextInput } from "@metro/common/components";
import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";

import { definePlugin } from "../api";
import { extendProfileBadges, linkedBadge } from "../profileBadges";
import { STAFF_BADGE_ART } from "../shared/communityBadgeArt";
import { badgeAccountId, badgeCommunityJoined, refreshBadgeRecords, startBadgeChannel, watchBadgeRecords } from "../shared/communityBadgeChannel";
import { STAFF_ROLES, StaffCertificate, StaffRole } from "../shared/communityBadgeFormat";
import { getVerifiedStaffRoles, loadStaffState, redeemStaffBadgeKey, selectedStaffRoles, selectStaffRoles, startStaffVerification, watchStaffState } from "../shared/communityStaff";

const titles = { owner: "Solcord Owner", developer: "Solcord Developer", contributor: "Solcord Contributor" };
function OwnerBadgeSettings() {
    const [key, setKey] = useState(""), [busy, setBusy] = useState(false), [status, setStatus] = useState("");
    const [account, setAccount] = useState(badgeAccountId());
    const [certificates, setCertificates] = useState<Partial<Record<StaffRole, StaffCertificate>>>({});
    const [, redraw] = useState(0);
    useEffect(() => {
        let active = true;
        const stop = startBadgeChannel();
        const update = () => {
            const id = badgeAccountId(); setAccount(id); redraw(n => n + 1);
            void loadStaffState(id).then(state => { if (active && id === badgeAccountId()) setCertificates(state); }).catch(() => {});
        };
        const unwatch = watchBadgeRecords(update), unstaff = watchStaffState(update);
        update(); void refreshBadgeRecords().then(update).catch(() => {});
        return () => { active = false; unwatch(); unstaff(); stop(); };
    }, []);
    useEffect(() => { setKey(""); setStatus(""); }, [account]);
    const run = async (work: () => Promise<unknown>, done: string) => {
        if (busy) return; setBusy(true); setStatus("");
        try { await work(); setCertificates(await loadStaffState(account)); setStatus(done); }
        catch (error) { setStatus(error instanceof Error ? error.message : "The staff badge could not be updated."); }
        finally { setBusy(false); }
    };
    const selected = selectedStaffRoles(account);
    return <Stack spacing={12}>
        <Text variant="text-md/semibold">OwnerBadge</Text>
        <Text variant="text-sm/medium" color="text-muted">Redeem your assigned Owner, Developer or Contributor key. Select any combination of unlocked badges, including all three together. Staff proofs are verified by the Solcord service before they appear on profiles.</Text>
        {!badgeCommunityJoined() && <Text variant="text-sm/medium">Join discord.gg/solcord before publishing.</Text>}
        <TextInput label="Badge key" value={key} maxLength={160} secureTextEntry={true} autoCorrect={false} autoCapitalize="none" onChange={setKey} />
        <Button text="Redeem key" disabled={busy || !key.trim() || !badgeCommunityJoined()} onPress={() => {
            const candidate = key.trim(); setKey("");
            void run(async () => { const role = await redeemStaffBadgeKey(candidate, account); await selectStaffRoles([...new Set([...selectedStaffRoles(account), role])], account); }, "Badge unlocked and selected.");
        }} />
        {STAFF_ROLES.map(role => {
            const unlocked = !!certificates[role] && certificates[role]!.expires > Date.now(), showing = selected.includes(role);
            return <Pressable key={role} disabled={busy || !unlocked || !badgeCommunityJoined()} accessibilityRole="checkbox" accessibilityLabel={titles[role]} accessibilityState={{ checked: showing, disabled: busy || !unlocked }}
                style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: showing ? "#14f195" : "#57515f", backgroundColor: showing ? "#14f19515" : "transparent", opacity: unlocked ? 1 : 0.55 }}
                onPress={() => { void run(() => selectStaffRoles(showing ? selected.filter(value => value !== role) : [...selected, role], account), "Displayed staff badges updated."); }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Image source={{ uri: STAFF_BADGE_ART[role] }} resizeMode="contain" style={{ width: 38, height: 38 }} />
                    <Stack spacing={2}><Text variant="text-md/semibold">{titles[role]}</Text><Text variant="text-sm/medium" color="text-muted">{showing ? "Showing" : unlocked ? "Tap to show" : "Key required"}</Text></Stack>
                </View>
            </Pressable>;
        })}
        <Button size="sm" variant="secondary" text="Hide all staff badges" disabled={busy || !selected.length || !badgeCommunityJoined()} onPress={() => { void run(() => selectStaffRoles([], account), "Staff badges hidden."); }} />
        {!!status && <Text variant="text-sm/medium">{status}</Text>}
    </Stack>;
}
export default definePlugin({
    id: "solcord.owner-badge",
    name: "OwnerBadge",
    description: tx("Redeem verified Solcord staff keys and display up to three unlocked badges together on phones and PCs."),
    icon: "MedalIcon",
    tags: ["Appearance", "Customisation"],
    enabledByDefault: true,
    SettingsComponent: OwnerBadgeSettings,
    start({ cleanup }) {
        cleanup(startBadgeChannel(), startStaffVerification());
        cleanup(extendProfileBadges("solcord-owner-badge", (id, badges) => [...badges, ...getVerifiedStaffRoles(id).map(role => linkedBadge(`solcord-staff-${role}`, titles[role], STAFF_BADGE_ART[role]))]));
    },
});
