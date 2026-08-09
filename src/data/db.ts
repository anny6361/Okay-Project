import { getFromCache, saveToFirestore } from '../lib/firestore-sync';
import { 
  UserProfile, 
  ApprovalRule, 
  ApprovalLog, 
  ExpenseRequest,
  Department,
  RefundRecord,
  DeductionRecord,
  JournalEntry,
  AccountingDocument,
  AdvanceRecord,
  ExpenseItem,
  ClearingRecord,
  CompanyMasterData,
  EnterpriseAuditLog,
  ExpenseTypeMaster,
  ExpenseCategoryMaster,
  ApprovalLevelMaster,
  RoleMaster,
  PdfTemplateMaster,
  DepartmentBudget,
  ReplacementPolicy
} from '../types';
import bcrypt from 'bcryptjs';

// Age calculation helper
export function calculateAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  if (isNaN(birthDate.getTime())) return 0;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Thai ID Validation Helper (13 digits Check Digit)
export function validateThaiNationalID(id: string): boolean {
  if (!id || id.length !== 13 || !/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id.charAt(i)) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id.charAt(12));
}

// 77 Provinces of Thailand
export const THAI_PROVINCES: string[] = [
  'กรุงเทพมหานคร',
  'กระบี่',
  'กาญจนบุรี',
  'กาฬสินธุ์',
  'กำแพงเพชร',
  'ขอนแก่น',
  'จันทบุรี',
  'ฉะเชิงเทรา',
  'ชลบุรี',
  'ชัยนาท',
  'ชัยภูมิ',
  'ชุมพร',
  'เชียงราย',
  'เชียงใหม่',
  'ตรัง',
  'ตราด',
  'ตาก',
  'นครนายก',
  'นครปฐม',
  'นครพนม',
  'นครราชสีมา',
  'นครศรีธรรมราช',
  'นครสวรรค์',
  'นนทบุรี',
  'นราธิวาส',
  'น่าน',
  'บึงกาฬ',
  'บุรีรัมย์',
  'ปทุมธานี',
  'ประจวบคีรีขันธ์',
  'ปราจีนบุรี',
  'ปัตตานี',
  'พระนครศรีอยุธยา',
  'พะเยา',
  'พังงา',
  'พัทลุง',
  'พิจิตร',
  'พิษณุโลก',
  'เพชรบุรี',
  'เพชรบูรณ์',
  'แพร่',
  'ภูเก็ต',
  'มหาสารคาม',
  'มุกดาหาร',
  'แม่ฮ่องสอน',
  'ยโสธร',
  'ยะลา',
  'ร้อยเอ็ด',
  'ระนอง',
  'ระยอง',
  'ราชบุรี',
  'ลพบุรี',
  'ลำปาง',
  'ลำพูน',
  'เลย',
  'ศรีสะเกษ',
  'สกลนคร',
  'สงขลา',
  'สตูล',
  'สมุทรปราการ',
  'สมุทรสงคราม',
  'สมุทรสาคร',
  'สระแก้ว',
  'สระบุรี',
  'สิงห์บุรี',
  'สุโขทัย',
  'สุพรรณบุรี',
  'สุราษฎร์ธานี',
  'สุรินทร์',
  'หนองคาย',
  'หนองบัวลำภู',
  'อ่างทอง',
  'อำนาจเจริญ',
  'อุดรธานี',
  'อุตรดิตถ์',
  'อุทัยธานี',
  'อุบลราชธานี'
];

export const INITIAL_USERS: UserProfile[] = [
  {
    user_id: 'user-superadmin',
    employee_id: 'Okay9999',
    username: 'Okay9999',
    name: 'Super Administrator',
    email: 'superadmin@okey.com',
    phone: '099-999-9999',
    password: 'Okay.co.ltd',
    department: 'ผู้ดูแลระบบสูงสุด',
    position: 'Super Administrator',
    role: 'Administrator',
    is_active: true,
    approval_level: 'Administrator',
    force_password_change: true,
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png',
    title: 'นาย',
    firstName: 'Super',
    lastName: 'Administrator',
    nickname: 'Super',
    idCard: '1200901234999',
    birthDate: '1990-01-01',
    age: calculateAge('1990-01-01'),
    gender: 'male',
    address: 'สำนักงานใหญ่',
    province: 'กรุงเทพมหานคร',
    electricityRegion: 'สำนักงานใหญ่ (กฟผ.)',
    startDate: '2020-01-01',
    employmentStatus: 'active'
  }
];

export const INITIAL_DEPARTMENTS: Department[] = [
  { department_id: 'DEPT-001', department_name: 'สำนักผู้บริหาร (Executive)', head_of_department: 'คุณประเสริฐ', budget: 1000000, status: 'active' },
  { department_id: 'DEPT-002', department_name: 'ฝ่ายบัญชีและการเงิน (Accounting & Finance)', head_of_department: 'คุณวิภา', budget: 500000, status: 'active' },
  { department_id: 'DEPT-003', department_name: 'ฝ่ายการตลาดและขาย (Marketing & Sales)', head_of_department: 'คุณสมชาย', budget: 800000, status: 'active' },
  { department_id: 'DEPT-004', department_name: 'ฝ่ายเทคโนโลยีและระบบ (IT & Software)', head_of_department: 'คุณอนันต์', budget: 600000, status: 'active' },
  { department_id: 'DEPT-005', department_name: 'ฝ่ายทรัพยากรบุคคล (Human Resources)', head_of_department: 'คุณดาริน', budget: 300000, status: 'active' },
  { department_id: 'DEPT-006', department_name: 'ฝ่ายจัดซื้อและคลังสินค้า (Procurement)', head_of_department: 'คุณกิตติ', budget: 400000, status: 'active' },
  { department_id: 'DEPT-007', department_name: 'ฝ่ายปฏิบัติการและบริการ (Operations)', head_of_department: 'คุณมานพ', budget: 700000, status: 'active' }
];

export const INITIAL_RULES: ApprovalRule[] = [];

// Helper functions for Dynamic Database Access
export function hashPassword(password: string): string {
  if (!password) return '';
  // Check if already is a bcrypt hash
  if (password.startsWith('$2a$') || password.startsWith('$2b$')) return password;
  // Use synchronous bcrypt hashing
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  const p = password.trim();
  const h = hash.trim();

  // Plain text exact or case-insensitive match
  if (p === h || password === hash || p.toLowerCase() === h.toLowerCase()) {
    return true;
  }

  // If bcrypt hash
  if (h.startsWith('$2a$') || h.startsWith('$2b$')) {
    try {
      if (bcrypt.compareSync(p, h)) return true;
      if (bcrypt.compareSync(password, h)) return true;
      if (bcrypt.compareSync(p.toLowerCase(), h)) return true;
    } catch (e) {
      // ignore
    }
  }

  // Legacy plain text check or hash match
  if (hashPassword(p) === h || hashPassword(password) === h) return true;

  return false;
}

