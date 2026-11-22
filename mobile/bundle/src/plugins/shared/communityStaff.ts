/* Copyright (c) 2026 avyxl. SPDX-License-Identifier: GPL-3.0-or-later */
import { createMMKVBackend } from "@core/vendetta/storage";

import { badgeAccountId, getBadgeRecord, publishBadgeRecord, watchBadgeRecords } from "./communityBadgeChannel";
import { isUserId, STAFF_ROLES, staffCertificates, StaffCertificate, StaffRole } from "./communityBadgeFormat";
import { redrawProfiles } from "./profiles";

const SERVICE = "https://solcord-presence.adammohamedali01.workers.dev/v1/community/staff/";
const states = new Map<string, Partial<Record<StaffRole, StaffCertificate>>>();
const loads = new Map<string, Promise<Partial<Record<StaffRole, StaffCertificate>>>>();
const listeners = new Set<() => void>();
const verified = new Map<string, { record: any; roles: StaffRole[]; expires: number; }>();
const pending = new Map<string, any>();
const inFlight = new Map<string, any>();
let running = false, users = 0, generation = 0, timer: ReturnType<typeof setTimeout> | undefined;
const storage = (id: string) => createMMKVBackend(`SOLCORD_STAFF_CERTIFICATES_${id}`, {});
const notify = () => { for (const listener of listeners) listener(); redrawProfiles(); };
export function watchStaffState(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export async function staffRequest(route: "certificate" | "verify", body: unknown) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(SERVICE + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal, credentials: "omit", redirect: "error" });
        const text = await response.text();
        if (text.length > 64000) throw new Error("The staff badge service returned too much data.");
        let result: any;
        try { result = JSON.parse(text); } catch { throw new Error("The staff badge service returned an invalid response."); }
        if (!response.ok) throw new Error(typeof result.message === "string" ? result.message.slice(0, 200) : "The staff badge service is unavailable.");
        return result;
    } finally { clearTimeout(timeout); }
}
export async function loadStaffState(id = badgeAccountId()) {
    if (!isUserId(id)) return {};
    if (states.has(id)) return states.get(id)!;
    if (loads.has(id)) return loads.get(id)!;
    const task = (async () => {
        const raw: any = await Promise.resolve().then(() => storage(id).get()).catch(() => null);
        const certificates = staffCertificates({ certificates: Object.values(raw?.certificates ?? {}) }, id);
        const state = Object.fromEntries(certificates.map(c => [c.role, c])) as Partial<Record<StaffRole, StaffCertificate>>;
        states.set(id, state);
        while (states.size > 4) states.delete(states.keys().next().value!);
        return state;
    })();
    loads.set(id, task);
    try { return await task; } finally { if (loads.get(id) === task) loads.delete(id); }
}
export async function redeemStaffBadgeKey(key: string, expected = badgeAccountId()): Promise<StaffRole> {
    if (!isUserId(expected) || expected !== badgeAccountId()) throw new Error("Your Discord account changed.");
    if (key.trim().length < 20 || key.trim().length > 160) throw new Error("Enter your assigned Solcord badge key.");
    const response = await staffRequest("certificate", { userId: expected, key: key.trim() });
    if (badgeAccountId() !== expected) throw new Error("Your Discord account changed. Redeem the key from the intended account.");
    const certificate = staffCertificates(response.certificate, expected)[0];
    if (!certificate) throw new Error("The badge service returned an invalid certificate.");
    const state = await loadStaffState(expected);
    if (badgeAccountId() !== expected) throw new Error("Your Discord account changed.");
    const next = { ...state, [certificate.role]: certificate };
    await storage(expected).set({ certificates: next }); states.set(expected, next); notify();
    return certificate.role;
}
export const selectedStaffRoles = (id = badgeAccountId()) => staffCertificates(getBadgeRecord(id, "staff"), id).map(c => c.role);
export async function selectStaffRoles(roles: StaffRole[], expected = badgeAccountId()) {
    if (roles.some(role => !STAFF_ROLES.includes(role))) throw new Error("Unknown Solcord staff badge.");
    const state = await loadStaffState(expected);
    const selected = STAFF_ROLES.filter(role => roles.includes(role));
    const certificates = selected.map(role => {
        const certificate = state[role];
        if (!certificate || certificate.expires <= Date.now()) throw new Error("Redeem this badge's key again before selecting it.");
        return certificate;
    });
    await publishBadgeRecord("staff", certificates.length ? { certificates } : null, expected);
}
export function verifiedRolesFromReply(items: Array<{ userId: string; certificate: StaffCertificate; }>, results: unknown) {
    if (!Array.isArray(results) || results.length !== items.length) return items.map(() => null);
    return items.map((item, index) => results[index]?.userId === item.userId && results[index]?.role === item.certificate.role ? item.certificate.role : null);
}
async function flush() {
    if (!users || running || !pending.size) return;
    running = true;
    const run = generation;
    const batches = Array.from(pending).slice(0, 6).map(([userId, record]) => ({ userId, record, certificates: staffCertificates(record, userId) }));
    for (const batch of batches) { pending.delete(batch.userId); inFlight.set(batch.userId, batch.record); }
    const items = batches.flatMap(batch => batch.certificates.map(certificate => ({ userId: batch.userId, certificate })));
    try {
        const result = items.length ? await staffRequest("verify", { items }) : { results: [] };
        if (!users || run !== generation) return;
        const answers = verifiedRolesFromReply(items, result.results);
        let index = 0;
        for (const batch of batches) {
            const roles = batch.certificates.flatMap(() => { const role = answers[index++]; return role ? [role] : []; });
            verified.delete(batch.userId);
            verified.set(batch.userId, { record: batch.record, roles, expires: Math.min(Date.now() + 300000, ...batch.certificates.map(c => c.expires)) });
        }
    } catch {
        if (users && run === generation) for (const batch of batches) verified.set(batch.userId, { record: batch.record, roles: [], expires: Date.now() + 60000 });
    } finally {
        running = false;
        for (const batch of batches) if (inFlight.get(batch.userId) === batch.record) inFlight.delete(batch.userId);
        if (run === generation) {
            while (verified.size > 300) verified.delete(verified.keys().next().value!);
            notify();
        }
        if (pending.size && users && !timer) timer = setTimeout(() => { timer = undefined; void flush(); }, 150);
    }
}
export function getVerifiedStaffRoles(userId: string): StaffRole[] {
    const record = getBadgeRecord(userId, "staff");
    if (!users || !record || !staffCertificates(record, userId).length) return [];
    const cached = verified.get(userId);
    if (!cached || cached.record !== record || cached.expires <= Date.now()) {
        if (inFlight.get(userId) !== record) {
            pending.set(userId, record);
            if (!timer) timer = setTimeout(() => { timer = undefined; void flush(); }, 80);
        }
        return [];
    }
    return cached.roles;
}
export function startStaffVerification() {
    users++;
    const stop = watchBadgeRecords(() => {
        for (const [id, entry] of verified) if (entry.record !== getBadgeRecord(id, "staff")) verified.delete(id);
    });
    let stopped = false;
    return () => {
        if (stopped) return; stopped = true; stop();
        if (--users) return;
        generation++; pending.clear(); inFlight.clear(); verified.clear(); clearTimeout(timer); timer = undefined;
    };
}
