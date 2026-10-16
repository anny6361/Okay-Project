import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, writeBatch, WriteBatch } from 'firebase/firestore';
import { DB_CACHE, sanitizeForFirestore } from './firestore-sync';
import { legacyDb } from './firebase-client';

const BATCH_LIMIT = 450;

async function commitBatchQueue(batches: WriteBatch[]) {
  for (const batch of batches) {
    await batch.commit();
  }
}

/**
 * Import the original Okay ERP document store into the current normalized database.
 * This is additive/merge-only: it never deletes existing documents. The legacy
 * project remains read-only; after import, the current database is the live source.
 */
async function migrateLegacyOkayErpData() {
  const statusRef = doc(db, 'systemSettings', 'legacyOkayErpMigrationStatus');
  const statusSnap = await getDoc(statusRef);
  if (statusSnap.exists() && statusSnap.data().completed === true) return;

  const legacySnapshot = await getDocs(collection(legacyDb, 'okey_erp'));
  if (legacySnapshot.empty) {
    // Do not mark complete if the old project is temporarily unavailable/empty.
    console.info('Legacy Okay ERP store has no documents yet; migration will retry.');
    return;
  }

  const writes: Array<{ ref: ReturnType<typeof doc>; data: any }> = [];
  const importedKeys: string[] = [];
  const add = (collectionName: string, id: string, data: any) => {
    if (!id) return;
    writes.push({ ref: doc(db, collectionName, id), data: sanitizeForFirestore(data) });
  };
  const arrayItems = (value: any) => Array.isArray(value) ? value : [];
  const recordId = (item: any, fallback?: string) =>
    String(item?.id || item?.user_id || item?.department_id || item?.refund_id ||
      item?.deduction_id || item?.entry_id || item?.document_id || item?.log_id || fallback || '');

  for (const legacyDoc of legacySnapshot.docs) {
    const key = legacyDoc.id;
    const raw = legacyDoc.data();
    const items = raw?.items !== undefined ? raw.items : raw;
    importedKeys.push(key);

    // Keep a local/cache copy so the login screen and older modules can read the
    // original keys while Firestore listeners hydrate the normalized collections.
    try {
      localStorage.setItem(key, JSON.stringify(items));
      DB_CACHE[key] = items;
    } catch (error) {
      console.warn('Could not cache legacy Okay ERP data:', key, error);
    }

    if (key === 'okey_db_users') {
      arrayItems(items).forEach((user: any, index: number) => {
        const id = recordId(user, user?.username || String(index));
        if (!id) return;
        const clean = sanitizeForFirestore({ ...user, user_id: user.user_id || id });
        add('users', id, clean);
        add('employees', id, clean);
      });
    } else if (key === 'okey_db_departments') {
      arrayItems(items).forEach((dept: any, index: number) => {
        const id = recordId(dept, String(index));
        if (id) add('departments', id, { ...dept, department_id: dept.department_id || id });
      });
    } else if (key === 'okey_requests') {
      arrayItems(items).forEach((request: any, index: number) => {
        const id = recordId(request, String(index));
        if (!id) return;
        const target = request.expense_type === 'advance'
          ? 'advanceRequests'
          : request.expense_type === 'clearing'
            ? 'advanceClearings'
            : 'expenseRequests';
        add(target, id, { ...request, id });
      });
    } else if (key === 'okey_db_refunds' || key === 'okey_db_deductions' ||
               key === 'okey_db_journal_entries' || key === 'okey_db_accounting_docs' ||
               key === 'okey_db_enterprise_audit_logs' || key === 'okey_db_logs') {
      const target = key === 'okey_db_refunds' ? 'refunds'
        : key === 'okey_db_deductions' ? 'deductions'
        : key === 'okey_db_journal_entries' ? 'journalEntries'
        : key === 'okey_db_accounting_docs' ? 'reports'
        : key === 'okey_db_enterprise_audit_logs' ? 'auditLogs' : 'logs';
      arrayItems(items).forEach((item: any, index: number) => {
        const id = recordId(item, String(index));
        if (id) add(target, id, { ...item, id });
      });
    } else if (key === 'okey_db_company_data') {
      add('companySettings', 'main', items || {});
    } else if (key === 'okey_db_rules') {
      add('companySettings', 'rules', { items: arrayItems(items) });
    } else if (key === 'okey_db_categories_master') {
      add('masterData', 'categories', { items: arrayItems(items) });
    } else if (key === 'okey_db_expense_types') {
      add('masterData', 'expenseTypes', { items: arrayItems(items) });
    } else if (key === 'okey_db_approval_levels') {
      add('masterData', 'approvalLevels', { items: arrayItems(items) });
    } else if (key === 'okey_db_roles_master') {
      add('masterData', 'roles', { items: arrayItems(items) });
    } else if (key === 'okey_db_pdf_templates') {
      add('systemSettings', 'pdfTemplates', { items: arrayItems(items) });
    } else if (key === 'okey_db_replacement_policy') {
      add('systemSettings', 'replacementPolicy', { items: arrayItems(items) });
    }
    // Budgets are derived from the department master and preserved in local cache.
  }

  for (let start = 0; start < writes.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    writes.slice(start, start + BATCH_LIMIT).forEach(({ ref, data }) => {
      batch.set(ref, data, { merge: true });
    });
    await batch.commit();
  }

  await commitBatchQueue([(() => {
    const batch = writeBatch(db);
    batch.set(statusRef, {
      completed: true,
      importedKeys,
      importedDocumentCount: writes.length,
      sourceProject: 'okay-project-2a44f',
      timestamp: new Date().toISOString()
    }, { merge: true });
    return batch;
  })()]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('okey-db-updated'));
  }
  console.info('Legacy Okay ERP data imported with merge-only writes:', writes.length);
}