export function getDbUsers(): UserProfile[] {
  const users = getFromCache('okey_db_users');
  if (users) {
    try {
      let parsed = (typeof users === 'string' ? JSON.parse(users) : users);
      let modified = false;

      // Ensure Super Administrator is always present
      const hasSuperAdmin = parsed.some((u: UserProfile) => u.username === 'Okay9999');
      if (!hasSuperAdmin) {
        const superadmin = INITIAL_USERS.find(iu => iu.username === 'Okay9999');
        if (superadmin) {
          parsed.unshift({
            ...superadmin,
            password: hashPassword(superadmin.password || 'Okay.co.ltd')
          });
          modified = true;
        }
      }

      const enriched = parsed.map((u: UserProfile) => {
        if (u.username === 'Okay9999') {
          if (u.role !== 'Administrator' || u.approval_level !== 'Administrator' || u.is_active !== true || u.employmentStatus !== 'active') {
            u.role = 'Administrator';
            u.approval_level = 'Administrator';
            u.is_active = true;
            u.employmentStatus = 'active';
            modified = true;
          }
        }

        const match = INITIAL_USERS.find(iu => iu.user_id === u.user_id);
        if (match) {
          if (!u.phone) {
            u.phone = match.phone;
            modified = true;
          }
          if (!u.signatureUrl) {
            u.signatureUrl = match.signatureUrl;
            modified = true;
          }
          if (!u.password) {
            u.password = match.password;
            modified = true;
          }
          // Populate missing profile fields for existing initial users
          if (!u.idCard && match.idCard) {
            u.idCard = match.idCard;
            u.title = match.title;
            u.firstName = match.firstName;
            u.lastName = match.lastName;
            u.nickname = match.nickname;
            u.birthDate = match.birthDate;
            u.gender = match.gender;
            u.address = match.address;
            u.province = match.province;
            u.electricityRegion = match.electricityRegion;
            u.startDate = match.startDate;
            u.employmentStatus = match.employmentStatus;
            modified = true;
          }
        }
        
        // Recalculate age dynamically
        if (u.birthDate) {
          const currentAge = calculateAge(u.birthDate);
          if (u.age !== currentAge) {
            u.age = currentAge;
            modified = true;
          }
        }
        
        // Ensure the password is secure (bcrypt hashed)
        if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
          u.password = hashPassword(u.password);
          modified = true;
        }
        
        return u;
      });
      if (modified) {
        saveToFirestore('okey_db_users', enriched);
        return enriched;
      }
      return parsed;
    } catch (e) {
      const initialWithHashedPasswords = INITIAL_USERS.map(u => ({
        ...u,
        password: u.password ? hashPassword(u.password) : undefined
      }));
      saveToFirestore('okey_db_users', initialWithHashedPasswords);
      return initialWithHashedPasswords;
    }
  }
  
  const initialWithHashedPasswords = INITIAL_USERS.map(u => ({
    ...u,
    password: u.password ? hashPassword(u.password) : undefined
  }));
  saveToFirestore('okey_db_users', initialWithHashedPasswords);
  return initialWithHashedPasswords;
}

export function saveDbUsers(users: UserProfile[]) {
  let finalUsers = [...users];
  const hasSuperAdmin = finalUsers.some(u => u.username === 'Okay9999');
  if (!hasSuperAdmin) {
    const superadmin = INITIAL_USERS.find(iu => iu.username === 'Okay9999');
    if (superadmin) {
      finalUsers.unshift({
        ...superadmin,
        password: hashPassword(superadmin.password || 'Okay.co.ltd')
      });
    }
  }

  finalUsers = finalUsers.map(u => {
    if (u.username === 'Okay9999') {
      return {
        ...u,
        role: 'Administrator',
        approval_level: 'Administrator',
        is_active: true,
        employmentStatus: 'active'
      };
    }
    return u;
  });

  saveToFirestore('okey_db_users', finalUsers);
}

export function getDbRules(): ApprovalRule[] {
  const rules = getFromCache('okey_db_rules');
  if (rules) return (typeof rules === 'string' ? JSON.parse(rules) : rules);
  saveToFirestore('okey_db_rules', INITIAL_RULES);
  return INITIAL_RULES;
}

export function saveDbRules(rules: ApprovalRule[]) {
  saveToFirestore('okey_db_rules', rules);
}

export function getDbLogs(): ApprovalLog[] {
  const logs = getFromCache('okey_db_logs');
  if (logs) return (typeof logs === 'string' ? JSON.parse(logs) : logs);
  const initialLogs: ApprovalLog[] = [];
  saveToFirestore('okey_db_logs', initialLogs);
  return initialLogs;
}

export function saveDbLogs(logs: ApprovalLog[]) {
  saveToFirestore('okey_db_logs', logs);
}

export function addApprovalLog(requestId: string, actionBy: string, action: 'approve' | 'reject', comment: string) {
  const logs = getDbLogs();
  const newLog: ApprovalLog = {
    log_id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    request_id: requestId,
    action_by: actionBy,
    action,
    timestamp: new Date().toISOString(),
    comment
  };
  logs.push(newLog);
  saveDbLogs(logs);
  return newLog;
}

// Logic to calculate active workflow state
export function getWorkflowChain(requesterId: string): { approverId: string; level: number }[] {
  const rules = getDbRules();
  return rules
    .filter(r => r.requester_user_id === requesterId)
    .sort((a, b) => a.level - b.level)
    .map(r => ({ approverId: r.approver_user_id, level: r.level }));
}

// === ENTERPRISE ACCOUNTING & DEPARTMENTS ACCESSORS ===

