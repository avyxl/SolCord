/* Copyright 2026 avyxl. SPDX-License-Identifier: GPL-3.0-or-later */
import SolcordIcon from "@assets/icons/solcord.png";
import { Image } from "react-native";
export const SOLCORD_LOGO_SOURCE = { uri: SolcordIcon };
export function SolcordLogo({ size = 28 }: { size?: number; }) {
    return <Image source={SOLCORD_LOGO_SOURCE} accessibilityLabel="Solcord logo" resizeMode="contain" style={{ width: size, height: size, borderRadius: size / 4, tintColor: undefined }} />;
}
