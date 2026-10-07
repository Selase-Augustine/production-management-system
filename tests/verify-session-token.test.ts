import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { verifySessionToken } from "@/lib/auth/verify-session-token";

const secret = "test-auth-secret-at-least-32-chars!!";

describe("verifySessionToken", () => {
  it("treats missing AUTH_SECRET as unauthenticated", async () => {
    expect(await verifySessionToken("any.token.value", undefined)).toBe(false);
    expect(await verifySessionToken("any.token.value", "")).toBe(false);
  });

  it("treats missing token as unauthenticated", async () => {
    expect(await verifySessionToken(undefined, secret)).toBe(false);
  });

  it("does not throw on invalid JWT", async () => {
    await expect(verifySessionToken("not-a-jwt", secret)).resolves.toBe(false);
  });

  it("accepts a valid HS256 session JWT", async () => {
    const token = await new SignJWT({ id: "u1", email: "a@b.c", role: "ADMIN", name: "A" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));
    expect(await verifySessionToken(token, secret)).toBe(true);
  });
});
