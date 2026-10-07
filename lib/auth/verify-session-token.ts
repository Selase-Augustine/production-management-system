/**
 * Edge/Node-safe session check for proxy.ts.
 * Never throws: missing AUTH_SECRET or a bad JWT is treated as logged out.
 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  try {
    if (!token || !secret) return false;
    const { jwtVerify } = await import("jose");
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}
