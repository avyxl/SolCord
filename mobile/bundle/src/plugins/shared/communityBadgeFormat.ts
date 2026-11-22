/* Copyright (c) 2026 avyxl. SPDX-License-Identifier: GPL-3.0-or-later */
// The same records that the Windows client publishes. Identity comes from Discord's message author.
export const COMMUNITY_GUILD = "1573399159451689152";
export const COMMUNITY_CHANNEL = "1573410012716343389";
export const COMMUNITY_INVITE = "https://discord.gg/solcord";
export const RECORD_PREFIX = "solcord2 ";
export const STAFF_ROLES = ["owner", "developer", "contributor"] as const;
export type StaffRole = typeof STAFF_ROLES[number];
export type BadgeKind = "badge" | "staff";
export const isUserId = (id: unknown): id is string => typeof id === "string" && /^\d{16,22}$/.test(id);
export const newerId = (a: string, b: string) => a.length !== b.length ? a.length > b.length : a > b;
export interface ImageBadge { image: string; label: string; }
export type BadgeSlots = [ImageBadge | null, ImageBadge | null];
export interface StaffCertificate { userId: string; role: StaffRole; revision: number; expires: number; signature: string; }
export interface BadgeRecord { id: string; userId: string; kind: BadgeKind; data: any; }
const HIDDEN = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;
export const safeBadgeImage = (value: unknown): value is string => typeof value === "string"
    && /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/[\w\-./?=&%]{1,600}$/.test(value);
export function customBadgeSlots(raw: any): BadgeSlots {
    const values = Array.isArray(raw?.badges) ? raw.badges : raw?.image ? [raw] : [];
    const check = (value: any): ImageBadge | null => {
        if (!value || !safeBadgeImage(value.image) || typeof value.label !== "string" || value.label.length > 40) return null;
        const label = value.label.replace(HIDDEN, "").trim();
        return label ? { image: value.image, label } : null;
    };
    return [check(values[0]), check(values[1])];
}
export function staffCertificates(raw: any, authorId: string, now = Date.now()): StaffCertificate[] {
    const values = Array.isArray(raw?.certificates) ? raw.certificates.slice(0, 3) : raw?.userId ? [raw] : [];
    return STAFF_ROLES.flatMap(role => {
        const c = values.find((item: any) => item?.userId === authorId && item.role === role);
        return c && isUserId(authorId) && Number.isSafeInteger(c.revision) && c.revision >= 0
            && Number.isSafeInteger(c.expires) && c.expires > now && c.expires <= now + 91 * 86400000
            && typeof c.signature === "string" && /^[a-f0-9]{64}$/.test(c.signature)
            ? [{ userId: authorId, role, revision: c.revision, expires: c.expires, signature: c.signature }] : [];
    });
}
export function parseBadgeMessage(message: any, now = Date.now()): BadgeRecord | null {
    if (message?.channel_id !== COMMUNITY_CHANNEL || message.webhook_id || message.author?.bot
        || !isUserId(message.author?.id) || !isUserId(message.id) || typeof message.content !== "string"
        || !message.content.startsWith(RECORD_PREFIX) || message.content.length > 2000) return null;
    let payload: any;
    try { payload = JSON.parse(message.content.slice(RECORD_PREFIX.length)); } catch { return null; }
    if (!payload || !["badge", "staff"].includes(payload.kind) || !Object.hasOwn(payload, "data")
        || payload.data !== null && (typeof payload.data !== "object" || Array.isArray(payload.data))) return null;
    let data = null;
    if (payload.data !== null && payload.kind === "badge") {
        const input = payload.data;
        const values = Array.isArray(input.badges) ? input.badges.slice(0, 2) : input.image ? [input] : [];
        const badges = values.map((item: any) => {
            if (!item || typeof item !== "object") return null;
            let image = item.image;
            if (typeof image === "string" && image.startsWith("att:")) {
                image = message.attachments?.find((file: any) => file.filename === image.slice(4))?.url;
            }
            return { image, label: item.label };
        });
        data = { badges: customBadgeSlots({ badges }) };
    } else if (payload.data !== null) data = { certificates: staffCertificates(payload.data, message.author.id, now) };
    return { id: message.id, userId: message.author.id, kind: payload.kind, data };
}
export class BadgeRecordBook {
    readonly records = new Map<string, BadgeRecord>();
    constructor(readonly limit = 1000) { }
    get(userId: string, kind: BadgeKind) { return this.records.get(`${userId}:${kind}`); }
    accept(message: any, now = Date.now()) {
        const next = parseBadgeMessage(message, now);
        if (!next) return false;
        const key = `${next.userId}:${next.kind}`, old = this.records.get(key);
        if (old && old.id !== next.id && !newerId(next.id, old.id)) return false;
        if (old?.id === next.id && JSON.stringify(old.data) === JSON.stringify(next.data)) return false;
        this.records.delete(key); this.records.set(key, next);
        while (this.records.size > this.limit) this.records.delete(this.records.keys().next().value!);
        return true;
    }
    remove(messageId: string) {
        for (const [key, record] of this.records) if (record.id === messageId) { this.records.delete(key); return record.userId; }
        return null;
    }
    clear() { this.records.clear(); }
}
