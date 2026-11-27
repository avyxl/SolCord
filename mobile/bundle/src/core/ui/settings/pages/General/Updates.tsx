/*
 * Solcord for Android
 * Copyright (c) 2026 rootpoi and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { t } from "@core/i18n";
import { findAssetId } from "@lib/api/assets";
import { BundleUpdaterManager } from "@lib/api/native/modules";
import { showToast } from "@lib/ui/toasts";
import { safeFetch } from "@lib/utils";
import { BUILDS_URL } from "@lib/utils/constants";
import { TableRow, TableRowGroup } from "@metro/common/components";
import { useState } from "react";

type State =
    | { kind: "idle"; }
    | { kind: "checking"; }
    | { kind: "current"; }
    | { kind: "available"; builtAt?: string; }
    | { kind: "failed"; };

/**
 * Solcord PC's updater, for the bundle: the loader downloads the newest Solcord whenever the app starts, so updating
 * means reloading once a newer build is published.
 */
export default function Updates() {
    const [state, setState] = useState<State>({ kind: "idle" });
    const installedSequence = __SOLCORD_BUNDLED_SEQUENCE__;

    const check = async () => {
        setState({ kind: "checking" });
        try {
            const info = await safeFetch(`${BUILDS_URL}/solcord-release.json?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json());
            if (info?.format !== 1 || !Number.isSafeInteger(info?.sequence) || info.sequence < 0) throw new Error("No current release information");
            if (info.sequence <= installedSequence) {
                setState({ kind: "current" });
                showToast(t("No updates found"), findAssetId("CheckmarkLargeIcon"));
            } else {
                setState({ kind: "available", builtAt: info.builtAt });
            }
        } catch {
            setState({ kind: "failed" });
        }
    };

    const status = {
        idle: t("Installed mobile client: 1.2.0. Verified updates are checked when the app starts."),
        checking: t("Loading..."),
        current: t("Up to date"),
        available: t("There is 1 Update"),
        failed: t("Couldn't check for updates. Check your connection and try again."),
    }[state.kind];

    return <TableRowGroup title={t("Updates")}>
        <TableRow
            label={t("Check for Updates")}
            subLabel={status}
            icon={<TableRow.Icon source={findAssetId("RetryIcon")!} />}
            disabled={state.kind === "checking"}
            onPress={check}
        />
        {state.kind === "available" && <TableRow
            arrow
            label={t("Update Now")}
            subLabel={t("Reload the app to fully apply changes")}
            icon={<TableRow.Icon source={findAssetId("DownloadIcon")!} />}
            onPress={() => BundleUpdaterManager.reload()}
        />}
    </TableRowGroup>;
}