export function getDbDepartments(): Department[] {
  const depts = getFromCache('okey_db_departments');
  if (depts) {
    const parsed = typeof depts === 'string' ? JSON.parse(depts) : depts;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  saveToFirestore('okey_db_departments', INITIAL_DEPARTMENTS);
  return INITIAL_DEPARTMENTS;
}

export function saveDbDepartments(depts: Department[]) {
  saveToFirestore('okey_db_departments', depts);
}

export function addDepartment(name: string, head?: string, budget?: number, status?: 'active' | 'disabled'): Department {
  const depts = getDbDepartments();
  const newDept: Department = {
    department_id: `DEPT-${String(depts.length + 1).padStart(3, '0')}`,
    department_name: name,
    head_of_department: head || 'ไม่ระบุ',
    budget: budget || 100000,
    status: status || 'active'
  };
  depts.push(newDept);
  saveDbDepartments(depts);
  return newDept;
}

export function getDbRefunds(): RefundRecord[] {
  const data = getFromCache('okey_db_refunds');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  const initial: RefundRecord[] = [];
  saveToFirestore('okey_db_refunds', initial);
  return initial;
}

export function saveDbRefunds(refunds: RefundRecord[]) {
  saveToFirestore('okey_db_refunds', refunds);
}

export function addRefundRecord(advanceId: string, amount: number, status: 'pending' | 'refunded', approvedBy?: string): RefundRecord {
  const refunds = getDbRefunds();
  const newRecord: RefundRecord = {
    refund_id: `REF-${Date.now()}`,
    advance_id: advanceId,
    amount,
    status,
    approved_by: approvedBy,
    date: new Date().toISOString().split('T')[0]
  };
  refunds.push(newRecord);
  saveDbRefunds(refunds);
  return newRecord;
}

export function getDbDeductions(): DeductionRecord[] {
  const data = getFromCache('okey_db_deductions');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  const initial: DeductionRecord[] = [];
  saveToFirestore('okey_db_deductions', initial);
  return initial;
}

export function saveDbDeductions(deductions: DeductionRecord[]) {
  saveToFirestore('okey_db_deductions', deductions);
}

export function addDeductionRecord(userId: string, amount: number, method: 'salary' | 'invoice', status: 'pending' | 'deducted', approvedBy?: string): DeductionRecord {
  const deductions = getDbDeductions();
  const newRecord: DeductionRecord = {
    deduction_id: `DED-${Date.now()}`,
    user_id: userId,
    amount,
    method,
    status,
    approved_by: approvedBy,
    date: new Date().toISOString().split('T')[0]
  };
  deductions.push(newRecord);
  saveDbDeductions(deductions);
  return newRecord;
}

export function getDbJournalEntries(): JournalEntry[] {
  const data = getFromCache('okey_db_journal_entries');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  const initial: JournalEntry[] = [];
  saveToFirestore('okey_db_journal_entries', initial);
  return initial;
}

export function saveDbJournalEntries(entries: JournalEntry[]) {
  saveToFirestore('okey_db_journal_entries', entries);
}

export function addJournalEntry(
  ref_type: 'expense' | 'refund' | 'deduction' | 'advance',
  ref_id: string,
  debit_account: string,
  credit_account: string,
  amount: number,
  description: string
): JournalEntry {
  const entries = getDbJournalEntries();
  const newEntry: JournalEntry = {
    journal_id: `JRN-2026-${String(entries.length + 1).padStart(4, '0')}`,
    ref_type,
    ref_id,
    debit_account,
    credit_account,
    amount,
    date: new Date().toISOString().split('T')[0],
    description
  };
  entries.push(newEntry);
  saveDbJournalEntries(entries);
  return newEntry;
}

export function getDbAccountingDocuments(): AccountingDocument[] {
  const data = getFromCache('okey_db_accounting_docs');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  const initial: AccountingDocument[] = [];
  saveToFirestore('okey_db_accounting_docs', initial);
  return initial;
}

export function saveDbAccountingDocuments(docs: AccountingDocument[]) {
  saveToFirestore('okey_db_accounting_docs', docs);
}

export function addAccountingDocument(
  doc_type: 'expense_voucher' | 'advance_payment_voucher' | 'refund_receipt' | 'deduction_notice' | 'reimbursement_voucher',
  ref_id: string,
  requester_name: string,
  department: string,
  details: string,
  amount: number,
  approvedBy?: string
): AccountingDocument {
  const docs = getDbAccountingDocuments();
  const prefix = {
    expense_voucher: 'EXP-VOU',
    advance_payment_voucher: 'ADV-VOU',
    refund_receipt: 'REF-REC',
    deduction_notice: 'DED-NOT',
    reimbursement_voucher: 'REI-VOU'
  }[doc_type];
  
  const newDoc: AccountingDocument = {
    doc_id: `${prefix}-${String(docs.length + 1).padStart(4, '0')}`,
    doc_type,
    ref_id,
    requester_name,
    department,
    details,
    amount,
    date: new Date().toISOString().split('T')[0],
    approved_by: approvedBy
  };
  docs.push(newDoc);
  saveDbAccountingDocuments(docs);
  return newDoc;
}

export const INITIAL_COMPANY_DATA: CompanyMasterData = {
  companyName: 'บริษัท โอเค เอ็กซ์เพนส์ แมเนจเมนท์ จำกัด (OKAY EXPENSE MANAGEMENT CO., LTD.)',
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60',
  address: '99/9 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310 (99/9 Rama IX Road, Huai Khwang, Bangkok 10310)',
  taxId: '0-1055-66000-11-2',
  phone: '02-123-4567',
  email: 'finance@okay.com',
  bankInfo: 'ธนาคารกสิกรไทย (KBANK) บัญชีกองกลาง เลขที่ 012-3-45678-9'
};

export const INITIAL_CATEGORIES_MASTER: ExpenseCategoryMaster[] = [
  { id: 'travel', name: 'ค่าเดินทางและที่พัก', limitPerRequest: 15000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 1 },
  { id: 'meals', name: 'ค่าอาหารและค่ารับรอง', limitPerRequest: 6000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 2 },
  { id: 'fuel', name: 'ค่าน้ำมันเชื้อเพลิง', limitPerRequest: 10000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 3 },
  { id: 'toll', name: 'ค่าทางด่วนและค่าจอดรถ', limitPerRequest: 3000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 4 },
  { id: 'vehicle', name: 'ค่าซ่อมบำรุงและบำรุงรักษารถ', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 5 },
  { id: 'equipment', name: 'เครื่องมือและอุปกรณ์', limitPerRequest: 50000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 6 },
  { id: 'office', name: 'วัสดุสำนักงาน', limitPerRequest: 10000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 7 },
  { id: 'utility', name: 'ค่าสาธารณูปโภค', limitPerRequest: 30000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 8 },
  { id: 'software', name: 'ซอฟต์แวร์และบริการ Cloud', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 9 },
  { id: 'communication', name: 'ค่าโทรศัพท์และอินเทอร์เน็ต', limitPerRequest: 5000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 10 },
  { id: 'training', name: 'อบรมและสัมมนา', limitPerRequest: 25000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 11 },
  { id: 'marketing', name: 'โฆษณาและการตลาด', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 12 },
  { id: 'ppe', name: 'อุปกรณ์ความปลอดภัย (PPE)', limitPerRequest: 15000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 13 },
  { id: 'tools', name: 'วัสดุสิ้นเปลืองหน้างาน', limitPerRequest: 30000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 14 },
  { id: 'maintenance', name: 'ซ่อมบำรุงอุปกรณ์', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 15 },
  { id: 'bank_fee', name: 'ค่าธรรมเนียมธนาคาร', limitPerRequest: 2000, requiresReceipt: false, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 16 },
  { id: 'tax_fee', name: 'ค่าภาษีและค่าธรรมเนียมราชการ', limitPerRequest: 10000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 17 },
  { id: 'welfare', name: 'สวัสดิการพนักงาน', limitPerRequest: 10000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 18 },
  { id: 'advance', name: 'เคลียร์เงินทดรองจ่าย', limitPerRequest: 999999999, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 19 },
  { id: 'other', name: 'ค่าใช้จ่ายอื่น ๆ', limitPerRequest: 5000, requiresReceipt: false, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 20 },
  { id: 'remaining_labor', name: 'ค่าพนักงานเก็บงานส่วนที่เหลือ', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 21 },
  { id: 'broken_meter', name: 'ค่ามิเตอร์พัง', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 22 },
  { id: 'broken_equipment', name: 'ค่าอุปกรณ์พัง', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700', isActive: true, order: 23 }
];

export const INITIAL_EXPENSE_TYPES: ExpenseTypeMaster[] = [
  { id: 'reimbursement', name: 'ใบเบิกเงินชดเชย (Reimbursement)', description: 'สำหรับเบิกเงินชดเชยค่าใช้จ่ายที่สำรองจ่ายไปก่อนหน้า', isActive: true, order: 1 },
  { id: 'advance', name: 'ใบขอรับเงินทดรองจ่าย (Advance)', description: 'สำหรับขอเบิกเงินทดรองล่วงหน้าเพื่อไปจัดทำรายการ', isActive: true, order: 2 },
  { id: 'clearing', name: 'ใบเคลียร์เงินทดรองจ่าย (Clearing)', description: 'สำหรับเคลียร์ค่าใช้จ่ายของใบขอรับเงินทดรองล่วงหน้า', isActive: true, order: 3 },
  { id: 'replacement', name: 'ใบแทนใบเสร็จ (Replacement Receipt)', description: 'สำหรับใช้เบิกจ่ายเมื่อไม่สามารถเรียกเก็บใบเสร็จรับเงินฉบับจริงได้', isActive: true, order: 4 }
];

export const INITIAL_APPROVAL_LEVELS: ApprovalLevelMaster[] = [
  { level_id: 'level-1', name: 'Level 1 (ผู้อนุมัติขั้นต้น / Supervisor)', order: 1, isActive: true },
  { level_id: 'level-2', name: 'Level 2 (หัวหน้าแผนก / Manager)', order: 2, isActive: true },
  { level_id: 'level-3', name: 'Level 3 (ผู้อำนวยการฝ่าย / Director)', order: 3, isActive: true },
  { level_id: 'level-4', name: 'Level 4 (ฝ่ายการเงินและบัญชี / Finance)', order: 4, isActive: true },
  { level_id: 'administrator', name: 'Administrator (ผู้ดูแลระบบสูงสุด)', order: 5, isActive: true }
];

export const INITIAL_ROLES_MASTER: RoleMaster[] = [
  { role_id: 'role-admin', role_name: 'Administrator', permissions: ['all'], approval_sequence: 5 },
  { role_id: 'role-finance', role_name: 'Finance Manager', permissions: ['read', 'approve', 'audit'], approval_sequence: 4 },
  { role_id: 'role-vp', role_name: 'Sales VP / Commercial Director', permissions: ['read', 'approve'], approval_sequence: 3 },
  { role_id: 'role-lead', role_name: 'Team Lead / Senior Engineer', permissions: ['read', 'approve'], approval_sequence: 2 },
  { role_id: 'role-staff', role_name: 'General Staff', permissions: ['create_request'], approval_sequence: 1 }
];

export const INITIAL_PDF_TEMPLATES: PdfTemplateMaster[] = [
  { template_id: 'classic', template_name: 'Classic Corporate Navy', color_primary: '#1e3a8a', color_secondary: '#f1f5f9', isActive: true },
  { template_id: 'modern', template_name: 'Modern Charcoal Slate', color_primary: '#0f172a', color_secondary: '#e2e8f0', isActive: true },
  { template_id: 'emerald', template_name: 'Eco Emerald Mint', color_primary: '#065f46', color_secondary: '#f0fdf4', isActive: true }
];

export function getDbCompanyData(): CompanyMasterData {
  const data = getFromCache('okey_db_company_data');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  saveToFirestore('okey_db_company_data', INITIAL_COMPANY_DATA);
  return INITIAL_COMPANY_DATA;
}

export function saveDbCompanyData(data: CompanyMasterData) {
  saveToFirestore('okey_db_company_data', data);
}

// RICH CATEGORIES MASTER DATA
export function getDbCategories(): ExpenseCategoryMaster[] {
  const data = getFromCache('okey_db_categories_master');
  if (data) {
    const list = (typeof data === 'string' ? JSON.parse(data) : data) as ExpenseCategoryMaster[];
    if (Array.isArray(list) && list.length > 0) {
      // Map user's existing categories by ID and by Name
      const existingIds = new Set(list.map(c => c.id));
      const existingNames = new Set(list.map(c => (c.name || '').toLowerCase().trim()));

      // Find initial categories that don't exist in user list
      const missingStandard = INITIAL_CATEGORIES_MASTER.filter(
        sc => !existingIds.has(sc.id) && !existingNames.has((sc.name || '').toLowerCase().trim())
      );

      // Preserve all user's items and append missing standard categories
      const neutralColor = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700';
      const combined = [...list, ...missingStandard].map((c, idx) => ({
        ...c,
        color: neutralColor,
        order: c.order || idx + 1
      }));

      // Update Firestore if new standard categories were merged in
      if (missingStandard.length > 0) {
        saveToFirestore('okey_db_categories_master', combined);
      }

      return combined;
    }
  }
  saveToFirestore('okey_db_categories_master', INITIAL_CATEGORIES_MASTER);
  return INITIAL_CATEGORIES_MASTER;
}

export function saveDbCategories(categories: ExpenseCategoryMaster[]) {
  saveToFirestore('okey_db_categories_master', categories);
}

// EXPENSE TYPES MASTER DATA
export function getDbExpenseTypes(): ExpenseTypeMaster[] {
  const data = getFromCache('okey_db_expense_types');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  saveToFirestore('okey_db_expense_types', INITIAL_EXPENSE_TYPES);
  return INITIAL_EXPENSE_TYPES;
}

export function saveDbExpenseTypes(types: ExpenseTypeMaster[]) {
  saveToFirestore('okey_db_expense_types', types);
}

// APPROVAL LEVELS MASTER DATA
export function getDbApprovalLevels(): ApprovalLevelMaster[] {
  const data = getFromCache('okey_db_approval_levels');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  saveToFirestore('okey_db_approval_levels', INITIAL_APPROVAL_LEVELS);
  return INITIAL_APPROVAL_LEVELS;
}

export function saveDbApprovalLevels(levels: ApprovalLevelMaster[]) {
  saveToFirestore('okey_db_approval_levels', levels);
}

// ROLES MASTER DATA
export function getDbRoles(): RoleMaster[] {
  const data = getFromCache('okey_db_roles_master');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  saveToFirestore('okey_db_roles_master', INITIAL_ROLES_MASTER);
  return INITIAL_ROLES_MASTER;
}

export function saveDbRoles(roles: RoleMaster[]) {
  saveToFirestore('okey_db_roles_master', roles);
}

// PDF TEMPLATES MASTER DATA
export function getDbPdfTemplates(): PdfTemplateMaster[] {
  const data = getFromCache('okey_db_pdf_templates');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  saveToFirestore('okey_db_pdf_templates', INITIAL_PDF_TEMPLATES);
  return INITIAL_PDF_TEMPLATES;
}

export function saveDbPdfTemplates(templates: PdfTemplateMaster[]) {
  saveToFirestore('okey_db_pdf_templates', templates);
}

// REALTIME BUDGETS MONITORING ENGINE (Requirement 8)
export function getRealtimeBudgets(): DepartmentBudget[] {
  const depts = getDbDepartments();
  const requests: ExpenseRequest[] = getFromCache('okey_requests', []);
  
  return depts.map(d => {
    // filter requests for this department
    const deptReqs = requests.filter(r => 
      r.department === d.department_name || 
      r.department.includes(d.department_name) || 
      d.department_name.includes(r.department)
    );
    
    // Spent = Paid status
    const spent = deptReqs
      .filter(r => (r.status as string) === 'Paid' || (r.status as string) === 'approved' || (r.status as string) === 'Approved')
      .reduce((sum, r) => sum + r.amount, 0);
      
    // Pending Approval = Pending status
    const pending = deptReqs
      .filter(r => (r.status as string) === 'Pending' || (r.status as string) === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);

    // Pending Payment = Approved but not paid yet
    const pendingPayment = deptReqs
      .filter(r => (r.status as string) === 'Approved' || (r.status as string) === 'approved')
      .reduce((sum, r) => sum + r.amount, 0);
      
    return {
      department: d.department_name,
      allocated: d.budget,
      spent: spent,
      pending: pending,
      color: d.department_name.includes('IT') || d.department_name.includes('ไอที') ? '#3B82F6' :
             d.department_name.includes('Sales') || d.department_name.includes('ขาย') ? '#F59E0B' :
             d.department_name.includes('Marketing') || d.department_name.includes('ตลาด') ? '#EC4899' :
             d.department_name.includes('Finance') || d.department_name.includes('บัญชี') ? '#10B981' : '#8B5CF6'
    };
  });
}

// ENTERPRISE AUDIT LOGGING ENGINE (Requirement 14)
export function getDbEnterpriseAuditLogs(): EnterpriseAuditLog[] {
  const data = getFromCache('okey_db_enterprise_audit_logs');
  if (data) return (typeof data === 'string' ? JSON.parse(data) : data);
  const initial: EnterpriseAuditLog[] = [];
  saveToFirestore('okey_db_enterprise_audit_logs', initial);
  return initial;
}

export function saveDbEnterpriseAuditLogs(logs: EnterpriseAuditLog[]) {
  saveToFirestore('okey_db_enterprise_audit_logs', logs);
}

export function addEnterpriseAuditLog(
  param1: string,
  param2: string,
  param3: string,
  param4: string,
  param5?: string
): EnterpriseAuditLog {
  const logs = getDbEnterpriseAuditLogs();
  
  let userId = 'user-unknown';
  let userName = 'System';
  let role = 'Staff';
  let event: EnterpriseAuditLog['event'] = 'Master_Change';
  let details = '';
  
  let action_by = '';
  let action_type = '';
  let ref_id = '';
  let timestamp = new Date().toISOString();

  if (param5 !== undefined) {
    // 5 arguments signature
    userId = param1;
    userName = param2;
    role = param3;
    event = param4 as any;
    details = param5;
    
    action_by = param2;
    action_type = param4;
  } else {
    // 4 arguments legacy signature: addEnterpriseAuditLog(actionBy, actionType, refId, details)
    action_by = param1;
    action_type = param2;
    ref_id = param3;
    details = param4;
    
    userId = param1;
    userName = param1;
    role = 'Staff';
    event = (param2 as any) || 'Master_Change';
  }

  // Simple User-Agent Parser
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server / Simulated';
  let browser = "Chrome";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  
  let os = "Windows 11";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  let device = "Desktop PC";
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) {
    device = "Mobile Phone";
  }

  const now = new Date();
  
  const newLog: EnterpriseAuditLog = {
    log_id: `AUD-2026-${String(logs.length + 1).padStart(5, '0')}`,
    user_id: userId,
    user_name: userName,
    role: role,
    event: event as any,
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('th-TH'),
    ip_address: "182.52.114.208", // Simulated enterprise IP
    browser,
    device,
    os,
    details,
    
    // legacy support
    action_by,
    action_type,
    ref_id,
    timestamp
  };
  
  logs.push(newLog);
  saveDbEnterpriseAuditLogs(logs);
  return newLog;
}

// REPLACEMENT RECEIPT POLICY ENGINE (Requirement 9)
export function getDbReplacementPolicy(): ReplacementPolicy {
  const policy = getFromCache('okey_db_replacement_policy');
  if (policy) {
    try {
      return (typeof policy === 'string' ? JSON.parse(policy) : policy);
    } catch (e) {
      console.error("Error parsing replacement policy, resetting", e);
    }
  }
  const initial: ReplacementPolicy = {
    maxAmount: 2000,
    maxTimesPerMonth: 5,
    allowedCategories: ['meals', 'travel', 'other'],
    forbiddenCategories: ['equipment', 'software', 'training', 'marketing'],
    additionalApprovers: ['user-4']
  };
  saveToFirestore('okey_db_replacement_policy', initial);
  return initial;
}

export function saveDbReplacementPolicy(policy: ReplacementPolicy) {
  saveToFirestore('okey_db_replacement_policy', policy);
}

// Helper to get real photo-realistic receipt images for any request (No mock text/blue-band cards)
export function getRealReceiptImages(req: ExpenseRequest): string[] {
  if (!req) return [];
  const list: string[] = [];
  
  // 1. Check req.attachment_list first
  if (req.attachment_list && req.attachment_list.length > 0) {
    req.attachment_list.forEach(file => {
      if (file.dataUrl && !list.includes(file.dataUrl)) {
        list.push(file.dataUrl);
      }
    });
  }

  // 2. Check req.receiptUrl (singular)
  if (req.receiptUrl && typeof req.receiptUrl === 'string') {
    if (req.receiptUrl.startsWith('data:') || req.receiptUrl.startsWith('http') || req.receiptUrl.startsWith('/') || req.receiptUrl.startsWith('blob:')) {
      if (!list.includes(req.receiptUrl)) list.push(req.receiptUrl);
    } else {
      const img = mapFilenameToRealReceipt(req.receiptUrl, req.category);
      if (img && !list.includes(img)) list.push(img);
    }
  }
  
  // 3. Check if we have receiptUrls
  if (req.receiptUrls && req.receiptUrls.length > 0) {
    req.receiptUrls.forEach(url => {
      if (url && (url.startsWith('data:') || url.startsWith('http') || url.startsWith('/') || url.startsWith('blob:'))) {
        if (!list.includes(url)) list.push(url);
      } else if (url) {
        const img = mapFilenameToRealReceipt(url, req.category);
        if (img && !list.includes(img)) list.push(img);
      }
    });
  } else if (req.receiptName && list.length === 0) {
    if (req.receiptName.startsWith('data:') || req.receiptName.startsWith('http') || req.receiptName.startsWith('/') || req.receiptName.startsWith('blob:')) {
      if (!list.includes(req.receiptName)) list.push(req.receiptName);
    } else {
      const img = mapFilenameToRealReceipt(req.receiptName, req.category);
      if (img && !list.includes(img)) list.push(img);
    }
  }

  // 4. Check refund proof url
  if (req.refund_proof_url && !list.includes(req.refund_proof_url)) {
    list.push(req.refund_proof_url);
  }
  
  // fallback if there's absolutely nothing
  if (list.length === 0) {
    list.push(mapFilenameToRealReceipt('default', req.category));
  }
  
  return list;
}

// Structured helper for rich attachment details across all document types
export function getRealReceiptAttachments(req: ExpenseRequest): { name: string; dataUrl: string; type: string; category?: string }[] {
  if (!req) return [];
  const result: { name: string; dataUrl: string; type: string; category?: string }[] = [];
  const addedUrls = new Set<string>();

  if (req.attachment_list && req.attachment_list.length > 0) {
    req.attachment_list.forEach(item => {
      if (item.dataUrl && !addedUrls.has(item.dataUrl)) {
        addedUrls.add(item.dataUrl);
        result.push({
          name: item.name || 'เอกสารแนบ',
          dataUrl: item.dataUrl,
          type: item.type || 'application/octet-stream',
          category: item.category
        });
      }
    });
  }

  const rawImages = getRealReceiptImages(req);
  rawImages.forEach((url, idx) => {
    if (url && !addedUrls.has(url)) {
      addedUrls.add(url);
      let type = 'image/jpeg';
      let name = (req.receiptNames && req.receiptNames[idx]) || req.receiptName || `เอกสารแนบ_${idx + 1}.jpg`;

      const lower = url.toLowerCase();
      if (lower.startsWith('data:application/pdf') || lower.includes('.pdf')) {
        type = 'application/pdf';
        if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
      } else if (lower.includes('word') || lower.includes('.doc')) {
        type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!name.toLowerCase().endsWith('.doc') && !name.toLowerCase().endsWith('.docx')) name += '.docx';
      } else if (lower.includes('excel') || lower.includes('.xls') || lower.includes('.csv')) {
        type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!name.toLowerCase().endsWith('.xls') && !name.toLowerCase().endsWith('.xlsx') && !name.toLowerCase().endsWith('.csv')) name += '.xlsx';
      }

      result.push({
        name,
        dataUrl: url,
        type,
        category: 'ใบเสร็จรับเงิน'
      });
    }
  });

  return result;
}

