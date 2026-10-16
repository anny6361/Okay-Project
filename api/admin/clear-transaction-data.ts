import { initializeApp, getApps } from 'firebase/app';
import {
  collection, doc, getDoc, getDocs, getFirestore, writeBatch,
  type Firestore
} from 'firebase/firestore';
import { compareSync } from 'bcryptjs';
import firebaseConfig from '../../firebase-applet-config.json';

interface RequestLike {
  method?: string;
  body?: { confirmation?: string; username?: string; password?: string };
}
interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(value: Record<string, unknown>): ResponseLike;
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function passwordMatches(input: string, storedValue: unknown): boolean {
  if (typeof storedValue !== 'string' || !storedValue || !input) return false;
  const stored = storedValue.trim();
  if (/^\$2[aby]\$/.test(stored)) {
    try { return compareSync(input, stored) || compareSync(input.trim(), stored); }
    catch { return false; }
  }
  return input === stored || input.trim() === stored;
}
function isPrivileged(user: Record<string, unknown>): boolean {
  if (user.is_active === false || user.deleted === true) return false;
  return ['administrator', 'executive'].includes(String(user.approval_level || '').toLowerCase()) ||
    ['administrator', 'executive'].includes(String(user.role || '').toLowerCase());
}
async function clearCollection(name: string): Promise<number> {
  const snapshot = await getDocs(collection(db, name));
  const records = snapshot.docs;
  for (let start = 0; start < records.length; start += 400) {
    const batch = writeBatch(db);
    records.slice(start, start + 400).forEach(record => batch.delete(record.ref));
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
  if (confirmation !== 'ล้างข้อมูลธุรกรรม')
    return res.status(400).json({ success: false, error: 'กรุณาพิมพ์คำว่า ล้างข้อมูลธุรกรรม ให้ตรงตามที่กำหนด' });
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password)
    return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านแอดมิน' });

  try {
    const normalizedUsername = username.trim().toLowerCase();
    const [legacyDoc, currentUsers] = await Promise.all([
      getDoc(doc(db, 'okey_erp', 'okey_db_users')),
      getDocs(collection(db, 'users'))
    ]);
    const legacyUsers = legacyDoc.data()?.items;
    const users: Record<string, unknown>[] = [
      ...(Array.isArray(legacyUsers) ? legacyUsers as Record<string, unknown>[] : []),
      ...currentUsers.docs.map(record => record.data() as Record<string, unknown>)
    ];
    const user = users.find(candidate =>
      [candidate.username, candidate.email, candidate.user_id, candidate.employee_id]
        .some(value => typeof value === 'string' && value.trim().toLowerCase() === normalizedUsername)
    );
    const storedPassword = user?.password ?? user?.password_hash;
    if (!user || !isPrivileged(user) || !passwordMatches(password, storedPassword))
      return res.status(401).json({ success: false, error:
        !user || !passwordMatches(password, storedPassword)
          ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'บัญชีนี้ไม่มีสิทธิ์ล้างข้อมูลธุรกรรม' });

    const names = ['expenseRequests', 'advanceRequests', 'advanceClearings', 'refunds',
      'deductions', 'journalEntries', 'reports'];
    const deletedCounts: Record<string, number> = {};
    for (const name of names) deletedCounts[name] = await clearCollection(name);

    const legacyKeys = ['okey_requests', 'okey_db_refunds', 'okey_db_deductions',
      'okey_db_journal_entries', 'okey_db_accounting_docs'];
    for (let start = 0; start < legacyKeys.length; start += 400) {
      const batch = writeBatch(db);
      legacyKeys.slice(start, start + 400).forEach(key =>
        batch.set(doc(db, 'okey_erp', key), { items: [] }, { merge: true }));
      await batch.commit();
    }
    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
    console.warn('[ADMIN CLEAR TRANSACTIONS]', JSON.stringify({
      operator: user.user_id || user.email || user.username,
      at: new Date().toISOString(), deletedCounts, legacyKeys
    }));
    return res.status(200).json({ success: true,
      message: 'ล้างข้อมูลธุรกรรมสำเร็จ โดยเก็บข้อมูลหลักของระบบไว้',
      totalDeleted, deletedCounts, clearedLegacyKeys: legacyKeys });
  } catch (error) {
    console.error('clear-transaction-data failed:', error);
    return res.status(500).json({ success: false,
      error: 'ระบบล้างข้อมูลไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ Firestore และลองใหม่' });
  }
}
