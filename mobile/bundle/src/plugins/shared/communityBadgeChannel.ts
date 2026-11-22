/* Copyright (c) 2026 avyxl. SPDX-License-Identifier: GPL-3.0-or-later */
import { createMMKVBackend } from "@core/vendetta/storage";
import { AppState } from "react-native";

import { currentUserId, getStore, subscribe } from "../common";
import { HTTP } from "../hooks";
import { base64ToBytes } from "../customProfile/sharingFormat";
import { redrawProfiles } from "./profiles";
import { BadgeKind, BadgeRecordBook, COMMUNITY_CHANNEL, COMMUNITY_GUILD, isUserId, newerId, RECORD_PREFIX, safeBadgeImage } from "./communityBadgeFormat";

export const badgeAccountId = () => currentUserId() ?? "";
export const badgeCommunityJoined = () => !!getStore("GuildStore")?.getGuild?.(COMMUNITY_GUILD);
const book = new BadgeRecordBook();
const listeners = new Set<() => void>();
let references = 0, account = "", generation = 0, newest = "", fullAt = 0;
let ready: Promise<void> = Promise.resolve(), syncing: Promise<void> | undefined;
let initial: ReturnType<typeof setTimeout> | undefined, passive: ReturnType<typeof setTimeout> | undefined;
let periodic: ReturnType<typeof setInterval> | undefined, persistTimer: ReturnType<typeof setTimeout> | undefined;
let writes: Promise<unknown> = Promise.resolve(), persistence: Promise<unknown> = Promise.resolve();
const unsubscribers: Array<() => void> = [];
const messages = `/channels/${COMMUNITY_CHANNEL}/messages`;
const backend = (id: string) => createMMKVBackend(`SOLCORD_COMMUNITY_BADGES_${id}`, {});
const foreground = () => AppState.currentState !== "background" && AppState.currentState !== "inactive";
const current = (id: string, run: number) => references > 0 && badgeAccountId() === id && account === id && generation === run;
function changed() {
    for (const listener of listeners) { try { listener(); } catch { } }
    redrawProfiles();
}
export function watchBadgeRecords(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function getBadgeRecord(id: string, kind: BadgeKind) {
    return account === badgeAccountId() && badgeCommunityJoined() ? book.get(id, kind)?.data ?? null : null;
}
function persistNow() {
    clearTimeout(persistTimer); persistTimer = undefined;
    if (!isUserId(account)) return;
    const store = backend(account), snapshot = { channel: COMMUNITY_CHANNEL, newest, fullAt, records: Array.from(book.records.values()) };
    persistence = persistence.catch(() => {}).then(() => store.set(snapshot));
    void persistence.catch(() => {});
}
function persistSoon() { persistTimer ??= setTimeout(persistNow, 2000); }
async function connected() {
    persistNow();
    const run = ++generation, id = account = badgeAccountId();
    newest = ""; fullAt = 0; book.clear(); changed();
    if (!isUserId(id)) return;
    const saved: any = await Promise.resolve().then(() => backend(id).get()).catch(() => null);
    if (!current(id, run)) return;
    if (saved?.channel === COMMUNITY_CHANNEL && Array.isArray(saved.records)) {
        for (const record of saved.records.slice(-1000)) {
            if (!isUserId(record?.id) || !isUserId(record?.userId) || !["badge", "staff"].includes(record.kind)) continue;
            const content = RECORD_PREFIX + JSON.stringify({ kind: record.kind, data: record.data });
            if (content.length <= 2000) book.accept({ id: record.id, channel_id: COMMUNITY_CHANNEL, author: { id: record.userId }, content });
        }
        newest = isUserId(saved.newest) ? saved.newest : "";
        fullAt = Number.isFinite(saved.fullAt) ? Math.min(saved.fullAt, Date.now()) : 0;
    }
    changed();
}
function accept(message: any) {
    if (message?.channel_id !== COMMUNITY_CHANNEL || !isUserId(message?.id)) return false;
    if (!newest || newerId(message.id, newest)) newest = message.id;
    const updated = book.accept(message);
    if (updated) { changed(); persistSoon(); }
    return updated;
}
function http() {
    const api = HTTP();
    if (!api?.get || !api?.post) throw new Error("Discord's network module is not ready. Try again shortly.");
    return api;
}
async function sync() {
    await ready;
    if (!references || !badgeCommunityJoined() || !foreground()) return;
    const id = badgeAccountId(), run = generation;
    if (!isUserId(id) || id !== account) return;
    const full = !newest || Date.now() - fullAt > 12 * 3600000;
    let before: string | undefined, cursor = newest, complete = false;
    const seen = new Set<string>();
    for (let page = 0; page < 10; page++) {
        if (!current(id, run) || !foreground()) return;
        const response = await http().get({ url: messages, query: { limit: 100, ...(full ? before ? { before } : {} : { after: cursor }) }, oldFormErrors: true });
        if (!current(id, run)) return;
        const rows = response?.body;
        if (!Array.isArray(rows)) throw new Error("Discord returned an invalid badges channel response.");
        for (const message of rows.slice(0, 100)) { if (isUserId(message?.id)) seen.add(message.id); accept(message); }
        if (rows.length < 100) { complete = true; break; }
        const ids = rows.map((row: any) => row?.id).filter(isUserId);
        if (!ids.length) break;
        before = ids.reduce((min: string, value: string) => newerId(min, value) ? value : min);
        const next = ids.reduce((max: string, value: string) => !max || newerId(value, max) ? value : max, cursor);
        if (!full && next === cursor) break;
        cursor = next;
        await new Promise(resolve => setTimeout(resolve, 750));
    }
    if (!current(id, run)) return;
    if (full && complete) {
        fullAt = Date.now();
        for (const [key, record] of book.records) if (!seen.has(record.id)) book.records.delete(key);
        changed();
    }
    persistSoon();
}
export function refreshBadgeRecords() {
    if (account !== badgeAccountId()) ready = connected();
    return syncing ??= sync().finally(() => { syncing = undefined; });
}
function kick() {
    if (passive || !references) return;
    passive = setTimeout(() => { passive = undefined; void refreshBadgeRecords().catch(() => {}); }, 1000);
}
export function startBadgeChannel() {
    if (++references === 1) {
        ready = connected();
        initial = setTimeout(() => { void refreshBadgeRecords().catch(() => {}); }, 8000);
        periodic = setInterval(() => { void refreshBadgeRecords().catch(() => {}); }, 10 * 60000);
        unsubscribers.push(
            subscribe("CONNECTION_OPEN", () => { ready = connected(); kick(); }),
            subscribe("MESSAGE_CREATE", event => { if (event.message?.channel_id === COMMUNITY_CHANNEL) accept(event.message); }),
            subscribe("MESSAGE_UPDATE", event => { if ((event.channelId ?? event.message?.channel_id) === COMMUNITY_CHANNEL) event.message?.author ? accept(event.message) : kick(); }),
            subscribe("MESSAGE_DELETE", event => { if (event.channelId === COMMUNITY_CHANNEL && book.remove(event.id)) { changed(); persistSoon(); kick(); } }),
            subscribe("MESSAGE_DELETE_BULK", event => { if (event.channelId === COMMUNITY_CHANNEL) { for (const id of event.ids ?? []) book.remove(id); changed(); persistSoon(); kick(); } }),
            subscribe("GUILD_CREATE", event => { if (event.guild?.id === COMMUNITY_GUILD) kick(); }),
            subscribe("GUILD_DELETE", event => { if ((event.guildId ?? event.guild?.id) === COMMUNITY_GUILD) { book.clear(); changed(); } }),
        );
        const state = AppState.addEventListener("change", status => { if (status === "active") kick(); });
        unsubscribers.push(() => state.remove());
    }
    let stopped = false;
    return () => {
        if (stopped) return; stopped = true;
        if (--references) return;
        persistNow(); generation++;
        for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
        clearTimeout(initial); clearTimeout(passive); clearInterval(periodic);
        initial = passive = periodic = undefined;
        book.clear(); account = ""; newest = "";
    };
}
function assertAccount(expected: string) {
    if (!isUserId(expected) || badgeAccountId() !== expected) throw new Error("Your Discord account changed. Open the badge settings again.");
    if (!badgeCommunityJoined()) throw new Error("Join discord.gg/solcord before publishing badges.");
}
async function uploadImage(data: string, filename: string, expected: string) {
    const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match || data.length > 180000) throw new Error("Choose a small PNG or JPG image.");
    const bytes = base64ToBytes(match[2]);
    if (!bytes?.length) throw new Error("That image could not be read.");
    assertAccount(expected);
    const response = await http().post({ url: `/channels/${COMMUNITY_CHANNEL}/attachments`, body: { files: [{ id: "0", filename, file_size: bytes.length, is_clip: false }] }, oldFormErrors: true });
    const slot = response?.body?.attachments?.[0];
    let url: URL;
    try { url = new URL(slot?.upload_url); } catch { throw new Error("Discord did not provide an upload address."); }
    if (url.protocol !== "https:" || url.username || url.password || typeof slot.upload_filename !== "string") throw new Error("Discord returned an invalid upload address.");
    assertAccount(expected);
    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhr.open("PUT", url.href); xhr.setRequestHeader("Content-Type", match[1]); xhr.timeout = 30000;
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("The image upload failed."));
        xhr.onerror = xhr.ontimeout = () => reject(new Error("The image upload failed or timed out.")); xhr.send(bytes);
    });
    assertAccount(expected);
    return { filename, uploaded_filename: slot.upload_filename };
}
export function publishBadgeRecord(kind: BadgeKind, input: Record<string, any> | null, expected = badgeAccountId()) {
    const job = writes.catch(() => {}).then(async () => {
        assertAccount(expected); await refreshBadgeRecords(); assertAccount(expected);
        const data = input === null ? null : JSON.parse(JSON.stringify(input));
        const files: Array<{ filename: string; uploaded_filename: string; }> = [];
        if (kind === "badge" && data) {
            if (!Array.isArray(data.badges) || data.badges.length > 2) throw new Error("CustomBadge supports two image slots.");
            for (let i = 0; i < data.badges.length; i++) {
                const badge = data.badges[i]; if (!badge) continue;
                if (typeof badge.label !== "string" || !badge.label.trim() || badge.label.length > 40) throw new Error("Use a badge name from 1 to 40 characters.");
                if (typeof badge.image === "string" && badge.image.startsWith("data:")) {
                    const name = `badge-${i + 1}.${badge.image.startsWith("data:image/png;") ? "png" : "jpg"}`;
                    const file = await uploadImage(badge.image, name, expected); files.push(file); badge.image = `att:${file.filename}`;
                } else if (!safeBadgeImage(badge.image)) throw new Error("Choose a badge image from your photos.");
            }
        }
        const content = RECORD_PREFIX + JSON.stringify({ kind, data });
        if (content.length > 2000) throw new Error("This badge record is too large.");
        assertAccount(expected);
        const previous = book.get(expected, kind)?.id;
        const response = await http().post({ url: messages, body: { content, flags: 4100, allowed_mentions: { parse: [] }, attachments: files.map((file, i) => ({ id: String(i), ...file })) }, oldFormErrors: true });
        assertAccount(expected);
        const message = response?.body;
        if (message?.author?.id !== expected || message.channel_id !== COMMUNITY_CHANNEL || !isUserId(message.id)) throw new Error("Discord did not confirm the badge post.");
        accept(message);
        if (previous && previous !== message.id) await http().del({ url: `${messages}/${previous}`, oldFormErrors: true }).catch(() => {});
    });
    writes = job;
    return job;
}
