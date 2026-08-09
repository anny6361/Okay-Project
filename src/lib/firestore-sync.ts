import { collection, onSnapshot, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const DB_CACHE: Record<string, any> = {};

let isInitialized = false;
let globalRenderTrigger: () => void = () => {};

export function setGlobalRenderTrigger(trigger: () => void) {
  globalRenderTrigger = trigger;
}

const COLLECTION_MAPPING = {
  'okey_db_users': 'users',
  'okey_db_departments': 'departments',
  'okey_requests': 'requests_combined', // We'll split this later
  'okey_budgets': 'departments', // budgets map to departments collection in full-stack
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
};

export function setupFirestoreSync() {
  if (isInitialized) return;
  isInitialized = true;

  // Sync Users
  onSnapshot(collection(db, 'users'), (snap) => {
    DB_CACHE['okey_db_users'] = snap.docs.map(d => d.data());
    globalRenderTrigger();
  });

  // Sync Departments
  onSnapshot(collection(db, 'departments'), (snap) => {
    DB_CACHE['okey_db_departments'] = snap.docs.map(d => d.data());
    DB_CACHE['okey_budgets'] = snap.docs.map(d => ({
      department: d.data().name,
      limit: d.data().budgetLimit || 0,
      spent: d.data().budgetSpent || 0,
      pending: d.data().budgetPending || 0
    }));
    globalRenderTrigger();
  });

  // Sync Requests (Combined from 3 collections as requested)
  const syncRequests = () => {
    const combined = [
      ...(DB_CACHE['_exp'] || []),
      ...(DB_CACHE['_adv'] || []),
      ...(DB_CACHE['_clr'] || [])
    ];
    DB_CACHE['okey_requests'] = combined.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    globalRenderTrigger();
  };

  onSnapshot(collection(db, 'expenseRequests'), (snap) => {
    DB_CACHE['_exp'] = snap.docs.map(d => d.data());
    syncRequests();
  });
  onSnapshot(collection(db, 'advanceRequests'), (snap) => {
    DB_CACHE['_adv'] = snap.docs.map(d => d.data());
    syncRequests();
  });
  onSnapshot(collection(db, 'advanceClearings'), (snap) => {
    DB_CACHE['_clr'] = snap.docs.map(d => d.data());
    syncRequests();
  });

  // Sync Audit Logs
  onSnapshot(collection(db, 'auditLogs'), (snap) => {
    DB_CACHE['okey_db_enterprise_audit_logs'] = snap.docs.map(d => d.data());
    globalRenderTrigger();
  });

  // Sync Master Data
  onSnapshot(collection(db, 'masterData'), (snap) => {
    snap.docs.forEach(doc => {
      if (doc.id === 'categories') DB_CACHE['okey_db_categories_master'] = doc.data().items || [];
      if (doc.id === 'expenseTypes') DB_CACHE['okey_db_expense_types'] = doc.data().items || [];
      if (doc.id === 'approvalLevels') DB_CACHE['okey_db_approval_levels'] = doc.data().items || [];
      if (doc.id === 'roles') DB_CACHE['okey_db_roles_master'] = doc.data().items || [];
    });
    globalRenderTrigger();
  });

  // Sync Company Settings
  onSnapshot(collection(db, 'companySettings'), (snap) => {
    snap.docs.forEach(doc => {
      if (doc.id === 'main') DB_CACHE['okey_db_company_data'] = doc.data() || {};
      if (doc.id === 'rules') DB_CACHE['okey_db_rules'] = doc.data().items || [];
    });
    globalRenderTrigger();
  });

  // Notifications
  onSnapshot(collection(db, 'notifications'), (snap) => {
    DB_CACHE['notifications'] = snap.docs.map(d => d.data());
    globalRenderTrigger();
  });
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && typeof value !== 'function') {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as any;
  }
  return data;
}

export async function saveToFirestore(localKey: string, data: any) {
  DB_CACHE[localKey] = data; // Optimistic memory cache
  
  // Always update localStorage as local persistence fallback
  try {
    localStorage.setItem(localKey, JSON.stringify(data));
  } catch (e) {
    console.warn(`localStorage save error for ${localKey}:`, e);
  }

  globalRenderTrigger();

  try {
    if (localKey === 'okey_requests') {
      // Save requests individually to handle large base64 image receipts without hitting batch size limits
      for (const req of data) {
        if (!req.id) continue;
        const targetColl = req.expense_type === 'advance' ? 'advanceRequests' : req.expense_type === 'clearing' ? 'advanceClearings' : 'expenseRequests';
        try {
          const cleanReq = sanitizeForFirestore(req);
          await setDoc(doc(db, targetColl, req.id), cleanReq, { merge: true });
        } catch (docErr) {
          console.error(`Failed to save individual request ${req.id} to Firestore:`, docErr);
        }
      }
      return;
    }

    const batch = writeBatch(db);
    
    if (localKey === 'okey_db_users') {
      data.forEach((u: any) => {
        if (u.user_id) {
          const cleanUser = sanitizeForFirestore(u);
          batch.set(doc(db, 'users', u.user_id), cleanUser, { merge: true });
          batch.set(doc(db, 'employees', u.user_id), cleanUser, { merge: true });
        }
      });
    } 
    else if (localKey === 'okey_db_departments') {
      data.forEach((d: any) => {
        if (d.id) {
          const cleanDept = sanitizeForFirestore(d);
          batch.set(doc(db, 'departments', d.id), cleanDept, { merge: true });
        }
      });
    }
    else if (localKey === 'okey_db_enterprise_audit_logs') {
      data.forEach((log: any) => {
        const id = log.id || Math.random().toString(36).substring(7);
        const cleanLog = sanitizeForFirestore({ ...log, id });
        batch.set(doc(db, 'auditLogs', id), cleanLog, { merge: true });
      });
    }
    else if (localKey === 'okey_db_company_data') {
      batch.set(doc(db, 'companySettings', 'main'), sanitizeForFirestore(data), { merge: true });
    }
    else if (localKey === 'okey_db_categories_master') {
      batch.set(doc(db, 'masterData', 'categories'), sanitizeForFirestore({ items: data }), { merge: true });
    }
    else if (localKey === 'okey_db_expense_types') {
      batch.set(doc(db, 'masterData', 'expenseTypes'), sanitizeForFirestore({ items: data }), { merge: true });
    }
    else if (localKey === 'okey_db_approval_levels') {
      batch.set(doc(db, 'masterData', 'approvalLevels'), sanitizeForFirestore({ items: data }), { merge: true });
    }
    else if (localKey === 'okey_db_roles_master') {
      batch.set(doc(db, 'masterData', 'roles'), sanitizeForFirestore({ items: data }), { merge: true });
    }
    else if (localKey === 'okey_db_rules') {
      batch.set(doc(db, 'companySettings', 'rules'), sanitizeForFirestore({ items: data }), { merge: true });
    }

    await batch.commit();
  } catch (error) {
    console.error(`Error saving ${localKey} to Firestore:`, error);
  }
}

export function getFromCache(localKey: string, defaultValue: any = null) {
  if (DB_CACHE[localKey] !== undefined && DB_CACHE[localKey] !== null) {
    if (Array.isArray(DB_CACHE[localKey]) && DB_CACHE[localKey].length > 0) {
      return DB_CACHE[localKey];
    }
    if (!Array.isArray(DB_CACHE[localKey]) && Object.keys(DB_CACHE[localKey]).length > 0) {
      return DB_CACHE[localKey];
    }
  }

  // Fallback to localStorage if available
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

  return DB_CACHE[localKey] !== undefined ? DB_CACHE[localKey] : defaultValue;
}
