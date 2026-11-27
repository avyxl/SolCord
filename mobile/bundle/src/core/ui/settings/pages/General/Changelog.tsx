/* Copyright 2026 avyxl. SPDX-License-Identifier: GPL-3.0-or-later */
import { Stack, Text } from "@metro/common/components";
import { ScrollView, View } from "react-native";
const changes = [
    ["Shared profiles that match desktop", "New profile posts use Solcord’s current format. Names, pictures, colors, dates and cosmetics can be read across supported Solcord desktop and mobile clients."],
    ["Your saved profiles stay", "Older profile messages remain readable. New saves publish the Solcord format; email and phone fields stay local."],
    ["A visible Solcord logo", "Settings use the full-color local logo without Discord tinting it. The logo is bundled and needs no image download."],
    ["New mobile settings", "A clearer Solcord home, readable purple and mint colors, a visible release number and these changelog notes."],
    ["Fresh embedded client", "The rebuilt loaders include this client and reject downloaded bundles older than the embedded release baseline."],
    ["Bounded profile reads", "Profile synchronization has a fixed page budget instead of walking the whole channel without a practical limit."],
    ["Existing mobile tools", "CustomBadge, OwnerBadge, themes and the existing phone plugin library remain available with their platform requirements."]
];
export default function Changelog() {
    return <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }}><Stack spacing={18}>
        <Text variant="heading-xl/bold">Solcord Mobile 1.2.0</Text>
        {changes.map(([title,body]) => <View key={title} style={{ borderLeftWidth: 3, borderLeftColor: "#9945ff", paddingLeft: 14 }}><Text variant="heading-md/bold">{title}</Text><Text variant="text-md/normal" color="text-muted" style={{ marginTop: 5 }}>{body}</Text></View>)}
    </Stack></ScrollView>;
}
