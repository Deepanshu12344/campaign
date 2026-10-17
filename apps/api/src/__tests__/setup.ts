import { assertSafeDatabaseUrl } from '../utils/db-guard';

// Enforce local database safety guard before any tests execute
const targetUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/campaigns';
assertSafeDatabaseUrl(targetUrl, 'automated tests');
