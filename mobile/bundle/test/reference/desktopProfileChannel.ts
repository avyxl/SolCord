/*
 * Solcord, a Discord client mod
 * Copyright (c) 2026 avyxl and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { CloudUploadPlatform } from "@solcord/discord-types/enums";
import { CloudUploader, Constants, FluxDispatcher, GuildStore, RestAPI, UserStore } from "@webpack/common";

export const SOLCORD_GUILD = "1573399159451689152";
export const SOLCORD_PROFILES_CHANNEL = "1573410012716343389";
export const SOLCORD_INVITE = "https://discord.gg/BNapnPqGku";
export const SOLCORD_PROFILES_URL = `https://discord.com/channels/${SOLCORD_GUILD}/${SOLCORD_PROFILES_CHANNEL}`;
export type RecordKind = "profile" | "badge" | "staff";
interface Entry { id: string; userId: string; kind: RecordKind; data: any; }
const PREFIX = "solcord2 ";
const ID = /^\d{16,22}$/;
const CDN = /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/[\w\-./?=&%]{1,600}$/;
const entries = new Map<string, Entry>();
const listeners = new Set<(ids: string[]) => void>();
let users = 0, generation = 0, account = "", newest = "", fullAt = 0;
let syncJob: Promise<void> | undefined;
let initial: ReturnType<typeof setTimeout> | undefined, passive: ReturnType<typeof setTimeout> | undefined;
let periodic: ReturnType<typeof setInterval> | undefined, persist: ReturnType<typeof setTimeout> | undefined;
let writes = Promise.resolve();
export const currentChannelUser = () => UserStore.getCurrentUser()?.id || "";
export const isChannelMember = () => !!GuildStore.getGuild(SOLCORD_GUILD);
const key = (id: string, kind: RecordKind) => `${id}:${kind}`;
const storageKey = () => `Solcord:channel:v2:${account}`;
const newer = (a: string, b: string) => a.length !== b.length ? a.length > b.length : a > b;
let notifyPending = false;
const notifyIds = new Set<string>();
function notify(ids: string[]) {
    ids.forEach(id => notifyIds.add(id));
    if (notifyPending) return;
    notifyPending = true;
    queueMicrotask(() => {
        notifyPending = false;
        const batch = Array.from(notifyIds); notifyIds.clear();
        listeners.forEach(fn => fn(batch));
        try { UserStore.emitChange(); } catch { }
    });
}
export function onChannelProfilesChanged(fn: (ids: string[]) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function profileChannelStatus() { return { joined: isChannelMember(), activeReaders: users, accountMatches: Boolean(account && account === currentChannelUser()), records: entries.size, lastFullSyncAt: fullAt || null, syncInProgress: Boolean(syncJob) }; }
export function channelProfileIds() { return [...new Set(Array.from(entries.values(), e => e.userId))]; }
export function getChannelRecord(id: string, kind: RecordKind) { return isChannelMember() && currentChannelUser() === account ? entries.get(key(id, kind))?.data ?? null : null; }
export function safeChannelImage(url: unknown): url is string { return typeof url === "string" && CDN.test(url); }
function schedulePersist() {
    if (persist) return;
    const owner = account;
    persist = setTimeout(() => {
        persist = undefined;
        if (owner !== account) return;
        void DataStore.set(storageKey(), { newest, fullAt, entries: Array.from(entries.values()) }).catch(() => {});
    }, 2000);
}

function imageFields(kind: RecordKind, data: Record<string, any>) {
    if (kind === "profile") return ["avatar", "banner"].map(key => ({ object: data, key, name: key }));
    if (kind !== "badge") return [];
    if (!Array.isArray(data.badges)) return [{ object: data, key: "image", name: "image" }];
    return data.badges.slice(0, 2).flatMap((badge: any, index: number) => badge && typeof badge === "object" && !Array.isArray(badge)
        ? [{ object: badge, key: "image", name: `badge-${index + 1}` }] : []);
}

export function acceptChannelMessage(message: any) {
    if (!message || message.channel_id !== SOLCORD_PROFILES_CHANNEL || message.webhook_id || message.author?.bot
        || !ID.test(message.author?.id || "") || !ID.test(message.id || "") || typeof message.content !== "string") return false;
    if (!newest || newer(message.id, newest)) newest = message.id;
    if (!message.content.startsWith(PREFIX) || message.content.length > 2000) return false;
    let payload: any;
    try { payload = JSON.parse(message.content.slice(PREFIX.length)); } catch { return false; }
    if (!payload || !["profile", "badge", "staff"].includes(payload.kind) || !Object.hasOwn(payload, "data")) return false;
    const k = key(message.author.id, payload.kind), previous = entries.get(k);
    if (previous && !newer(message.id, previous.id) && message.id !== previous.id) return false;
    const { data } = payload;
    if (data !== null && (typeof data !== "object" || Array.isArray(data))) return false;
    if (data) for (const { object, key } of imageFields(payload.kind, data)) {
        const ref = object[key];
        if (typeof ref === "string" && ref.startsWith("att:")) {
            const file = message.attachments?.find((a: any) => a.filename === ref.slice(4));
            object[key] = safeChannelImage(file?.url) ? file.url : undefined;
        }
    }
    if (previous && previous.id === message.id && JSON.stringify(previous.data) === JSON.stringify(data)) return false;
    entries.delete(k);
    entries.set(k, { id: message.id, userId: message.author.id, kind: payload.kind, data });
    while (entries.size > 1000) entries.delete(entries.keys().next().value!);
    notify([message.author.id]); schedulePersist();
    return true;
}
async function syncChannel() {
    if (!users || !isChannelMember() || currentChannelUser() !== account || document.hidden) return;
    const gen = generation;
    const full = !newest || Date.now() - fullAt > 12 * 3600000;
    let before: string | undefined;
    let cursor = newest;
    const seen = new Set<string>();
    let oldestRead = "";
    // At most five 100-message pages per pass; no unbounded history walk or render-time requests.
    for (let page = 0; page < 5; page++) {
        const { body } = await RestAPI.get({ url: Constants.Endpoints.MESSAGES(SOLCORD_PROFILES_CHANNEL), query: { limit: 100, ...(full ? (before ? { before } : {}) : { after: cursor }) }, retries: 0 });
        if (gen !== generation || currentChannelUser() !== account) return;
        if (!Array.isArray(body)) return;
        for (const message of body) { seen.add(message.id); acceptChannelMessage(message); }
        if (body.length) oldestRead = body[body.length - 1].id;
        if (!body.length || body.length < 100) break;
        before = body[body.length - 1].id;
        const next = body.reduce((max: string, m: any) => ID.test(m.id || "") && (!max || newer(m.id, max)) ? m.id : max, cursor);
        if (!full && next === cursor) break;
        cursor = next;
        await new Promise(resolve => setTimeout(resolve, 750));
    }
    if (full) {
        fullAt = Date.now();
        for (const [k, entry] of entries) if ((!oldestRead || !newer(oldestRead, entry.id)) && !seen.has(entry.id)) {
            entries.delete(k); notify([entry.userId]);
        }
    }
    schedulePersist();
}
export function refreshChannelProfiles() {
    syncJob ??= syncChannel().catch(() => {}).finally(() => { syncJob = undefined; });
    return syncJob;
}
async function connected() {
    const gen = ++generation;
    account = currentChannelUser(); newest = ""; fullAt = 0; entries.clear(); notify([]);
    if (!ID.test(account)) return;
    const saved = await DataStore.get<any>(storageKey()).catch(() => null);
    if (gen !== generation) return;
    // Bound retained metadata; old embedded images or malformed local entries are not loaded.
    if (Array.isArray(saved?.entries)) for (const entry of saved.entries.slice(-1000)) {
        if (ID.test(entry?.userId || "") && ID.test(entry?.id || "") && ["profile", "badge", "staff"].includes(entry.kind)
            && entry.data !== undefined && JSON.stringify(entry.data).length <= 2000) entries.set(key(entry.userId, entry.kind), entry);
    }
    newest = ID.test(saved?.newest || "") ? saved.newest : "";
    fullAt = Number(saved?.fullAt) || 0;
    notify(channelProfileIds());
    clearTimeout(initial);
    initial = setTimeout(() => { void refreshChannelProfiles(); }, 8000);
}
function changedChannel(event: any) {
    if ((event.channelId ?? event.message?.channel_id) !== SOLCORD_PROFILES_CHANNEL) return;
    if (event.message?.author) acceptChannelMessage(event.message);
    else kick();
}
function deleted(event: any) {
    if (event.channelId !== SOLCORD_PROFILES_CHANNEL) return;
    for (const [k, entry] of entries) if (entry.id === event.id) { entries.delete(k); notify([entry.userId]); schedulePersist(); }
}
function kick() {
    if (passive || !users) return;
    passive = setTimeout(() => { passive = undefined; void refreshChannelProfiles(); }, 1500 + Math.random() * 2500);
}
function passiveUpdate(event: any) {
    const channel = event.channels?.find((c: any) => c.id === SOLCORD_PROFILES_CHANNEL);
    const id = channel?.lastMessageId ?? channel?.last_message_id;
    if (ID.test(id || "") && (!newest || newer(id, newest))) kick();
}
function guildCreated(event: any) { if ((event.guild?.id ?? event.guildId) === SOLCORD_GUILD) kick(); }
function visible() { if (!document.hidden) kick(); }
export function startProfileChannel() {
    if (++users === 1) {
        void connected();
        FluxDispatcher.subscribe("CONNECTION_OPEN", connected);
        FluxDispatcher.subscribe("MESSAGE_CREATE", changedChannel);
        FluxDispatcher.subscribe("MESSAGE_UPDATE", changedChannel);
        FluxDispatcher.subscribe("MESSAGE_DELETE", deleted);
        FluxDispatcher.subscribe("GUILD_CREATE", guildCreated);
        FluxDispatcher.subscribe("PASSIVE_UPDATE_V1", passiveUpdate);
        FluxDispatcher.subscribe("PASSIVE_UPDATE_V2", passiveUpdate);
        document.addEventListener("visibilitychange", visible);
        periodic = setInterval(kick, 10 * 60000);
    }
    let stopped = false;
    return () => {
        if (stopped) return; stopped = true;
        if (--users) return;
        generation++;
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", connected);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", changedChannel);
        FluxDispatcher.unsubscribe("MESSAGE_UPDATE", changedChannel);
        FluxDispatcher.unsubscribe("MESSAGE_DELETE", deleted);
        FluxDispatcher.unsubscribe("GUILD_CREATE", guildCreated);
        FluxDispatcher.unsubscribe("PASSIVE_UPDATE_V1", passiveUpdate);
        FluxDispatcher.unsubscribe("PASSIVE_UPDATE_V2", passiveUpdate);
        document.removeEventListener("visibilitychange", visible);
        clearTimeout(initial); clearTimeout(passive); passive = undefined;
        clearInterval(periodic); clearTimeout(persist); persist = undefined;
        entries.clear(); newest = "";
    };
}
function uploadImage(data: string, name: string) {
    const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match || data.length > 180000) throw new Error("The image must be a small PNG or JPG.");
    const file = new File([Uint8Array.from(atob(match[2]), c => c.charCodeAt(0))], name + (match[1] === "image/png" ? ".png" : ".jpg"), { type: match[1] });
    return new Promise<{ filename: string; uploaded_filename: string; }>((resolve, reject) => {
        const item = new CloudUploader({ file, isThumbnail: false, platform: CloudUploadPlatform.WEB }, SOLCORD_PROFILES_CHANNEL);
        const timer = setTimeout(() => reject(new Error("Image upload timed out. Try again.")), 30000);
        item.on("complete", () => { clearTimeout(timer); resolve({ filename: item.filename, uploaded_filename: item.uploadedFilename }); });
        item.on("error", () => { clearTimeout(timer); reject(new Error("Could not upload the image.")); });
        item.upload();
    });
}
export function publishChannelRecord(kind: RecordKind, value: Record<string, any> | null, expected = currentChannelUser()) {
    const job = writes.catch(() => {}).then(async () => {
        if (currentChannelUser() !== expected || !ID.test(expected)) throw new Error("Your Discord account changed. Save again from the intended account.");
        if (!isChannelMember()) throw new Error("Join the Solcord server to share profiles and badges.");
        await refreshChannelProfiles();
        const data = value ? { ...value } : null;
        if (kind === "badge" && Array.isArray(data?.badges)) {
            if (data.badges.length > 2) throw new Error("You can publish at most two custom badges.");
            data.badges = data.badges.map((badge: any) => badge ? { ...badge } : null);
        }
        const files: { filename: string; uploaded_filename: string; }[] = [];
        if (data) for (const { object, key, name } of imageFields(kind, data)) {
            if (typeof object[key] === "string" && object[key].startsWith("data:")) {
                const uploaded = await uploadImage(object[key], name); files.push(uploaded); object[key] = `att:${uploaded.filename}`;
            }
        }
        const content = PREFIX + JSON.stringify({ kind, data });
        if (content.length > 2000) throw new Error("This shared profile is too large. Shorten its bio or remove some cosmetic fields.");
        if (currentChannelUser() !== expected) throw new Error("Your Discord account changed. Save again.");
        const previous = entries.get(key(expected, kind))?.id;
        const { body } = await RestAPI.post({ url: Constants.Endpoints.MESSAGES(SOLCORD_PROFILES_CHANNEL), body: { content, flags: 4100, allowed_mentions: { parse: [] }, attachments: files.map((f, i) => ({ id: String(i), ...f })) }, retries: 0 });
        if (body?.author?.id !== expected || body?.channel_id !== SOLCORD_PROFILES_CHANNEL || !ID.test(body.id || "")) throw new Error("Discord did not confirm the profile post.");
        if (currentChannelUser() === expected) acceptChannelMessage(body);
        if (previous && previous !== body.id) await RestAPI.del({ url: Constants.Endpoints.MESSAGE(SOLCORD_PROFILES_CHANNEL, previous) }).catch(() => {});
    });
    writes = job;
    return job;
}