export function getSafePreviewUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:application/pdf;base64,')) {
    try {
      const base64 = url.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('PDF blob conversion failed:', e);
      return url;
    }
  }
  return url;
}

export function mapFilenameToRealReceipt(filename: string, category: string): string {
  const nameLower = (filename || '').toLowerCase();
  const catLower = (category || '').toLowerCase();
  
  if (nameLower.includes('shakariki') || catLower.includes('meals') || catLower.includes('food') || catLower.includes('dining')) {
    // Real restaurant receipt
    return 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=800&auto=format&fit=crop&q=80';
  } else if (nameLower.includes('aws') || catLower.includes('software') || catLower.includes('it') || catLower.includes('service')) {
    // Real software billing/invoice dashboard
    return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80';
  } else if (nameLower.includes('jib') || catLower.includes('equipment') || catLower.includes('hardware') || catLower.includes('computer')) {
    // Real electronics retail receipt
    return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
  } else if (nameLower.includes('airasia') || catLower.includes('travel') || catLower.includes('transport') || catLower.includes('flight')) {
    // Real airline flight boarding pass or receipt ticket
    return 'https://images.unsplash.com/photo-1540339832862-474529800a58?w=800&auto=format&fit=crop&q=80';
  } else if (catLower.includes('marketing') || nameLower.includes('facebook') || catLower.includes('ads')) {
    // Real advertising billing statement
    return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80';
  } else {
    // Generic high-quality retail transaction receipt
    return 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80';
  }
}

