import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';

export async function migrateLocalToFirestore() {
  try {
    const isMigratedRef = doc(db, 'systemSettings', 'migrationStatus');
    const isMigratedSnap = await getDoc(isMigratedRef);
    
    if (isMigratedSnap.exists() && isMigratedSnap.data().completed) {
      // Already migrated, clear localStorage safely
      cleanupLocalStorage();
      return;
    }

    // Check if we have localStorage data
    const usersData = localStorage.getItem('okey_db_users');
    if (!usersData) return; // No data to migrate
    
    console.log("Starting Migration from LocalStorage to Firestore...");
    const batch = writeBatch(db);

    // 1. Migrate Users to 'users' collection
    const users = JSON.parse(usersData || '[]');
    users.forEach((user: any) => {
      const id = user.user_id || user.id || Math.random().toString(36).substr(2, 9);
      const userRef = doc(db, 'users', id);
      batch.set(userRef, user);
      
      const empRef = doc(db, 'employees', id);
      batch.set(empRef, user);
    });

    // 2. Migrate Departments
    const depts = JSON.parse(localStorage.getItem('okey_db_departments') || '[]');
    depts.forEach((dept: any) => {
      const id = dept.id || Math.random().toString(36).substr(2, 9);
      const deptRef = doc(db, 'departments', id);
      batch.set(deptRef, dept);
    });

    // 3. Migrate Requests to expenseRequests and advanceRequests
    const requests = JSON.parse(localStorage.getItem('okey_requests') || '[]');
    requests.forEach((req: any) => {
      if (req.expense_type === 'advance') {
        const id = req.id || req.request_id || Math.random().toString(36).substr(2, 9);
        const reqRef = doc(db, 'advanceRequests', id);
        batch.set(reqRef, req);
      } else if (req.expense_type === 'clearing') {
        const id = req.id || req.request_id || Math.random().toString(36).substr(2, 9);
        const reqRef = doc(db, 'advanceClearings', id);
        batch.set(reqRef, req);
      } else {
        const id = req.id || req.request_id || Math.random().toString(36).substr(2, 9);
        const reqRef = doc(db, 'expenseRequests', id);
        batch.set(reqRef, req);
      }
    });

    // 4. Migrate Company Settings & Master Data
    const company = JSON.parse(localStorage.getItem('okey_db_company_data') || '{}');
    batch.set(doc(db, 'companySettings', 'main'), company);
    
    const categories = JSON.parse(localStorage.getItem('okey_db_categories_master') || '[]');
    batch.set(doc(db, 'masterData', 'categories'), { items: categories });
    
    const expenseTypes = JSON.parse(localStorage.getItem('okey_db_expense_types') || '[]');
    batch.set(doc(db, 'masterData', 'expenseTypes'), { items: expenseTypes });

    const approvalLevels = JSON.parse(localStorage.getItem('okey_db_approval_levels') || '[]');
    batch.set(doc(db, 'masterData', 'approvalLevels'), { items: approvalLevels });

    const roles = JSON.parse(localStorage.getItem('okey_db_roles_master') || '[]');
    batch.set(doc(db, 'masterData', 'roles'), { items: roles });

    const rules = JSON.parse(localStorage.getItem('okey_db_rules') || '[]');
    batch.set(doc(db, 'companySettings', 'rules'), { items: rules });

    const auditLogs = JSON.parse(localStorage.getItem('okey_db_enterprise_audit_logs') || '[]');
    auditLogs.forEach((log: any) => {
      const logRef = doc(db, 'auditLogs', log.id || Math.random().toString(36).substr(2, 9));
      batch.set(logRef, log);
    });

    batch.set(isMigratedRef, { completed: true, timestamp: new Date().toISOString() });

    await batch.commit();
    console.log("Migration successful!");
    
    cleanupLocalStorage();
    
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

function cleanupLocalStorage() {
  const keysToRemove = [
    'okey_db_users', 'okey_db_departments', 'okey_requests', 'okey_budgets',
    'okey_db_company_data', 'okey_db_categories_master', 'okey_db_expense_types',
    'okey_db_approval_levels', 'okey_db_roles_master', 'okey_db_rules',
    'okey_db_enterprise_audit_logs', 'okey_db_logs', 'okey_db_refunds',
    'okey_db_deductions', 'okey_db_journal_entries', 'okey_db_accounting_docs',
    'okey_db_pdf_templates', 'okey_db_replacement_policy', 'okey_simulated_user_id'
  ];
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log("LocalStorage cleaned up.");
}
