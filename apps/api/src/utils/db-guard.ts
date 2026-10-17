import { URL } from 'url';

/**
 * Validates that the current database URL points to a local test database.
 * Blocks execution if pointing to Supabase or any non-local host unless
 * I_KNOW_THIS_IS_PRODUCTION=true is explicitly set.
 */
export function assertSafeDatabaseUrl(dbUrl?: string, operation = 'tests'): void {
  const urlStr = dbUrl || process.env.DATABASE_URL;
  if (!urlStr) {
    return;
  }

  try {
    const parsed = new URL(urlStr);
    const host = (parsed.hostname || '').toLowerCase();

    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === 'postgres' ||
      host.endsWith('.local');

    const isSupabase = host.includes('supabase.co') || host.includes('pooler.supabase.com');

    if (!isLocal || isSupabase) {
      if (process.env.I_KNOW_THIS_IS_PRODUCTION !== 'true') {
        throw new Error(
          `\n🚨 [CRITICAL DB GUARD ERROR]\n` +
          `Refusing to run ${operation} against non-local or production database host: "${host}".\n` +
          `Automated tests and local reset scripts MUST run against a local PostgreSQL database\n` +
          `(e.g., via docker compose or local postgres on localhost:5432).\n` +
          `To override this safety guard, you must explicitly set I_KNOW_THIS_IS_PRODUCTION=true in your environment.\n`
        );
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('[CRITICAL DB GUARD ERROR]')) {
      throw err;
    }
  }
}
