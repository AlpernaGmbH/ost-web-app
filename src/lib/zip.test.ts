import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { filesFromZip, isJunkEntry, isZip, mimeFor } from "./zip";

describe("zip", () => {
  it("recognises archives by name or type", () => {
    expect(isZip({ name: "WMS.zip", type: "" })).toBe(true);
    expect(isZip({ name: "WMS.ZIP", type: "application/octet-stream" })).toBe(true);
    expect(isZip({ name: "blob", type: "application/x-zip-compressed" })).toBe(true);
    expect(isZip({ name: "u1.pdf", type: "application/pdf" })).toBe(false);
  });

  it("drops folders, hidden files and macOS litter", () => {
    expect(isJunkEntry("WMS/")).toBe(true);
    expect(isJunkEntry("__MACOSX/WMS/._u1.pdf")).toBe(true);
    expect(isJunkEntry("WMS/.DS_Store")).toBe(true);
    expect(isJunkEntry("WMS/Thumbs.db")).toBe(true);
    expect(isJunkEntry("WMS/Uebung1.pdf")).toBe(false);
  });

  it("flattens the archive into files with sensible types", () => {
    const zip = zipSync({
      "WMS/": new Uint8Array(0),
      "WMS/Uebung1.pdf": strToU8("%PDF-1.4 fake"),
      "WMS/Lösungen/Uebung1_Loesung.PDF": strToU8("%PDF-1.4 fake 2"),
      "WMS/notizen.txt": strToU8("hallo"),
      "WMS/.DS_Store": strToU8("x"),
      "__MACOSX/WMS/._Uebung1.pdf": strToU8("y"),
    });
    const files = filesFromZip(zip);
    expect(files.map((f) => f.name)).toEqual(["Uebung1.pdf", "Uebung1_Loesung.PDF", "notizen.txt"]);
    expect(files.map((f) => f.type)).toEqual(["application/pdf", "application/pdf", "text/plain"]);
    expect(files[1].size).toBe("%PDF-1.4 fake 2".length);
    expect(mimeFor("Folien.pptx")).toContain("presentationml");
    expect(mimeFor("unbekannt")).toBe("application/octet-stream");
  });

  it("throws on data that is not a ZIP", () => {
    expect(() => filesFromZip(strToU8("not a zip"))).toThrow();
  });
});
