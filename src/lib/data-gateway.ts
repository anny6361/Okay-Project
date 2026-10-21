import { getFromCache, saveToFirestore } from './firestore-sync';

/**
 * Single application boundary for client-side persistence.
 *
 * Components should call this module instead of deciding where data is stored.
 * Firestore remains authoritative; localStorage is only a fallback handled by
 * firestore-sync.ts.
 *
 * This is intentionally a compatibility layer first. Existing behavior is
 * preserved while features are migrated into domain services incrementally.
 */

export const DATA_KEYS = Object.freeze({
  USERS: 'okey_db_users',
  REQUESTS: 'okey_requests',
  BUDGETS: 'okey_budgets',
  DEPARTMENTS: 'okey_db_departments',
  NOTIFICATIONS: 'notifications',
  COMPANY: 'okey_db_company_data',
  RULES: 'okey_db_rules'
});

export function readData<T>(key: string, fallback: T): T {
  return getFromCache(key, fallback) as T;
}

export async function writeData<T>(key: string, value: T): Promise<void> {
  await saveToFirestore(key, value);
}

export function readRequests<T = any[]>(fallback: T = [] as T): T {
  return readData(DATA_KEYS.REQUESTS, fallback);
}

export function readBudgets<T = any[]>(fallback: T = [] as T): T {
  return readData(DATA_KEYS.BUDGETS, fallback);
}

export function readUsers<T = any[]>(fallback: T = [] as T): T {
  return readData(DATA_KEYS.USERS, fallback);
}

export async function writeRequests<T>(value: T): Promise<void> {
  await writeData(DATA_KEYS.REQUESTS, value);
}

export async function writeBudgets<T>(value: T): Promise<void> {
  await writeData(DATA_KEYS.BUDGETS, value);
}

/**
 * Returns a stable boundary for future domain services.
 * New features should depend on this module rather than firestore-sync.
 */
export const dataGateway = Object.freeze({
  read: readData,
  write: writeData,
  readRequests,
  readBudgets,
  readUsers,
  writeRequests,
  writeBudgets
});