/**
 * Migrate the existing local database into the existing Firestore model.
 *
 * localStorage is intentionally preserved after migration. It remains a safe
 * fallback while Firestore listeners initialize and prevents data that is not
 * yet represented by the migration from being lost.
 *
 * Firestore limits a write batch to 500 writes. The migration can contain
 * more than 500 records, so writes are split into safe chunks. The migration
 * status is written only in the final batch after all data batches have been
 * queued successfully.
 */
export async function migrateLocalToFirestore() {
  try {
    await migrateLegacyOkayErpData();
    const isMigratedRef = doc(db, 'systemSettings', 'migrationStatus');
    const isMigratedSnap = await getDoc(isMigratedRef);

    // Never clear existing local data just because migration already completed.
    if (isMigratedSnap.exists() && isMigratedSnap.data().completed) {
      return;
    }

    const usersData = localStorage.getItem('okey_db_users');
    if (!usersData) return;

    console.log('Starting Migration from LocalStorage to Firestore...');

    const batches: WriteBatch[] = [];
    let batch = writeBatch(db);
    let batchWrites = 0;

    const addWrite = (targetRef: ReturnType<typeof doc>, data: any) => {
      if (batchWrites >= BATCH_LIMIT) {
        batches.push(batch);
        batch = writeBatch(db);
        batchWrites = 0;
      }

      batch.set(targetRef, data, { merge: true });
      batchWrites += 1;
    };

    // 1. Existing users -> users + employees
    const users = JSON.parse(usersData || '[]');
    users.forEach((user: any) => {
      const id = user.user_id || user.id;
      if (!id) return;

      const cleanUser = sanitizeForFirestore(user);
      addWrite(doc(db, 'users', id), cleanUser);
      addWrite(doc(db, 'employees', id), cleanUser);
    });

    // 2. Existing departments -> departments.
    // Preserve department_id when present; otherwise use the existing id.
    const depts = JSON.parse(localStorage.getItem('okey_db_departments') || '[]');
    depts.forEach((dept: any) => {
      const id = dept.department_id || dept.id;
      if (!id) return;

      const cleanDept = sanitizeForFirestore({
        ...dept,
        department_id: dept.department_id || id,
        id: dept.id || id
      });
      addWrite(doc(db, 'departments', id), cleanDept);
    });

    // 3. Existing requests -> the existing request collections.
    const requests = JSON.parse(localStorage.getItem('okey_requests') || '[]');
    requests.forEach((req: any) => {
      const id = req.id || req.request_id;
      if (!id) return;

      const sanitized = sanitizeForFirestore({ ...req, id });
      const targetCollection = req.expense_type === 'advance'
        ? 'advanceRequests'
        : req.expense_type === 'clearing'
          ? 'advanceClearings'
          : 'expenseRequests';

      addWrite(doc(db, targetCollection, id), sanitized);
    });

    // 4. Existing company settings and master data.
    const company = JSON.parse(localStorage.getItem('okey_db_company_data') || '{}');
    addWrite(doc(db, 'companySettings', 'main'), sanitizeForFirestore(company));

    const categories = JSON.parse(localStorage.getItem('okey_db_categories_master') || '[]');
    addWrite(doc(db, 'masterData', 'categories'), { items: sanitizeForFirestore(categories) });

    const expenseTypes = JSON.parse(localStorage.getItem('okey_db_expense_types') || '[]');
    addWrite(doc(db, 'masterData', 'expenseTypes'), { items: sanitizeForFirestore(expenseTypes) });

    const approvalLevels = JSON.parse(localStorage.getItem('okey_db_approval_levels') || '[]');
    addWrite(doc(db, 'masterData', 'approvalLevels'), { items: sanitizeForFirestore(approvalLevels) });

    const roles = JSON.parse(localStorage.getItem('okey_db_roles_master') || '[]');
    addWrite(doc(db, 'masterData', 'roles'), { items: sanitizeForFirestore(roles) });

    const rules = JSON.parse(localStorage.getItem('okey_db_rules') || '[]');
    addWrite(doc(db, 'companySettings', 'rules'), { items: sanitizeForFirestore(rules) });

    // 5. Existing audit logs.
    const auditLogs = JSON.parse(localStorage.getItem('okey_db_enterprise_audit_logs') || '[]');
    auditLogs.forEach((log: any) => {
      const id = log.id || log.log_id;
      if (!id) return;

      const cleanLog = sanitizeForFirestore({
        ...log,
        id,
        log_id: log.log_id || id
      });
      addWrite(doc(db, 'auditLogs', id), cleanLog);
    });

    // Mark migration complete only after every data write succeeds.
    addWrite(isMigratedRef, {
      completed: true,
      timestamp: new Date().toISOString()
    });

    if (batchWrites > 0) batches.push(batch);
    await commitBatchQueue(batches);

    console.log('Migration successful. Existing local data was preserved.');
  } catch (error) {
    // Never delete or overwrite local data when migration fails.
    console.error('Migration failed; existing local data was preserved:', error);
  }
}
