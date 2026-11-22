/* Copyright (c) 2026 avyxl. SPDX-License-Identifier: GPL-3.0-or-later */
import { getNativeModule } from "@lib/api/native/modules";
import { base64ToBytes } from "../customProfile/sharingFormat";

/** Every option is explicit: Discord's native picker expects the defaults supplied by its JS wrapper. */
export function pickBadgeImage(): Promise<string | undefined> {
    const picker = getNativeModule("ImagePickerManager");
    if (typeof picker?.launchImageLibrary !== "function") return Promise.reject(new Error("The photo picker is unavailable in this Discord version."));
    return new Promise((resolve, reject) => picker.launchImageLibrary({
        mediaType: "photo", videoQuality: "high", quality: 0.85, maxWidth: 128, maxHeight: 128,
        includeBase64: true, cameraType: "back", selectionLimit: 1, saveToPhotos: false, durationLimit: 0,
        includeExtra: false, presentationStyle: "pageSheet", assetRepresentationMode: "compatible",
    }, (result: any) => {
        if (result?.didCancel) return resolve(undefined);
        const asset = result?.assets?.[0];
        if (result?.errorCode || !asset?.base64) return reject(new Error("That image could not be selected."));
        const mime = String(asset.type ?? "image/jpeg").toLowerCase();
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(mime) || asset.base64.length > 175000
            || asset.width > 512 || asset.height > 512) return reject(new Error("Choose a PNG or JPG that can be resized to a small badge."));
        const bytes = base64ToBytes(asset.base64);
        const png = bytes && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
        const jpg = bytes && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        if (!png && !jpg) return reject(new Error("The selected file is not a PNG or JPG image."));
        resolve(`data:${png ? "image/png" : "image/jpeg"};base64,${asset.base64}`);
    }));
}
