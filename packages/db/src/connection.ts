// DigitalOcean Managed PostgreSQL injects sslmode=require in its DATABASE_URL binding. node-postgres
// (pg v8) treats require as verify-full, which rejects the DO CA-signed cert that is not in Node's
// default trust store (SELF_SIGNED_CERT_IN_CHAIN). For remote hosts this rewrites sslmode to
// no-verify — encrypted transport without certificate verification, the standard pragmatic choice
// for a disposable demo DB. Localhost URLs pass through unchanged so local dev, CI, and the
// Playwright harness keep connecting without SSL. One mechanism (a URL rewrite) covers both the
// pg.Pool consumers and the graphile-worker connection-string consumers, which parse it identically.
export function prepareDatabaseUrl(connectionString: string): string {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    return connectionString;
  }

  const host = parsed.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return connectionString;
  }

  const qIdx = connectionString.indexOf("?");
  if (qIdx >= 0) {
    const before = connectionString.substring(0, qIdx);
    const qs = connectionString.substring(qIdx);
    if (qs.includes("sslmode=")) {
      return before + qs.replace(/sslmode=[^&]*/, "sslmode=no-verify");
    }
    return connectionString + "&sslmode=no-verify";
  }
  return connectionString + "?sslmode=no-verify";
}