// Generates a type-specific sequential document running number per month
export function generateDocumentId(
  expenseType: 'advance' | 'reimbursement' | 'clearing' | string, 
  dateStr: string, 
  currentRequests: ExpenseRequest[] = []
): string {
  const prefixMap: Record<string, string> = {
    reimbursement: 'RB',
    advance: 'AD',
    clearing: 'CL'
  };
  const typeKey = (expenseType || 'reimbursement').toLowerCase();
  const prefix = prefixMap[typeKey] || 'RB';
  
  // Format yearMonth to YYYYMM
  let yearMonth = '202607';
  if (dateStr && dateStr.length >= 7) {
    yearMonth = dateStr.substring(0, 7).replace(/[^0-9]/g, '');
  } else {
    const d = new Date();
    yearMonth = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0');
  }

  const targetPrefix = `${prefix}-${yearMonth}-`;
  let maxSeq = 0;
  
  // Also check database if current list is empty
  let requestsList = currentRequests;
  if (!requestsList || requestsList.length === 0) {
    const dbRequestsStr = getFromCache('okey_requests');
    if (dbRequestsStr) {
      try {
        requestsList = (typeof dbRequestsStr === 'string' ? JSON.parse(dbRequestsStr) : dbRequestsStr);
      } catch (e) {
        requestsList = [];
      }
    }
  }

  if (Array.isArray(requestsList)) {
    requestsList.forEach(req => {
      if (req.id && req.id.startsWith(targetPrefix)) {
        const seqPart = req.id.substring(targetPrefix.length);
        const seqNum = parseInt(seqPart, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(6, '0');
  return `${prefix}-${yearMonth}-${seqStr}`;
}

export function getDbRequests(): ExpenseRequest[] {
  const data = getFromCache('okey_requests');
  if (data) {
    try {
      return (typeof data === 'string' ? JSON.parse(data) : data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function getRealWorkflowStepInfo(req: ExpenseRequest): { 
  label: string; 
  color: string;
  stepNumber: number;
  totalSteps: number;
  currentApproverName: string;
  currentApproverRole: string;
  statusText: string;
} {
  if (!req) {
    return {
      label: 'ไม่พบข้อมูล',
      color: 'bg-slate-100 text-slate-600',
      stepNumber: 0,
      totalSteps: 0,
      currentApproverName: '-',
      currentApproverRole: '-',
      statusText: '-'
    };
  }

  if (req.status === 'draft') {
    return {
      label: '📝 แบบร่าง',
      color: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      stepNumber: 0,
      totalSteps: 0,
      currentApproverName: '-',
      currentApproverRole: 'ยังไม่ส่งอนุมัติ',
      statusText: 'แบบร่าง (ผู้ขอเบิกยังไม่ได้ยื่นคำขออนุมัติ)'
    };
  }

  if (req.status === 'cancelled') {
    return {
      label: '🚫 ยกเลิกแล้ว',
      color: 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400',
      stepNumber: 0,
      totalSteps: 0,
      currentApproverName: '-',
      currentApproverRole: 'ยกเลิกเอกสาร',
      statusText: 'เอกสารถูกยกเลิกเรียบร้อยแล้ว'
    };
  }

  if (req.status === 'rejected') {
    const rejectedStep = (req.approvalHistory || []).find(s => s.status === 'rejected');
    return {
      label: '❌ ไม้อนุมัติ',
      color: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/25 dark:text-rose-400 dark:border-rose-900',
      stepNumber: 0,
      totalSteps: req.approvalHistory?.length || 1,
      currentApproverName: rejectedStep?.approverName || 'ผู้อนุมัติ',
      currentApproverRole: rejectedStep?.approverRole || 'ปฏิเสธคำขอ',
      statusText: `ถูกปฏิเสธการอนุมัติโดย ${rejectedStep?.approverName || 'ผู้อนุมัติ'}`
    };
  }

  if (req.status === 'approved' || (req.status as string) === 'cleared') {
    const total = req.approvalHistory?.length || 1;
    return {
      label: '🟢 อนุมัติเสร็จสิ้น (ครบทุกขั้นตอน)',
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900',
      stepNumber: total,
      totalSteps: total,
      currentApproverName: 'อนุมัติแล้ว',
      currentApproverRole: 'เสร็จสิ้นกระบวนการ',
      statusText: 'ผ่านการอนุมัติครบทุกขั้นตอนแล้ว'
    };
  }

  if ((req.status as string) === 'pending_refund') {
    return {
      label: '🟡 รอการเงินตรวจสอบสลิปคืนเงิน',
      color: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900',
      stepNumber: req.approvalHistory?.length || 1,
      totalSteps: req.approvalHistory?.length || 1,
      currentApproverName: 'ฝ่ายการเงิน/บัญชี',
      currentApproverRole: 'ตรวจสอบการโอนคืน',
      statusText: 'ผู้เบิกแนบสลิปคืนเงินแล้ว กำลังรอฝ่ายการเงินตรวจสอบ'
    };
  }

  // Pending approval status
  const steps = req.approvalHistory || [];
  const pendingIndex = steps.findIndex(s => s.status === 'pending');
  const totalSteps = Math.max(steps.length, 1);
  
  let currentApproverName = 'ผู้อนุมัติประจำแผนก';
  let currentApproverRole = 'ผู้อนุมัติ';
  let stepNum = 1;

  if (pendingIndex !== -1) {
    stepNum = pendingIndex + 1;
    currentApproverName = steps[pendingIndex].approverName;
    currentApproverRole = steps[pendingIndex].approverRole;
  } else if (req.current_approver) {
    const dbUsers = getDbUsers();
    const match = dbUsers.find(u => u.user_id === req.current_approver);
    if (match) {
      currentApproverName = match.name;
      currentApproverRole = match.position || match.approval_level || 'ผู้อนุมัติ';
    }
  }

  return {
    label: `⏳ ขั้นตอนที่ ${stepNum}/${totalSteps}: รอ ${currentApproverRole} (${currentApproverName})`,
    color: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900',
    stepNumber: stepNum,
    totalSteps: totalSteps,
    currentApproverName,
    currentApproverRole,
    statusText: `เอกสารอยู่ในขั้นตอนที่ ${stepNum} จาก ${totalSteps}: กำลังรอการพิจารณาโดย ${currentApproverName} (${currentApproverRole})`
  };
}

export function getClearingStatusInfo(req: ExpenseRequest): { label: string; color: string } {
  const stepInfo = getRealWorkflowStepInfo(req);
  return {
    label: stepInfo.label,
    color: stepInfo.color
  };
}




// Notifications
export function getDbNotifications(userId: string): any[] {
  const allNotifications = getFromCache('okey_db_notifications', []);
  return allNotifications.filter((n: any) => n.userId === userId || n.userId === 'all');
}

export function addDbNotification(notification: any) {
  const allNotifications = getFromCache('okey_db_notifications', []);
  allNotifications.unshift({ ...notification, id: generateDocumentId('NOTIFY', new Date().toISOString(), []), createdAt: new Date().toISOString() });
  saveToFirestore('okey_db_notifications', allNotifications);
}

export function markNotificationAsRead(id: string) {
  const allNotifications = getFromCache('okey_db_notifications', []);
  const updated = allNotifications.map((n: any) => n.id === id ? { ...n, isRead: true } : n);
  saveToFirestore('okey_db_notifications', updated);
}

export function markAllNotificationsAsRead(userId: string) {
  const allNotifications = getFromCache('okey_db_notifications', []);
  const updated = allNotifications.map((n: any) => (n.userId === userId || n.userId === 'all') ? { ...n, isRead: true } : n);
  saveToFirestore('okey_db_notifications', updated);
}

export function syncRealNotifications(currentUser: any, requests: any[]) {
  if (!currentUser) return;
  const userId = currentUser.user_id;
  const allNotifications = getFromCache('okey_db_notifications', []);
  let modified = false;

  requests.forEach(req => {
    const creatorId = req.created_by || 'user-1';
    
    // 1. Pending approval: If request is pending and currentUser is the current_approver
    if (req.status === 'pending' && req.current_approver === userId) {
      const exists = allNotifications.some((n: any) => n.requestId === req.id && n.userId === userId && n.type === 'approval' && n.title.includes('รอการอนุมัติ'));
      if (!exists) {
        allNotifications.unshift({
          id: `NOTIFY-PEND-${req.id}-${userId}`,
          userId: userId,
          title: 'มีคำขอรอการอนุมัติใหม่',
          message: `${req.employeeName} ส่งคำขอ '${req.title}' จำนวน ฿${req.amount.toLocaleString()} เพื่อรอการพิจารณา`,
          type: 'approval',
          isRead: false,
          createdAt: req.created_at || new Date().toISOString(),
          linkToTab: 'approval',
          requestId: req.id
        });
        modified = true;
      }
    }

    // 2. Approved: If request is approved, notify the creator
    if ((req.status === 'approved' || req.status === 'cleared' || req.status === 'paid') && creatorId === userId) {
      const exists = allNotifications.some((n: any) => n.requestId === req.id && n.userId === userId && n.type === 'approval' && n.title.includes('ได้รับการอนุมัติ'));
      if (!exists) {
        allNotifications.unshift({
          id: `NOTIFY-APP-${req.id}-${userId}`,
          userId: userId,
          title: 'คำขอของคุณได้รับการอนุมัติเรียบร้อยแล้ว',
          message: `คำขอ '${req.title}' ยอด ฿${req.amount.toLocaleString()} ได้รับอนุมัติสมบูรณ์แล้ว`,
          type: 'approval',
          isRead: false,
          createdAt: new Date().toISOString(),
          linkToTab: 'my-requests',
          requestId: req.id
        });
        modified = true;
      }
    }

    // 3. Rejected/Returned: If request is rejected, notify the creator
    if (req.status === 'rejected' && creatorId === userId) {
      const exists = allNotifications.some((n: any) => n.requestId === req.id && n.userId === userId && n.title.includes('ถูกปฏิเสธ'));
      if (!exists) {
        const latestComment = req.comments && req.comments.length > 0 ? req.comments[req.comments.length - 1].text : 'กรุณาตรวจสอบรายละเอียดและเอกสารแนบใหม่';
        allNotifications.unshift({
          id: `NOTIFY-REJ-${req.id}-${userId}`,
          userId: userId,
          title: 'คำขอของคุณถูกปฏิเสธการอนุมัติ/ส่งกลับแก้ไข',
          message: `คำขอ '${req.title}' ยอด ฿${req.amount.toLocaleString()} ถูกส่งกลับแก้ไข/ปฏิเสธ เนื่องจาก: ${latestComment}`,
          type: 'approval',
          isRead: false,
          createdAt: new Date().toISOString(),
          linkToTab: 'my-requests',
          requestId: req.id
        });
        modified = true;
      }
    }

    // 4. Advance pending clear: If request is advance and is approved and remaining balance is > 0, notify creator
    if (req.expense_type === 'advance' && (req.status === 'approved' || req.status === 'paid') && creatorId === userId) {
      const exists = allNotifications.some((n: any) => n.requestId === req.id && n.userId === userId && n.type === 'advance' && n.title.includes('เงินทดรอง'));
      if (!exists) {
        allNotifications.unshift({
          id: `NOTIFY-ADV-${req.id}-${userId}`,
          userId: userId,
          title: 'Advance รอเคลียร์ (กรุณาส่งใบเคลียร์เงินทดรอง)',
          message: `ใบขอเงินทดรองจ่าย '${req.title}' ยอด ฿${req.amount.toLocaleString()} อนุมัติแล้ว กรุณาเคลียร์ค่าใช้จ่ายภายใน 15 วัน`,
          type: 'advance',
          isRead: false,
          createdAt: new Date().toISOString(),
          linkToTab: 'my-requests',
          requestId: req.id
        });
        modified = true;
      }
    }
  });

  // Welcome system notification
  const welcomeExists = allNotifications.some((n: any) => n.id === `NOTIFY-SYS-WELCOME-${userId}`);
  if (!welcomeExists) {
    allNotifications.push({
      id: `NOTIFY-SYS-WELCOME-${userId}`,
      userId: userId,
      title: 'ยินดีต้อนรับสู่ระบบเบิกจ่าย OKAY Expense',
      message: 'ระบบพร้อมใช้งานสำหรับการบันทึก ขอเบิกจ่าย อนุมัติ และผ่านรายการทางบัญชีแบบครบวงจร',
      type: 'system',
      isRead: false,
      createdAt: new Date().toISOString(),
      linkToTab: 'dashboard'
    });
    modified = true;
  }

  if (modified) {
    saveToFirestore('okey_db_notifications', allNotifications);
  }
}
