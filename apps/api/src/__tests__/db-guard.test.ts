import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assertSafeDatabaseUrl } from '../utils/db-guard';

describe('Database Safety Guard (assertSafeDatabaseUrl)', () => {
  const originalEnv = process.env.I_KNOW_THIS_IS_PRODUCTION;

  beforeEach(() => {
    delete process.env.I_KNOW_THIS_IS_PRODUCTION;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.I_KNOW_THIS_IS_PRODUCTION = originalEnv;
    } else {
      delete process.env.I_KNOW_THIS_IS_PRODUCTION;
    }
  });

  it('permits localhost database URLs', () => {
    expect(() => {
      assertSafeDatabaseUrl('postgresql://postgres:password@localhost:5432/campaigns');
    }).not.toThrow();
  });

  it('permits 127.0.0.1 database URLs', () => {
    expect(() => {
      assertSafeDatabaseUrl('postgresql://postgres:password@127.0.0.1:5432/campaigns');
    }).not.toThrow();
  });

  it('permits docker postgres service host', () => {
    expect(() => {
      assertSafeDatabaseUrl('postgresql://postgres:password@postgres:5432/campaigns');
    }).not.toThrow();
  });

  it('strictly blocks supabase.co host without I_KNOW_THIS_IS_PRODUCTION flag', () => {
    expect(() => {
      assertSafeDatabaseUrl('postgresql://postgres:secret@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres');
    }).toThrow(/Refusing to run tests against non-local or production database host/);
  });

  it('strictly blocks arbitrary remote hosts without I_KNOW_THIS_IS_PRODUCTION flag', () => {
    expect(() => {
      assertSafeDatabaseUrl('postgresql://user:pass@db.production-cloud.com:5432/db');
    }).toThrow(/Refusing to run tests against non-local or production database host/);
  });

  it('permits remote database if I_KNOW_THIS_IS_PRODUCTION=true is explicitly provided', () => {
    process.env.I_KNOW_THIS_IS_PRODUCTION = 'true';
    expect(() => {
      assertSafeDatabaseUrl('postgresql://postgres:secret@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres');
    }).not.toThrow();
  });
});
