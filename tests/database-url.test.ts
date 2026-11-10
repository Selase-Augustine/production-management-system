import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "@/lib/db/database-url";

describe("resolveDatabaseUrl", () => {
  it("uses a placeholder when DATABASE_URL is missing so next build can import Prisma", () => {
    expect(resolveDatabaseUrl(undefined)).toMatch(/^postgresql:\/\//);
    expect(resolveDatabaseUrl("")).toMatch(/^postgresql:\/\//);
  });

  it("rewrites the Supabase session pooler to the transaction pooler", () => {
    const resolved = resolveDatabaseUrl(
      "postgresql://postgres.abc:secret@aws-0-eu-west-3.pooler.supabase.com:5432/postgres",
    );
    expect(resolved).toContain(":6543/");
    expect(resolved).toContain("pgbouncer=true");
    expect(resolved).toContain("connection_limit=1");
  });

  it("leaves a transaction-pooler URL on 6543", () => {
    const resolved = resolveDatabaseUrl(
      "postgresql://postgres.abc:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true",
    );
    expect(resolved).toContain(":6543/");
    expect(resolved).toContain("connection_limit=1");
  });
});
