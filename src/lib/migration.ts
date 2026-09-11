import { db } from '../firebase';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { sanitizeForFirestore } from './firestore-sync';

/**
 * Migrate the existing local database into the existing Firestore model.
 *
 * localStorage is intentionally preserved after migration. It remains a safe
 * fallback while Firestore listeners initialize and prevents data that is not
 * yet represented by the migration from being lost.
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
    const batch = writeBatch(db);

    // 1. Existing users -> users + employees
    const users = JSON.parse(usersData || '[]');
    users.forEach((user: any) => {
      const id = user.user_id || user.id;
      if (!id) return;

      const cleanUser = sanitizeForFirestore(user);
      batch.set(doc(db, 'users', id), cleanUser, { merge: true });
      batch.set(doc(db, 'employees', id), cleanUser, { merge: true });
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
      batch.set(doc(db, 'departments', id), cleanDept, { merge: true });
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

      batch.set(doc(db, targetCollection, id), sanitized, { merge: true });
    });

    // 4. Existing company settings and master data.
    const company = JSON.parse(localStorage.getItem('okey_db_company_data') || '{}');
    batch.set(doc(db, 'companySettings', 'main'), sanitizeForFirestore(company), { merge: true });

    const categories = JSON.parse(localStorage.getItem('okey_db_categories_master') || '[]');
    batch.set(doc(db, 'masterData', 'categories'), { items: sanitizeForFirestore(categories) }, { merge: true });

    const expenseTypes = JSON.parse(localStorage.getItem('okey_db_expense_types') || '[]');
    batch.set(doc(db, 'masterData', 'expenseTypes'), { items: sanitizeForFirestore(expenseTypes) }, { merge: true });

    const approvalLevels = JSON.parse(localStorage.getItem('okey_db_approval_levels') || '[]');
    batch.set(doc(db, 'masterData', 'approvalLevels'), { items: sanitizeForFirestore(approvalLevels) }, { merge: true });

    const roles = JSON.parse(localStorage.getItem('okey_db_roles_master') || '[]');
    batch.set(doc(db, 'masterData', 'roles'), { items: sanitizeForFirestore(roles) }, { merge: true });

    const rules = JSON.parse(localStorage.getItem('okey_db_rules') || '[]');
    batch.set(doc(db, 'companySettings', 'rules'), { items: sanitizeForFirestore(rules) }, { merge: true });

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
      batch.set(doc(db, 'auditLogs', id), cleanLog, { merge: true });
    });

    // Mark migration complete only after every write succeeds.
    batch.set(isMigratedRef, {
      completed: true,
      timestamp: new Date().toISOString()
    }, { merge: true });

    await batch.commit();
    console.log('Migration successful. Existing local data was preserved.');
  } catch (error) {
    // Never delete or overwrite local data when migration fails.
    console.error('Migration failed; existing local data was preserved:', error);
  }
}
