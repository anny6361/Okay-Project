import { collection, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export const DB_CACHE: Record<string, any> = {};

let isInitialized = false;
let globalRenderTrigger: () => void = () => {};
const FIRESTORE_BATCH_LIMIT = 450;

type FirestoreWrite = {
  ref: any;
  data: any;
};

export function setGlobalRenderTrigger(trigger: () => void) {
  globalRenderTrigger = trigger;
}

const COLLECTION_MAPPING = {
  'okey_db_users': 'users',
  'okey_db_departments': 'departments',
  'okey_requests': 'requests_combined',
  'okey_budgets': 'departments',
  'okey_db_company_data': 'companySettings',
  'okey_db_categories_master': 'masterData',
  'okey_db_expense_types': 'masterData',
  'okey_db_approval_levels': 'masterData',
  'okey_db_roles_master': 'masterData',
  'okey_db_rules': 'companySettings',
  'okey_db_enterprise_audit_logs': 'auditLogs',
  'okey_db_logs': 'logs',
  'okey_db_refunds': 'refunds',
  'okey_db_deductions': 'deductions',
  'okey_db_journal_entries': 'journalEntries',
  'okey_db_accounting_docs': 'reports',
  'okey_db_pdf_templates': 'systemSettings',
  'okey_db_replacement_policy': 'systemSettings'
} as const;

function departmentId(d: any): string | undefined {
  return d?.department_id || d?.id;
}
function departmentName(d: any): string {
  return d?.department_name || d?.name || d?.department || '';
}
function departmentBudget(d: any): number {
  return Number(d?.budget ?? d?.budgetLimit ?? d?.allocated ?? 0) || 0;
}
function departmentSpent(d: any): number {
  return Number(d?.budgetSpent ?? d?.spent ?? 0) || 0;
}
function departmentPending(d: any): number {
  return Number(d?.budgetPending ?? d?.pending ?? 0) || 0;
}
function requestDate(r: any): number {
  const value = r?.date || r?.created_at || r?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

async function commitFirestoreWrites(writes: FirestoreWrite[]) {
  for (let start = 0; start < writes.length; start += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = writes.slice(start, start + FIRESTORE_BATCH_LIMIT);
    chunk.forEach(({ ref, data }) => {
      batch.set(ref, data, { merge: true });
    });
    await batch.commit();
  }
}

async function deleteFirestoreDocuments(refs: any[]) {
  for (let start = 0; start < refs.length; start += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = refs.slice(start, start + FIRESTORE_BATCH_LIMIT);
    chunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

export function setupFirestoreSync() {
  if (isInitialized) return;
  isInitialized = true;

  onSnapshot(collection(db, 'users'), (snap) => {
    DB_CACHE['okey_db_users'] = snap.docs.map(d => d.data());
    globalRenderTrigger();
  }, (error) => console.error('Firestore users sync error:', error));

  onSnapshot(collection(db, 'departments'), (snap) => {
    const departments = snap.docs.map(d => ({
      ...d.data(),
      id: d.id,
      department_id: d.data().department_id || d.id
    }));
    DB_CACHE['okey_db_departments'] = departments;
    DB_CACHE['okey_budgets'] = departments.map(d => ({
      department: departmentName(d),
      allocated: departmentBudget(d),
      spent: departmentSpent(d),
      pending: departmentPending(d),
      color: d.color || ''
    }));
    globalRenderTrigger();
  }, (error) => console.error('Firestore departments sync error:', error));

  const syncRequests = () => {
    const combined = [
      ...(DB_CACHE['_exp'] || []),
      ...(DB_CACHE['_adv'] || []),
      ...(DB_CACHE['_clr'] || [])
    ];
    DB_CACHE['okey_requests'] = combined.sort((a, b) => requestDate(b) - requestDate(a));
    globalRenderTrigger();
  };

  onSnapshot(collection(db, 'expenseRequests'), (snap) => {
    DB_CACHE['_exp'] = snap.docs.map(d => ({ ...d.data(), id: d.data().id || d.id }));
    syncRequests();
  }, (error) => console.error('Firestore expenseRequests sync error:', error));

  onSnapshot(collection(db, 'advanceRequests'), (snap) => {
    DB_CACHE['_adv'] = snap.docs.map(d => ({ ...d.data(), id: d.data().id || d.id }));
    syncRequests();
  }, (error) => console.error('Firestore advanceRequests sync error:', error));

  onSnapshot(collection(db, 'advanceClearings'), (snap) => {
    DB_CACHE['_clr'] = snap.docs.map(d => ({ ...d.data(), id: d.data().id || d.id }));
    syncRequests();
  }, (error) => console.error('Firestore advanceClearings sync error:', error));

  onSnapshot(collection(db, 'auditLogs'), (snap) => {
    DB_CACHE['okey_db_enterprise_audit_logs'] = snap.docs.map(d => ({
      ...d.data(),
      id: d.data().id || d.data().log_id || d.id
    }));
    globalRenderTrigger();
  }, (error) => console.error('Firestore auditLogs sync error:', error));

  onSnapshot(collection(db, 'masterData'), (snap) => {
    snap.docs.forEach(d => {
      if (d.id === 'categories') DB_CACHE['okey_db_categories_master'] = d.data().items || [];
      if (d.id === 'expenseTypes') DB_CACHE['okey_db_expense_types'] = d.data().items || [];
      if (d.id === 'approvalLevels') DB_CACHE['okey_db_approval_levels'] = d.data().items || [];
      if (d.id === 'roles') DB_CACHE['okey_db_roles_master'] = d.data().items || [];
    });
    globalRenderTrigger();
  }, (error) => console.error('Firestore masterData sync error:', error));

  onSnapshot(collection(db, 'companySettings'), (snap) => {
    snap.docs.forEach(d => {
      if (d.id === 'main') DB_CACHE['okey_db_company_data'] = d.data() || {};
      if (d.id === 'rules') DB_CACHE['okey_db_rules'] = d.data().items || [];
    });
    globalRenderTrigger();
  }, (error) => console.error('Firestore companySettings sync error:', error));

  onSnapshot(collection(db, 'notifications'), (snap) => {
    DB_CACHE['notifications'] = snap.docs.map(d => ({ ...d.data(), id: d.data().id || d.id }));
    globalRenderTrigger();
  }, (error) => console.error('Firestore notifications sync error:', error));
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) return data.map(item => sanitizeForFirestore(item)) as any;
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as any)) {
      if (value !== undefined && typeof value !== 'function') {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as any;
  }
  return data;
}

export async function saveToFirestore(localKey: string, data: any) {
  const previousRequests = localKey === 'okey_requests' && Array.isArray(DB_CACHE[localKey])
    ? DB_CACHE[localKey]
    : [];

  DB_CACHE[localKey] = data;

  try {
    localStorage.setItem(localKey, JSON.stringify(data));
  } catch (e) {
    console.warn(`localStorage save error for ${localKey}:`, e);
  }

  setTimeout(() => globalRenderTrigger(), 0);

  try {
    if (localKey === 'okey_requests') {
      const currentIds = new Set((data || []).map((req: any) => req?.id).filter(Boolean));
      const deletedRefs: any[] = [];

      previousRequests.forEach((req: any) => {
        if (!req?.id || currentIds.has(req.id)) return;
        const targetColl = req.expense_type === 'advance'
          ? 'advanceRequests'
          : req.expense_type === 'clearing'
            ? 'advanceClearings'
            : 'expenseRequests';
        deletedRefs.push(doc(db, targetColl, req.id));
      });

      if (deletedRefs.length > 0) {
        await deleteFirestoreDocuments(deletedRefs);
      }

      // Save the complete request set in Firestore batches instead of one network
      // request per record. This reduces partial-save failures and UI stalls.
      const requestWrites: FirestoreWrite[] = [];
      for (const req of data || []) {
        if (!req?.id) continue;
        const targetColl = req.expense_type === 'advance'
          ? 'advanceRequests'
          : req.expense_type === 'clearing'
            ? 'advanceClearings'
            : 'expenseRequests';
        requestWrites.push({
          ref: doc(db, targetColl, req.id),
          data: sanitizeForFirestore(req)
        });
      }

      if (requestWrites.length > 0) {
        await commitFirestoreWrites(requestWrites);
      }
      return;
    }

    const writes: FirestoreWrite[] = [];
    const addWrite = (ref: any, value: any) => {
      writes.push({ ref, data: value });
    };

    if (localKey === 'okey_db_users') {
      (data || []).forEach((u: any) => {
        if (!u?.user_id) return;
        const cleanUser = sanitizeForFirestore(u);
        addWrite(doc(db, 'users', u.user_id), cleanUser);
        addWrite(doc(db, 'employees', u.user_id), cleanUser);
      });
    } else if (localKey === 'okey_db_departments') {
      (data || []).forEach((d: any) => {
        const id = departmentId(d);
        if (!id) return;
        const cleanDept = sanitizeForFirestore({ ...d, department_id: d.department_id || id });
        addWrite(doc(db, 'departments', id), cleanDept);
      });
    } else if (localKey === 'okey_db_enterprise_audit_logs') {
      (data || []).forEach((log: any) => {
        const id = log?.id || log?.log_id || Math.random().toString(36).substring(2, 11);
        const cleanLog = sanitizeForFirestore({ ...log, id, log_id: log?.log_id || id });
        addWrite(doc(db, 'auditLogs', id), cleanLog);
      });
    } else if (localKey === 'okey_db_company_data') {
      addWrite(doc(db, 'companySettings', 'main'), sanitizeForFirestore(data));
    } else if (localKey === 'okey_db_categories_master') {
      addWrite(doc(db, 'masterData', 'categories'), sanitizeForFirestore({ items: data }));
    } else if (localKey === 'okey_db_expense_types') {
      addWrite(doc(db, 'masterData', 'expenseTypes'), sanitizeForFirestore({ items: data }));
    } else if (localKey === 'okey_db_approval_levels') {
      addWrite(doc(db, 'masterData', 'approvalLevels'), sanitizeForFirestore({ items: data }));
    } else if (localKey === 'okey_db_roles_master') {
      addWrite(doc(db, 'masterData', 'roles'), sanitizeForFirestore({ items: data }));
    } else if (localKey === 'okey_db_rules') {
      addWrite(doc(db, 'companySettings', 'rules'), sanitizeForFirestore({ items: data }));
    }

    if (writes.length > 0) {
      await commitFirestoreWrites(writes);
    }
  } catch (error) {
    console.error(`Error saving ${localKey} to Firestore:`, error);
  }
}

export function getFromCache(localKey: string, defaultValue: any = null) {
  // Once Firestore has delivered a snapshot, that snapshot is authoritative even
  // when the collection is empty. This prevents deleted data from being resurrected
  // from stale localStorage.
  if (Object.prototype.hasOwnProperty.call(DB_CACHE, localKey)) {
    return DB_CACHE[localKey];
  }

  try {
    const local = localStorage.getItem(localKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed) {
        DB_CACHE[localKey] = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Error reading ${localKey} from localStorage fallback:`, e);
  }

  return defaultValue;
}
