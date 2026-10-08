import { describe, expect, it } from "vitest";
import { describeSignInError } from "./auth-errors";

describe("describeSignInError", () => {
  it("keeps wrong credentials generic", () => {
    expect(describeSignInError({ status: 400, code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "E-Mail oder Passwort stimmt nicht.",
    );
    expect(describeSignInError({ status: 400, message: "Invalid login credentials" })).toBe("E-Mail oder Passwort stimmt nicht.");
  });

  it("does not disguise an invalid API key as a wrong password", () => {
    const msg = describeSignInError({ status: 401, message: "Invalid API key" });
    expect(msg).toMatch(/API-Key/);
    expect(msg).not.toMatch(/Passwort stimmt nicht/);
    expect(describeSignInError({ message: "Invalid API key" })).toMatch(/API-Key/);
  });

  it("explains an unconfirmed account", () => {
    expect(describeSignInError({ status: 400, code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(/nicht bestätigt/);
  });

  it("reports outages and rate limits separately", () => {
    expect(describeSignInError({ status: 0 })).toMatch(/Verbindung/);
    expect(describeSignInError({})).toMatch(/Verbindung/);
    expect(describeSignInError({ status: 503 })).toMatch(/Verbindung/);
    expect(describeSignInError({ status: 429, code: "over_request_rate_limit" })).toMatch(/Zu viele/);
  });

  it("exposes the code for anything unexpected", () => {
    expect(describeSignInError({ status: 422, code: "validation_failed" })).toBe("Anmeldung abgelehnt (validation_failed).");
    expect(describeSignInError({ status: 418 })).toBe("Anmeldung abgelehnt (HTTP 418).");
  });
});
