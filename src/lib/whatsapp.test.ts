import { describe, expect, it } from "vitest";
import { normalizeWhatsappNumber, whatsappLink } from "./whatsapp";

describe("normalizeWhatsappNumber", () => {
  it("keeps the digits and drops the international prefix", () => {
    expect(normalizeWhatsappNumber("+41 79 000 00 00")).toBe("41790000000");
    expect(normalizeWhatsappNumber("0041790000000")).toBe("41790000000");
    expect(normalizeWhatsappNumber("41790000000")).toBe("41790000000");
    expect(normalizeWhatsappNumber("+41 (0)79-000-00-00")).toBe("410790000000"); // kept as typed: the operator must not write the (0)
  });

  it("rejects unset, national and implausible values", () => {
    expect(normalizeWhatsappNumber(undefined)).toBeNull();
    expect(normalizeWhatsappNumber("")).toBeNull();
    expect(normalizeWhatsappNumber("079 000 00 00")).toBeNull(); // no country code
    expect(normalizeWhatsappNumber("1234")).toBeNull();
    expect(normalizeWhatsappNumber("+41 79 abc")).toBeNull();
    expect(normalizeWhatsappNumber("1234567890123456")).toBeNull(); // longer than E.164 allows
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link with the message url-encoded", () => {
    expect(whatsappLink("41790000000", "Hallo, Zeile 1\nZeile 2")).toBe("https://wa.me/41790000000?text=Hallo%2C%20Zeile%201%0AZeile%202");
  });
});
