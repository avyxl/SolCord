import { afterAll, expect, mock, test } from "bun:test";
import { SRC } from "./src";
import { COMMUNITY_CHANNEL, COMMUNITY_GUILD, RECORD_PREFIX } from "../src/plugins/shared/communityBadgeFormat";

let me = "1573399159451689001", seq = 1573410012716343400n, joined = true;
const handlers = new Map<string, Set<(event: any) => void>>(), disk = new Map<string, any>();
const rows: any[] = [], posts: any[] = [], uploads: any[] = [];
let readCount = 0, verifyCount = 0, holdUpload: Promise<void> | undefined;
const state = { currentState: "active", addEventListener: () => ({ remove() { } }) };
mock.module("react-native", () => ({ AppState: state }));
mock.module(SRC + "core/vendetta/storage.ts", () => ({ createMMKVBackend: (key: string) => ({ get: () => structuredClone(disk.get(key) ?? {}), set: (value: any) => { disk.set(key, structuredClone(value)); } }) }));
mock.module(SRC + "plugins/common.tsx", () => ({
    currentUserId: () => me,
    getStore: (name: string) => name === "GuildStore" ? { getGuild: (id: string) => joined && id === COMMUNITY_GUILD ? { id } : undefined } : undefined,
    subscribe: (type: string, listener: (event: any) => void) => { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type)!.add(listener); return () => handlers.get(type)!.delete(listener); },
}));
mock.module(SRC + "plugins/shared/profiles.ts", () => ({ redrawProfiles() { } }));
const image = "https://cdn.discordapp.com/attachments/1/2/original.png";
const add = (author: string, kind: string, data: any) => { const row = { id: String(seq++), channel_id: COMMUNITY_CHANNEL, author: { id: author }, content: RECORD_PREFIX + JSON.stringify({ kind, data }), attachments: [] }; rows.push(row); return row; };
const http = {
    get: async ({ query }: any) => { readCount++; const filtered = rows.filter(row => (!query?.after || BigInt(row.id) > BigInt(query.after)) && (!query?.before || BigInt(row.id) < BigInt(query.before))); return { body: filtered.slice().reverse().slice(0, 100) }; },
    post: async ({ url, body }: any) => {
        if (url.endsWith("/attachments")) { uploads.push(body); if (holdUpload) await holdUpload; return { body: { attachments: [{ upload_url: "https://uploads.discordapp.com/test", upload_filename: "uploaded/test" }] } }; }
        posts.push(body);
        const message = { id: String(seq++), channel_id: COMMUNITY_CHANNEL, author: { id: me }, content: body.content, attachments: (body.attachments ?? []).map((a: any) => ({ filename: a.filename, url: "https://cdn.discordapp.com/attachments/1/2/" + a.filename })) };
        rows.push(message); return { body: message };
    },
    del: async ({ url }: any) => { const id = url.split('/').at(-1); const index = rows.findIndex(row => row.id === id); if (index >= 0) rows.splice(index, 1); },
};
mock.module(SRC + "plugins/hooks.tsx", () => ({ HTTP: () => http }));
class FakeXHR { status = 200; timeout = 0; onload: any; onerror: any; ontimeout: any; open() { } setRequestHeader() { } send() { queueMicrotask(() => this.onload()); } }
const realXHR = globalThis.XMLHttpRequest; globalThis.XMLHttpRequest = FakeXHR as any;
const originalFetch = globalThis.fetch;
const secret = await crypto.subtle.importKey("raw", new TextEncoder().encode("TEST-ONLY-STAFF-SECRET"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const signature = async (c: any) => Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", secret, new TextEncoder().encode(JSON.stringify([1, c.userId, c.role, c.revision, c.expires])))), b => b.toString(16).padStart(2, "0")).join("");
globalThis.fetch = (async (url: any, options: any) => {
    expect(String(url)).toStartWith("https://solcord-presence.adammohamedali01.workers.dev/v1/community/staff/");
    const body = JSON.parse(options.body);
    if (String(url).endsWith("certificate")) {
        const roles: Record<string, string> = { "TEST-ONLY-OWNER-KEY-LONG-ENTROPY": "owner", "TEST-ONLY-DEVELOPER-KEY-LONG-ENTROPY": "developer", "TEST-ONLY-CONTRIBUTOR-KEY-LONG-ENTROPY": "contributor" };
        if (!roles[body.key]) return Response.json({ message: "Invalid key" }, { status: 403 });
        const c: any = { userId: body.userId, role: roles[body.key], revision: 0, expires: Date.now() + 86400000 }; c.signature = await signature(c);
        return Response.json({ certificate: c });
    }
    verifyCount++;
    return Response.json({ results: await Promise.all(body.items.map(async (item: any) => ({ userId: item.userId, role: item.certificate.userId === item.userId && item.certificate.signature === await signature(item.certificate) ? item.certificate.role : null }))) });
}) as any;
const channel = await import(SRC + "plugins/shared/communityBadgeChannel.ts");
const staff = await import(SRC + "plugins/shared/communityStaff.ts");
const stop1 = channel.startBadgeChannel(), stop2 = channel.startBadgeChannel(), stopStaff = staff.startStaffVerification();
afterAll(() => { stopStaff(); stop1(); stop2(); globalThis.fetch = originalFetch; globalThis.XMLHttpRequest = realXHR; });

test("one shared listener, stable custom slots and Windows-compatible publishing", async () => {
    expect(handlers.get("MESSAGE_CREATE")!.size).toBe(1);
    add(me, "badge", { badges: [{ image, label: "First" }, { image, label: "Second" }] });
    await channel.refreshBadgeRecords();
    const own = channel.getBadgeRecord(me, "badge"); expect(own.badges[1].label).toBe("Second");
    await channel.publishBadgeRecord("badge", { badges: [null, own.badges[1]] });
    expect(channel.getBadgeRecord(me, "badge").badges).toEqual([null, { image, label: "Second" }]);
    expect(posts.at(-1).allowed_mentions).toEqual({ parse: [] }); expect(posts.at(-1).flags).toBe(4100);
    await expect(channel.publishBadgeRecord("badge", { badges: [null, null, null] })).rejects.toThrow("two image slots");
});
test("native image uploads use channel attachment references and preserve the other slot", async () => {
    const data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ZkAAAAASUVORK5CYII=";
    await channel.publishBadgeRecord("badge", { badges: [{ image: data, label: "New" }, { image, label: "Second" }] });
    expect(uploads.length).toBe(1); expect(posts.at(-1).content).toContain("att:badge-1.png");
    expect(channel.getBadgeRecord(me, "badge").badges[0].image).toEndWith("badge-1.png");
    expect(channel.getBadgeRecord(me, "badge").badges[1].label).toBe("Second");
});
test("staff keys are checked by the service and profiles wait for valid proof verification", async () => {
    await expect(staff.redeemStaffBadgeKey("TEST-ONLY-INVALID-KEY-LONG")).rejects.toThrow("Invalid key");
    const role = await staff.redeemStaffBadgeKey("TEST-ONLY-OWNER-KEY-LONG-ENTROPY"); expect(role).toBe("owner");
    await staff.selectStaffRoles([role]); expect(staff.selectedStaffRoles()).toEqual(["owner"]);
    expect(staff.getVerifiedStaffRoles(me)).toEqual([]);
    for (let i = 0; i < 50 && !staff.getVerifiedStaffRoles(me).length; i++) await new Promise(resolve => setTimeout(resolve, 10));
    expect(staff.getVerifiedStaffRoles(me)).toEqual(["owner"]); expect(verifyCount).toBe(1);
    expect(JSON.stringify(Array.from(disk.values()))).not.toContain("TEST-ONLY-OWNER-KEY");
    const copy = JSON.parse(rows.find(row => JSON.parse(row.content.slice(RECORD_PREFIX.length)).kind === "staff")!.content.slice(RECORD_PREFIX.length));
    const stranger = "1573399159451689002", forged = add(stranger, "staff", copy.data);
    for (const fn of handlers.get("MESSAGE_CREATE")!) fn({ message: forged });
    expect(staff.getVerifiedStaffRoles(stranger)).toEqual([]);
});
test("mismatched verification answers are not treated as staff grants", () => {
    const c: any = { userId: me, role: "owner", revision: 0, expires: Date.now() + 1000, signature: "a".repeat(64) };
    expect(staff.verifiedRolesFromReply([{ userId: me, certificate: c }], [{ userId: "1573399159451689002", role: "owner" }])).toEqual([null]);
    expect(staff.verifiedRolesFromReply([{ userId: me, certificate: c }], [{ userId: me, role: "developer" }])).toEqual([null]);
});
test("all three unlocked roles can be selected together and removed independently", async () => {
    await staff.redeemStaffBadgeKey("TEST-ONLY-DEVELOPER-KEY-LONG-ENTROPY");
    await staff.redeemStaffBadgeKey("TEST-ONLY-CONTRIBUTOR-KEY-LONG-ENTROPY");
    await staff.selectStaffRoles(["owner", "developer", "contributor", "owner"]);
    expect(staff.selectedStaffRoles()).toEqual(["owner", "developer", "contributor"]);
    await staff.selectStaffRoles(["owner", "contributor"]);
    expect(staff.selectedStaffRoles()).toEqual(["owner", "contributor"]);
    await staff.selectStaffRoles([]); expect(channel.getBadgeRecord(me, "staff")).toBeNull();
});
test("posting an owner's role with an invented proof never grants an owner badge", async () => {
    const forger = "1573399159451689002";
    const forged = add(forger, "staff", { certificates: [{ userId: forger, role: "owner", revision: 0, expires: Date.now() + 86400000, signature: "a".repeat(64) }] });
    for (const fn of handlers.get("MESSAGE_CREATE")!) fn({ message: forged });
    const before = verifyCount; expect(staff.getVerifiedStaffRoles(forger)).toEqual([]);
    for (let i = 0; i < 50 && verifyCount === before; i++) await new Promise(resolve => setTimeout(resolve, 10));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(verifyCount).toBeGreaterThan(before); expect(staff.getVerifiedStaffRoles(forger)).toEqual([]);
});
test("background refreshes pause and account switches stop in-flight image publication", async () => {
    state.currentState = "background"; const before = readCount; await channel.refreshBadgeRecords(); expect(readCount).toBe(before); state.currentState = "active";
    let release: () => void; holdUpload = new Promise<void>(resolve => { release = resolve; });
    const count = posts.length;
    const data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ZkAAAAASUVORK5CYII=";
    const pending = channel.publishBadgeRecord("badge", { badges: [{ image: data, label: "Old account" }, null] });
    for (let i = 0; i < 30 && uploads.length < 2; i++) await new Promise(resolve => setTimeout(resolve, 5));
    me = "1573399159451689003"; release!(); holdUpload = undefined;
    await expect(pending).rejects.toThrow("account changed"); expect(posts.length).toBe(count);
    expect(channel.getBadgeRecord("1573399159451689001", "badge")).toBeNull();
});
