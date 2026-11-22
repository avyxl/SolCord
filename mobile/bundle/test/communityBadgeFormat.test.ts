import { describe, expect, test } from "bun:test";
import { BadgeRecordBook, COMMUNITY_CHANNEL, customBadgeSlots, parseBadgeMessage, RECORD_PREFIX, staffCertificates } from "../src/plugins/shared/communityBadgeFormat";

const owner = "1573399159451689001", stranger = "1573399159451689002";
const image = "https://cdn.discordapp.com/attachments/1/2/badge.png";
const now = 1795400000000;
const proof = (role = "owner") => ({ userId: owner, role, revision: 0, expires: now + 86400000, signature: "a".repeat(64) });
const message = (kind: string, data: any, extra = {}) => ({ id: "1573410012716343390", channel_id: COMMUNITY_CHANNEL, author: { id: owner }, content: RECORD_PREFIX + JSON.stringify({ kind, data }), ...extra });

describe("Windows-compatible mobile badge records", () => {
    test("two stable custom slots, older single-image records and attachment references", () => {
        expect(customBadgeSlots({ image, label: "Legacy" })).toEqual([{ image, label: "Legacy" }, null]);
        const data = parseBadgeMessage(message("badge", { badges: [null, { image: "att:badge-2.png", label: "Second" }] }, { attachments: [{ filename: "badge-2.png", url: image }] }), now)!.data;
        expect(data.badges).toEqual([null, { image, label: "Second" }]);
        expect(customBadgeSlots({ badges: [1, { image, label: "Second" }, { image, label: "Third" }] })).toEqual([null, { image, label: "Second" }]);
    });
    test("images cannot track profile viewers outside Discord and labels cannot hide text", () => {
        for (const url of ["https://evil.example/b.png", "file:///secret", "data:image/svg+xml,evil", "https://cdn.discordapp.com.evil.example/b.png", "https://user@cdn.discordapp.com/x"]) {
            expect(customBadgeSlots({ image: url, label: "x" })).toEqual([null, null]);
        }
        expect(customBadgeSlots({ image, label: "\u202eHidden\u200b" })[0]!.label).toBe("Hidden");
        expect(customBadgeSlots({ image, label: "x".repeat(41) })).toEqual([null, null]);
    });
    test("messages cannot publish another author's badges or bypass channel identity", () => {
        for (const extra of [{ channel_id: "1573410012716343399" }, { webhook_id: "x" }, { author: { id: owner, bot: true } }, { author: { id: "bad" } }, { content: "solcord2 {" }]) {
            expect(parseBadgeMessage(message("badge", { image, label: "x" }, extra), now)).toBeNull();
        }
        const forged = parseBadgeMessage(message("staff", { certificates: [proof()] }, { author: { id: stranger } }), now)!;
        expect(forged.userId).toBe(stranger);
        expect(forged.data.certificates).toEqual([]);
    });
    test("three distinct staff proofs are allowed; malformed and expired proofs are excluded", () => {
        expect(staffCertificates({ certificates: [proof(), proof("developer"), proof("contributor")] }, owner, now).map(c => c.role)).toEqual(["owner", "developer", "contributor"]);
        for (const change of [{ userId: stranger }, { role: "admin" }, { expires: now }, { expires: now + 100 * 86400000 }, { revision: -1 }, { revision: 0.5 }, { signature: "fake" }]) {
            expect(staffCertificates({ ...proof(), ...change }, owner, now)).toEqual([]);
        }
    });
    test("old messages cannot resurrect removed badges, while editing the current record works", () => {
        const book = new BadgeRecordBook();
        expect(book.accept(message("badge", { image, label: "First" }), now)).toBe(true);
        expect(book.accept(message("badge", null, { id: "1573410012716343391" }), now)).toBe(true);
        expect(book.accept(message("badge", { image, label: "Old" }), now)).toBe(false);
        expect(book.get(owner, "badge")!.data).toBeNull();
        expect(book.accept(message("badge", { image, label: "Edited" }, { id: "1573410012716343391" }), now)).toBe(true);
        expect(book.get(owner, "badge")!.data.badges[0].label).toBe("Edited");
    });
    test("retained records have a hard limit", () => {
        const book = new BadgeRecordBook(2);
        for (const id of [owner, stranger, "1573399159451689003"]) book.accept(message("badge", { image, label: "x" }, { author: { id } }), now);
        expect(book.records.size).toBe(2); expect(book.get(owner, "badge")).toBeUndefined();
    });
});
