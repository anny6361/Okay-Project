import { db } from '../firebase';
import { doc, getDoc, writeBatch, WriteBatch } from 'firebase/firestore';
import { sanitizeForFirestore } from './firestore-sync';

const BATCH_LIMIT = 450;

async function commitBatchQueue(batches: WriteBatch[]) {
  for (const batch of batches) {
    await batch.commit();
  }
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
