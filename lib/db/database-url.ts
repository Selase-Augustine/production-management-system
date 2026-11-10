const BUILD_PLACEHOLDER =
  "postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public";

/** Resolve DATABASE_URL for Prisma. Missing/invalid values use a local placeholder so `next build` can import the client without env (pages are force-dynamic and do not query at build). */
export function resolveDatabaseUrl(raw = process.env.DATABASE_URL): string {
  if (!raw?.trim()) return BUILD_PLACEHOLDER;
  try {
    const url = new URL(raw);
    const sessionPooler = url.hostname.includes("pooler.supabase.com") && url.port === "5432";
    if (sessionPooler) url.port = "6543";
    if (sessionPooler && !url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
    return url.toString();
  } catch {
    return raw;
  }
}
