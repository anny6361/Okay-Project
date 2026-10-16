import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { compareSync } from 'bcryptjs';
import firebaseConfig from '../../firebase-applet-config.json';

interface RequestLike {
  method?: string;
  body?: {
    confirmation?: string;
    username?: string;
    password?: string;
  };
}
interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(value: Record<string, unknown>): ResponseLike;
}

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseConfig.projectId });
const db: Firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

function passwordMatches(input: string, storedValue: unknown): boolean {
  if (typeof storedValue !== 'string' || !storedValue || !input) return false;
  const stored = storedValue.trim();
  if (/^\$2[aby]\$/.test(stored)) {
    try {
      return compareSync(input, stored) || compareSync(input.trim(), stored);
    } catch {
      return false;
    }
  }
  return input === stored || input.trim() === stored;
}

function isPrivileged(user: Record<string, unknown>): boolean {
  if (user.is_active === false || user.deleted === true) return false;
  const role = String(user.approval_level || '').toLowerCase();
  const position = String(user.role || '').toLowerCase();
  return ['administrator', 'executive'].includes(role) ||
    ['administrator', 'executive'].includes(position);
}

async function deleteCollectionInBatches(collectionName: string): Promise<number> {
  const snapshot = await db.collection(collectionName).get();
  const records = snapshot.docs;
  for (let start = 0; start < records.length; start += 450) {
    const batch = db.batch();
    records.slice(start, start + 450).forEach(record => batch.delete(record.ref));
    await batch.commit();
  }
  return records.length;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { confirmation, username, password } = req.body || {};
  if (confirmation !== 'ล้างข้อมูลธุรกรรม') {
    return res.status(400).json({ success: false, error: 'กรุณาพิมพ์คำว่า ล้างข้อมูลธุรกรรม ให้ตรงตามที่กำหนด' });
  }
  if (typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านแอดมิน' });
  }

  try {
    const normalizedUsername = username.trim().toLowerCase();
    const [legacyUserDoc, currentUsersSnapshot] = await Promise.all([
      db.collection('okey_erp').doc('okey_db_users').get(),
      db.collection('users').get()
    ]);
    const legacyUsers = legacyUserDoc.data()?.items;
    const users: Record<string, unknown>[] = [
      ...(Array.isArray(legacyUsers) ? legacyUsers as Record<string, unknown>[] : []),
      ...currentUsersSnapshot.docs.map(record => record.data() as Record<string, unknown>)
    ];
    const user = users.find(candidate =>
      [candidate.username, candidate.email, candidate.user_id, candidate.employee_id]
        .some(value => typeof value === 'string' && value.trim().toLowerCase() === normalizedUsername)
    );

    const storedPassword = user?.password ?? user?.password_hash;
    if (!user || !isPrivileged(user) || !passwordMatches(password, storedPassword)) {
      return res.status(401).json({
        success: false,
        error: !user || !passwordMatches(password, storedPassword)
          ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
          : 'บัญชีนี้ไม่มีสิทธิ์ล้างข้อมูลธุรกรรม'
      });
    }

    // Transaction collections only. Keep users, employees, budgets, company settings,
    // master data, approval rules, audit logs, and backup history intact.
    const collectionsToClear = [
      'expenseRequests',
      'advanceRequests',
      'advanceClearings',
      'refunds',
      'deductions',
      'journalEntries',
      'reports'
    ];
    const deletedCounts: Record<string, number> = {};
    for (const collectionName of collectionsToClear) {
      deletedCounts[collectionName] = await deleteCollectionInBatches(collectionName);
    }

    // Empty legacy transactional arrays read by older app versions.
    const legacyKeys = [
      'okey_requests',
      'okey_db_refunds',
      'okey_db_deductions',
      'okey_db_journal_entries',
      'okey_db_accounting_docs'
    ];
    for (let start = 0; start < legacyKeys.length; start += 450) {
      const batch = db.batch();
      legacyKeys.slice(start, start + 450).forEach(key => {
        batch.set(db.collection('okey_erp').doc(key), { items: [] }, { merge: true });
      });
      await batch.commit();
    }

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
    console.warn('[ADMIN CLEAR TRANSACTIONS]', JSON.stringify({
      operator: user.user_id || user.email || user.username,
      at: new Date().toISOString(),
      deletedCounts,
      legacyKeys
    }));
    return res.status(200).json({
      success: true,
      message: 'ล้างข้อมูลธุรกรรมสำเร็จ โดยเก็บข้อมูลหลักของระบบไว้',
      totalDeleted,
      deletedCounts,
      clearedLegacyKeys: legacyKeys
    });
  } catch (error) {
    console.error('clear-transaction-data failed:', error);
    return res.status(500).json({
      success: false,
      error: 'ระบบล้างข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูลและลองใหม่'
    });
  }
}
