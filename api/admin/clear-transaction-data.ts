import { getApp, getApps, initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function passwordMatches(input: string, storedValue: unknown): boolean {
  if (typeof storedValue !== 'string' || !storedValue || !input) return false;
  const raw = input;
  const trimmed = input.trim();
  const stored = storedValue.trim();
  if (raw === stored || trimmed === stored || trimmed.toLowerCase() === stored.toLowerCase()) return true;
  if (/^\$2[aby]\$/.test(stored)) {
    try {
      return bcrypt.compareSync(raw, stored) || bcrypt.compareSync(trimmed, stored) ||
        bcrypt.compareSync(trimmed.toLowerCase(), stored);
    } catch {
      return false;
    }
  }
  return false;
}

async function deleteCollectionInBatches(collectionName: string): Promise<number> {
  const snapshot = await getDocs(collection(db, collectionName));
  let deleted = 0;
  const docs = snapshot.docs;
  for (let start = 0; start < docs.length; start += 400) {
    const batch = writeBatch(db);
    const chunk = docs.slice(start, start + 400);
    chunk.forEach(item => batch.delete(doc(db, collectionName, item.id)));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
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
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านแอดมิน' });
  }

  try {
    const userSnapshot = await getDocs(collection(db, 'users'));
    const normalizedUsername = String(username).trim().toLowerCase();
    const matchedUser = userSnapshot.docs
      .map(item => item.data() as Record<string, unknown>)
      .find(user => [user.username, user.email, user.user_id, user.employee_id]
        .some(value => typeof value === 'string' && value.trim().toLowerCase() === normalizedUsername));

    if (!matchedUser || !passwordMatches(String(password), matchedUser.password)) {
      return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const role = String(matchedUser.approval_level || '').toLowerCase();
    const position = String(matchedUser.role || '').toLowerCase();
    const isAuthorized = role === 'administrator' || role === 'executive' ||
      position === 'administrator' || position === 'executive';
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'บัญชีนี้ไม่มีสิทธิ์ล้างข้อมูลธุรกรรม' });
    }

    // Clear transaction records only. Preserve users, employees, departments/budgets,
    // master data, company settings, approval rules, audit logs and backup history.
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

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
    return res.status(200).json({
      success: true,
      message: 'ล้างข้อมูลธุรกรรมสำเร็จ โดยเก็บข้อมูลหลักของระบบไว้',
      totalDeleted,
      deletedCounts
    });
  } catch (error) {
    console.error('clear-transaction-data failed:', error);
    return res.status(500).json({
      success: false,
      error: 'ระบบล้างข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูลและลองใหม่'
    });
  }
}
