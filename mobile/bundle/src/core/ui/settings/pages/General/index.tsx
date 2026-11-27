import { isSafeMode, toggleSafeMode } from "@core/debug/safeMode";
import { getLanguage, LANGUAGES, Strings, t } from "@core/i18n";
import { SolcordLogo } from "@core/ui/settings/Logo";
import About from "@core/ui/settings/pages/General/About";
import Backup from "@core/ui/settings/pages/General/Backup";
import Updates from "@core/ui/settings/pages/General/Updates";
import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import { getDebugInfo } from "@lib/api/debug";
import { BundleUpdaterManager } from "@lib/api/native/modules";
import { settings } from "@lib/api/settings";
import { openAlert } from "@lib/ui/alerts";
import { DISCORD_SERVER, GITHUB } from "@lib/utils/constants";
import { openSafeLink } from "@lib/utils/externalLinks";
import { NavigationNative } from "@metro/common";
import { AlertActionButton, AlertActions, AlertModal, Stack, TableRadioGroup, TableRadioRow, TableRow, TableRowGroup, TableSwitchRow, Text } from "@metro/common/components";
import { useEdgeInsets } from "@ui/insets";
import { ScrollView, View } from "react-native";

export default function General() {
    useProxy(settings);

    const debugInfo = getDebugInfo();
    const navigation = NavigationNative.useNavigation();
    const { bottom } = useEdgeInsets();

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 + bottom }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <View style={{ padding: 20, backgroundColor: "#15111f", borderRadius: 20, borderWidth: 1, borderColor: "#3c2b55" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <SolcordLogo size={56} />
                        <View style={{ flex: 1 }}>
                            <Text variant="heading-xl/bold" style={{ color: "#f4f1fa" }}>Solcord Mobile</Text>
                            <Text variant="text-sm/medium" style={{ color: "#62e7bc", marginTop: 4 }}>1.2.0 · Developed by avyxl</Text>
                        </View>
                    </View>
                    <Text variant="text-sm/normal" style={{ color: "#c6bfd4", marginTop: 16 }}>Your profiles, badges and tools. Built for your phone.</Text>
                </View>
                <TableRowGroup title={Strings.INFO}>
                    <TableRow
                        label={Strings.BUNNY}
                        icon={<SolcordLogo />}
                        trailing={<TableRow.TrailingText text={debugInfo.bunny.version} />}
                    />
                    <TableRow
                        label={"Discord"}
                        icon={<TableRow.Icon source={findAssetId("ClydeIcon")!} />}
                        trailing={<TableRow.TrailingText text={`${debugInfo.discord.version} (${debugInfo.discord.build})`} />}
                    />
                    <TableRow
                        arrow
                        label={Strings.ABOUT}
                        icon={<TableRow.Icon source={findAssetId("CircleInformationIcon-primary")!} />}
                        onPress={() => navigation.push("BUNNY_CUSTOM_PAGE", {
                            title: Strings.ABOUT,
                            render: () => <About />,
                        })}
                    />
                </TableRowGroup>
                <TableRowGroup title="What’s new">
                    <TableRow arrow label="Mobile 1.2.0" subLabel="Shared Solcord profiles, refreshed settings and loader fixes" icon={<TableRow.Icon source={findAssetId("SparklesIcon") ?? findAssetId("CircleInformationIcon-primary")} />} onPress={() => navigation.push("BUNNY_CUSTOM_PAGE", { title: "Solcord changelog", render: () => { const Changelog = require("./Changelog").default; return <Changelog />; } })} />
                </TableRowGroup>
                <Updates />
                <TableRadioGroup
                    title={t("Language")}
                    value={settings.language ?? "auto"}
                    onChange={(v: string) => settings.language = v as typeof settings.language}
                >
                    <TableRadioRow
                        label={t("Same as Discord")}
                        subLabel={LANGUAGES.find(l => l.code === getLanguage())?.nativeName}
                        value="auto"
                    />
                    {LANGUAGES.map(l => <TableRadioRow key={l.code} label={l.nativeName} value={l.code} />)}
                </TableRadioGroup>
                <Backup />
                <TableRowGroup title={t("Support Solcord")}>
                    <TableRow
                        arrow={true}
                        label={t("Star on GitHub")}
                        subLabel={t("Free and open source, always")}
                        icon={<TableRow.Icon source={findAssetId("StarIcon")!} />}
                        onPress={() => void openSafeLink(GITHUB)}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.LINKS}>
                    <TableRow
                        arrow={true}
                        label={Strings.DISCORD_SERVER}
                        icon={<TableRow.Icon source={findAssetId("ClydeIcon")!} />}
                        onPress={() => void openSafeLink(DISCORD_SERVER)}
                    />
                    <TableRow
                        arrow={true}
                        label={Strings.GITHUB}
                        icon={<TableRow.Icon source={findAssetId("img_account_sync_github_white")!} />}
                        onPress={() => void openSafeLink(GITHUB)}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.ACTIONS}>
                    <TableRow
                        label={Strings.RELOAD_DISCORD}
                        icon={<TableRow.Icon source={findAssetId("RetryIcon")!} />}
                        onPress={() => BundleUpdaterManager.reload()}
                    />
                    <TableSwitchRow
                        label={Strings.SAFE_MODE}
                        subLabel={settings.safeMode?.enabled ? Strings.RELOAD_IN_NORMAL_MODE_DESC : Strings.RELOAD_IN_SAFE_MODE_DESC}
                        icon={<TableRow.Icon source={findAssetId("ShieldIcon")!} />}
                        value={isSafeMode()}
                        onValueChange={(to: boolean) => {
                            toggleSafeMode({ to, reload: false });
                            openAlert(
                                "bunny-reload-safe-mode",
                                <AlertModal
                                    title={Strings.MODAL_RELOAD_REQUIRED}
                                    content={!to ? t("All add-ons will load normally.") : t("All add-ons will be turned off until you leave safe mode.")}
                                    actions={<AlertActions>
                                        <AlertActionButton
                                            text={t("Reload now")}
                                            variant="destructive"
                                            onPress={() => BundleUpdaterManager.reload()}
                                        />
                                        <AlertActionButton text={t("Later")} variant="secondary" />
                                    </AlertActions>}
                                />
                            );
                        }}
                    />
                    <TableSwitchRow
                        label={Strings.DEVELOPER_SETTINGS}
                        icon={<TableRow.Icon source={findAssetId("WrenchIcon")!} />}
                        value={settings.developerSettings}
                        onValueChange={(v: boolean) => {
                            settings.developerSettings = v;
                        }}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.MISCELLANEOUS}>
                    <TableSwitchRow
                        label={Strings.SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS}
                        subLabel={Strings.SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS_DESC}
                        icon={<TableRow.Icon source={findAssetId("WrenchIcon")!} />}
                        value={settings.enableDiscordDeveloperSettings}
                        onValueChange={(v: boolean) => {
                            settings.enableDiscordDeveloperSettings = v;
                        }}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
}
