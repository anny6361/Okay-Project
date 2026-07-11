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
  },
  {
    user_id: 'user-admin',
    employee_id: 'Okay0000',
    username: 'Okay0000',
    name: 'สิรินธร รัตนสกุล (Admin)',
    email: 'admin@okey.com',
    phone: '080-000-0000',
    password: 'password123',
    department: 'บัญชีและการเงิน (Finance)',
    position: 'Chief Financial Officer',
    role: 'Administrator',
    is_active: true,
    approval_level: 'Administrator',
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png',
    title: 'นางสาว',
    firstName: 'สิรินธร',
    lastName: 'รัตนสกุล',
    nickname: 'ปลา',
    idCard: '1200901234563',
    birthDate: '1985-05-15',
    age: calculateAge('1985-05-15'),
    gender: 'female',
    address: '99/1 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร',
    province: 'กรุงเทพมหานคร',
    electricityRegion: 'สำนักงานใหญ่ (กฟผ.)',
    startDate: '2020-01-10',
    employmentStatus: 'active'
  },
  {
    user_id: 'user-hr',
    employee_id: 'Okay0001',
    username: 'Okay0001',
    name: 'รุ่งโรจน์ สุวรรณรัตน์',
    email: 'hr@okey.com',
    phone: '081-111-1111',
    password: 'password123',
    department: 'ทรัพยากรบุคคล (HR)',
    position: 'HR Director',
    role: 'HR',
    is_active: true,
    approval_level: 'HR',
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png',
    title: 'นาย',
    firstName: 'รุ่งโรจน์',
    lastName: 'สุวรรณรัตน์',
    nickname: 'รุ่ง',
    idCard: '1200901234571',
    birthDate: '1982-11-20',
    age: calculateAge('1982-11-20'),
    gender: 'male',
    address: '102 หมู่ 4 ตำบลคลองหนึ่ง อำเภอคลองหลวง จังหวัดปทุมธานี',
    province: 'ปทุมธานี',
    electricityRegion: 'ภาคกลาง (กฟก.1)',
    startDate: '2021-03-15',
    employmentStatus: 'active'
  },
  {
    user_id: 'user-finance',
    employee_id: 'Okay0002',
    username: 'Okay0002',
    name: 'มนัญญา ใจสู้',
    email: 'finance@okey.com',
    phone: '082-222-2222',
    password: 'password123',
    department: 'บัญชีและการเงิน (Finance)',
    position: 'Finance Manager',
    role: 'Finance',
    is_active: true,
    approval_level: 'Finance',
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png',
    title: 'นางสาว',
    firstName: 'มนัญญา',
    lastName: 'ใจสู้',
    nickname: 'มุก',
    idCard: '1200901234580',
    birthDate: '1988-08-08',
    age: calculateAge('1988-08-08'),
    gender: 'female',
    address: '45/8 ถนนบรมราชชนนี แขวงตลิ่งชัน เขตตลิ่งชัน กรุงเทพมหานคร',
    province: 'กรุงเทพมหานคร',
    electricityRegion: 'ภาคกลาง (กฟก.2)',
    startDate: '2019-11-01',
    employmentStatus: 'active'
  },
  {
    user_id: 'user-manager',
    employee_id: 'Okay0003',
    username: 'Okay0003',
    name: 'สมชาย รักดี',
    email: 'manager@okey.com',
    phone: '083-333-3333',
    password: 'password123',
    department: 'ไอที (IT)',
    position: 'IT Director',
    role: 'Manager',
    is_active: true,
    approval_level: 'Level 2',
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png',
    title: 'นาย',
    firstName: 'สมชาย',
    lastName: 'รักดี',
    nickname: 'ชาย',
    idCard: '1200901234598',
    birthDate: '1980-04-12',
    age: calculateAge('1980-04-12'),
    gender: 'male',
    address: '12/3 ถนนแจ้งวัฒนะ ตำบลปากเกร็ด อำเภอปากเกร็ด จังหวัดนนทบุรี',
    province: 'นนทบุรี',
    electricityRegion: 'ภาคเหนือ (กฟน.1)',
    startDate: '2015-06-01',
    employmentStatus: 'active'
  },
  {
    user_id: 'user-employee',
    employee_id: 'Okay0004',
    username: 'Okay0004',
    name: 'ณภัทร วงศ์ษา',
    email: 'employee@okey.com',
    phone: '084-444-4444',
    password: 'password123',
    department: 'ฝ่ายขาย (Sales)',
    position: 'Sales Representative',
    role: 'Employee',
    is_active: true,
    approval_level: 'Level 1',
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png',
    title: 'นาย',
    firstName: 'ณภัทร',
    lastName: 'วงศ์ษา',
    nickname: 'ภัทร',
    idCard: '1200901234609',
    birthDate: '1995-09-25',
    age: calculateAge('1995-09-25'),
    gender: 'male',
    address: '88 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร',
    province: 'กรุงเทพมหานคร',
    electricityRegion: 'ภาคใต้ (กฟต.1)',
    startDate: '2023-05-10',
    employmentStatus: 'active'
  },
  {
    user_id: 'user-executive',
    employee_id: 'Okay0005',
    username: 'Okay0005',
    name: 'วิลาสินี มีโชค',
    email: 'executive@okey.com',
    phone: '085-555-5555',
    password: 'password123',
    department: 'การตลาด (Marketing)',
    position: 'Executive Director',
    role: 'Executive',
    is_active: true,
    approval_level: 'Executive',
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png',
    title: 'นาง',
    firstName: 'วิลาสินี',
    lastName: 'มีโชค',
    nickname: 'ก้อย',
    idCard: '1200901234617',
    birthDate: '1978-01-30',
    age: calculateAge('1978-01-30'),
    gender: 'female',
    address: '159 ถนนวิภาวดีรังสิต แขวงตลาดบางเขน เขตหลักสี่ กรุงเทพมหานคร',
    province: 'กรุงเทพมหานคร',
    electricityRegion: 'ภาคตะวันออกเฉียงเหนือ (กฟอ.1)',
    startDate: '2010-02-15',
    employmentStatus: 'active'
  }
];

export const INITIAL_DEPARTMENTS: Department[] = [
  { department_id: 'dept-1', department_name: 'ไอที (IT)', head_of_department: 'สมชาย รักดี', budget: 500000, status: 'active' },
  { department_id: 'dept-2', department_name: 'ฝ่ายขาย (Sales)', head_of_department: 'ณภัทร วงศ์ษา', budget: 350000, status: 'active' },
  { department_id: 'dept-3', department_name: 'การตลาด (Marketing)', head_of_department: 'วิลาสินี มีโชค', budget: 600000, status: 'active' },
  { department_id: 'dept-4', department_name: 'บัญชีและการเงิน (Finance)', head_of_department: 'มนัญญา ใจสู้', budget: 150000, status: 'active' },
  { department_id: 'dept-5', department_name: 'ทรัพยากรบุคคล (HR)', head_of_department: 'รุ่งโรจน์ สุวรรณรัตน์', budget: 200000, status: 'active' }
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
  // If bcrypt hash
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(password, hash);
    } catch (e) {
      return false;
    }
  }
  // Legacy plain text check
  return password === hash || hashPassword(password) === hash;
}

export function getDbUsers(): UserProfile[] {
  const users = localStorage.getItem('okey_db_users');
  if (users) {
    try {
      let parsed = JSON.parse(users);
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
        localStorage.setItem('okey_db_users', JSON.stringify(enriched));
        return enriched;
      }
      return parsed;
    } catch (e) {
      const initialWithHashedPasswords = INITIAL_USERS.map(u => ({
        ...u,
        password: u.password ? hashPassword(u.password) : undefined
      }));
      localStorage.setItem('okey_db_users', JSON.stringify(initialWithHashedPasswords));
      return initialWithHashedPasswords;
    }
  }
  
  const initialWithHashedPasswords = INITIAL_USERS.map(u => ({
    ...u,
    password: u.password ? hashPassword(u.password) : undefined
  }));
  localStorage.setItem('okey_db_users', JSON.stringify(initialWithHashedPasswords));
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

  localStorage.setItem('okey_db_users', JSON.stringify(finalUsers));
}

export function getDbRules(): ApprovalRule[] {
  const rules = localStorage.getItem('okey_db_rules');
  if (rules) return JSON.parse(rules);
  localStorage.setItem('okey_db_rules', JSON.stringify(INITIAL_RULES));
  return INITIAL_RULES;
}

export function saveDbRules(rules: ApprovalRule[]) {
  localStorage.setItem('okey_db_rules', JSON.stringify(rules));
}

export function getDbLogs(): ApprovalLog[] {
  const logs = localStorage.getItem('okey_db_logs');
  if (logs) return JSON.parse(logs);
  const initialLogs: ApprovalLog[] = [];
  localStorage.setItem('okey_db_logs', JSON.stringify(initialLogs));
  return initialLogs;
}

export function saveDbLogs(logs: ApprovalLog[]) {
  localStorage.setItem('okey_db_logs', JSON.stringify(logs));
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
  const depts = localStorage.getItem('okey_db_departments');
  if (depts) return JSON.parse(depts);
  localStorage.setItem('okey_db_departments', JSON.stringify(INITIAL_DEPARTMENTS));
  return INITIAL_DEPARTMENTS;
}

export function saveDbDepartments(depts: Department[]) {
  localStorage.setItem('okey_db_departments', JSON.stringify(depts));
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
  const data = localStorage.getItem('okey_db_refunds');
  if (data) return JSON.parse(data);
  const initial: RefundRecord[] = [];
  localStorage.setItem('okey_db_refunds', JSON.stringify(initial));
  return initial;
}

export function saveDbRefunds(refunds: RefundRecord[]) {
  localStorage.setItem('okey_db_refunds', JSON.stringify(refunds));
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
  const data = localStorage.getItem('okey_db_deductions');
  if (data) return JSON.parse(data);
  const initial: DeductionRecord[] = [];
  localStorage.setItem('okey_db_deductions', JSON.stringify(initial));
  return initial;
}

export function saveDbDeductions(deductions: DeductionRecord[]) {
  localStorage.setItem('okey_db_deductions', JSON.stringify(deductions));
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
  const data = localStorage.getItem('okey_db_journal_entries');
  if (data) return JSON.parse(data);
  const initial: JournalEntry[] = [];
  localStorage.setItem('okey_db_journal_entries', JSON.stringify(initial));
  return initial;
}

export function saveDbJournalEntries(entries: JournalEntry[]) {
  localStorage.setItem('okey_db_journal_entries', JSON.stringify(entries));
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
  const data = localStorage.getItem('okey_db_accounting_docs');
  if (data) return JSON.parse(data);
  const initial: AccountingDocument[] = [];
  localStorage.setItem('okey_db_accounting_docs', JSON.stringify(initial));
  return initial;
}

export function saveDbAccountingDocuments(docs: AccountingDocument[]) {
  localStorage.setItem('okey_db_accounting_docs', JSON.stringify(docs));
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
  { id: 'travel', name: 'ค่าเดินทางและที่พัก (Travel)', limitPerRequest: 15000, requiresReceipt: true, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', isActive: true, order: 1 },
  { id: 'meals', name: 'ค่ารับรองและอาหาร (Meals)', limitPerRequest: 3000, requiresReceipt: true, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', isActive: true, order: 2 },
  { id: 'equipment', name: 'อุปกรณ์สำนักงาน/เครื่องมือ (Equipment)', limitPerRequest: 50000, requiresReceipt: true, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', isActive: true, order: 3 },
  { id: 'software', name: 'ค่าซอฟต์แวร์และคลาวด์ (Software)', limitPerRequest: 20000, requiresReceipt: true, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', isActive: true, order: 4 },
  { id: 'training', name: 'ค่าฝึกอบรมและสัมมนา (Training)', limitPerRequest: 25000, requiresReceipt: true, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', isActive: true, order: 5 },
  { id: 'marketing', name: 'ค่าโฆษณาและการตลาด (Marketing)', limitPerRequest: 100000, requiresReceipt: true, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', isActive: true, order: 6 },
  { id: 'other', name: 'ค่าใช้จ่ายอื่นๆ (Other)', limitPerRequest: 5000, requiresReceipt: false, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', isActive: true, order: 7 }
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
  const data = localStorage.getItem('okey_db_company_data');
  if (data) return JSON.parse(data);
  localStorage.setItem('okey_db_company_data', JSON.stringify(INITIAL_COMPANY_DATA));
  return INITIAL_COMPANY_DATA;
}

export function saveDbCompanyData(data: CompanyMasterData) {
  localStorage.setItem('okey_db_company_data', JSON.stringify(data));
}

// RICH CATEGORIES MASTER DATA
export function getDbCategories(): ExpenseCategoryMaster[] {
  const data = localStorage.getItem('okey_db_categories_master');
  if (data) return JSON.parse(data);
  localStorage.setItem('okey_db_categories_master', JSON.stringify(INITIAL_CATEGORIES_MASTER));
  return INITIAL_CATEGORIES_MASTER;
}

export function saveDbCategories(categories: ExpenseCategoryMaster[]) {
  localStorage.setItem('okey_db_categories_master', JSON.stringify(categories));
}

// EXPENSE TYPES MASTER DATA
export function getDbExpenseTypes(): ExpenseTypeMaster[] {
  const data = localStorage.getItem('okey_db_expense_types');
  if (data) return JSON.parse(data);
  localStorage.setItem('okey_db_expense_types', JSON.stringify(INITIAL_EXPENSE_TYPES));
  return INITIAL_EXPENSE_TYPES;
}

export function saveDbExpenseTypes(types: ExpenseTypeMaster[]) {
  localStorage.setItem('okey_db_expense_types', JSON.stringify(types));
}

// APPROVAL LEVELS MASTER DATA
export function getDbApprovalLevels(): ApprovalLevelMaster[] {
  const data = localStorage.getItem('okey_db_approval_levels');
  if (data) return JSON.parse(data);
  localStorage.setItem('okey_db_approval_levels', JSON.stringify(INITIAL_APPROVAL_LEVELS));
  return INITIAL_APPROVAL_LEVELS;
}

export function saveDbApprovalLevels(levels: ApprovalLevelMaster[]) {
  localStorage.setItem('okey_db_approval_levels', JSON.stringify(levels));
}

// ROLES MASTER DATA
export function getDbRoles(): RoleMaster[] {
  const data = localStorage.getItem('okey_db_roles_master');
  if (data) return JSON.parse(data);
  localStorage.setItem('okey_db_roles_master', JSON.stringify(INITIAL_ROLES_MASTER));
  return INITIAL_ROLES_MASTER;
}

export function saveDbRoles(roles: RoleMaster[]) {
  localStorage.setItem('okey_db_roles_master', JSON.stringify(roles));
}

// PDF TEMPLATES MASTER DATA
export function getDbPdfTemplates(): PdfTemplateMaster[] {
  const data = localStorage.getItem('okey_db_pdf_templates');
  if (data) return JSON.parse(data);
  localStorage.setItem('okey_db_pdf_templates', JSON.stringify(INITIAL_PDF_TEMPLATES));
  return INITIAL_PDF_TEMPLATES;
}

export function saveDbPdfTemplates(templates: PdfTemplateMaster[]) {
  localStorage.setItem('okey_db_pdf_templates', JSON.stringify(templates));
}

// REALTIME BUDGETS MONITORING ENGINE (Requirement 8)
export function getRealtimeBudgets(): DepartmentBudget[] {
  const depts = getDbDepartments();
  const requests: ExpenseRequest[] = JSON.parse(localStorage.getItem('okey_requests') || '[]');
  
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
  const data = localStorage.getItem('okey_db_enterprise_audit_logs');
  if (data) return JSON.parse(data);
  const initial: EnterpriseAuditLog[] = [];
  localStorage.setItem('okey_db_enterprise_audit_logs', JSON.stringify(initial));
  return initial;
}

export function saveDbEnterpriseAuditLogs(logs: EnterpriseAuditLog[]) {
  localStorage.setItem('okey_db_enterprise_audit_logs', JSON.stringify(logs));
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
  const policy = localStorage.getItem('okey_db_replacement_policy');
  if (policy) {
    try {
      return JSON.parse(policy);
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
  localStorage.setItem('okey_db_replacement_policy', JSON.stringify(initial));
  return initial;
}

export function saveDbReplacementPolicy(policy: ReplacementPolicy) {
  localStorage.setItem('okey_db_replacement_policy', JSON.stringify(policy));
}

// Helper to get real photo-realistic receipt images for any request (No mock text/blue-band cards)
export function getRealReceiptImages(req: ExpenseRequest): string[] {
  if (!req) return [];
  const list: string[] = [];
  
  // 1. Check if we have attachment_list (usually populated for replacement receipts, or when users attach additional files)
  if (req.attachment_list && req.attachment_list.length > 0) {
    req.attachment_list.forEach(file => {
      if (file.dataUrl) {
        list.push(file.dataUrl);
      }
    });
  }
  
  // 2. Check if we have receiptUrls
  if (req.receiptUrls && req.receiptUrls.length > 0) {
    req.receiptUrls.forEach(url => {
      // If it's a base64 image or actual absolute/relative url, push it
      if (url && (url.startsWith('data:image/') || url.startsWith('data:application/pdf') || url.startsWith('http') || url.startsWith('/'))) {
        list.push(url);
      } else if (url) {
        // Map the legacy filename to a genuine high-quality receipt image
        const img = mapFilenameToRealReceipt(url, req.category);
        if (img) list.push(img);
      }
    });
  } else if (req.receiptName) {
    if (req.receiptName.startsWith('data:image/') || req.receiptName.startsWith('data:application/pdf') || req.receiptName.startsWith('http') || req.receiptName.startsWith('/')) {
      list.push(req.receiptName);
    } else {
      const img = mapFilenameToRealReceipt(req.receiptName, req.category);
      if (img) list.push(img);
    }
  }
  
  // fallback if there's absolutely nothing
  if (list.length === 0) {
    list.push(mapFilenameToRealReceipt('default', req.category));
  }
  
  return list;
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
    const dbRequestsStr = localStorage.getItem('okey_requests');
    if (dbRequestsStr) {
      try {
        requestsList = JSON.parse(dbRequestsStr);
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
  const data = localStorage.getItem('okey_requests');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function getClearingStatusInfo(req: ExpenseRequest): { label: string; color: string } {
  if (req.expense_type !== 'clearing') {
    if (req.status === 'approved') return { label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' };
    if (req.status === 'rejected') return { label: 'ปฏิเสธ', color: 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400' };
    if (req.status === 'pending') return { label: 'รออนุมัติ', color: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400' };
    return { label: 'แบบร่าง', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  }

  if (req.status === 'draft') {
    return {
      label: 'แบบร่าง (Draft)',
      color: 'bg-slate-100 text-slate-600 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
    };
  }

  if (req.status === 'pending') {
    return {
      label: '🟡 รออนุมัติการเคลียร์ (Pending Clearing Approval)',
      color: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900'
    };
  }

  if (req.status === 'rejected') {
    return {
      label: '❌ ไม้อนุมัติการเคลียร์',
      color: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400'
    };
  }

  if (req.status === 'payroll_deduction' || req.settlement_type === 'payroll_deduction') {
    return {
      label: '🔴 Payroll Deduction',
      color: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/25 dark:text-rose-400 dark:border-rose-900'
    };
  }

  if ((req.status as string) === 'cleared') {
    return {
      label: '🟢 Cleared',
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
    };
  }

  if ((req.status as string) === 'pending_refund') {
    return {
      label: '🟡 รอตรวจสอบยอดโอนคืน (Pending Refund Confirmation)',
      color: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800'
    };
  }

  const allRequests = getDbRequests();
  const matchedAdvance = req.advance_id ? allRequests.find(r => r.id === req.advance_id) : undefined;
  const advAmount = matchedAdvance ? (matchedAdvance.amount || 0) : 0;
  const spentAmount = req.amount || 0;
  const diff = spentAmount - advAmount;

  if (diff < 0) {
    if ((req.status as string) === 'refunded' || (req.status as string) === 'cleared') {
      return {
        label: '🟢 Cleared',
        color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
      };
    } else if ((req.status as string) === 'pending_refund') {
      return {
        label: '🟡 รอตรวจสอบยอดโอนคืน (Pending Refund Confirmation)',
        color: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800'
      };
    } else {
      return {
        label: '🟠 รอคืนเงินบริษัท (Waiting for Refund)',
        color: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900'
      };
    }
  } else if (diff > 0) {
    if ((req.status as string) === 'cleared') {
      return {
        label: '🟢 Cleared',
        color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
      };
    }
    return {
      label: '🔵 Additional Reimbursement',
      color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900'
    };
  } else {
    return {
      label: '🟢 Cleared',
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
    };
  }
}




// Notifications
export function getDbNotifications(userId: string): any[] {
  const allNotifications = JSON.parse(localStorage.getItem('okey_db_notifications') || '[]');
  return allNotifications.filter((n: any) => n.userId === userId || n.userId === 'all');
}

export function addDbNotification(notification: any) {
  const allNotifications = JSON.parse(localStorage.getItem('okey_db_notifications') || '[]');
  allNotifications.unshift({ ...notification, id: generateDocumentId('NOTIFY', new Date().toISOString(), []), createdAt: new Date().toISOString() });
  localStorage.setItem('okey_db_notifications', JSON.stringify(allNotifications));
}

export function markNotificationAsRead(id: string) {
  const allNotifications = JSON.parse(localStorage.getItem('okey_db_notifications') || '[]');
  const updated = allNotifications.map((n: any) => n.id === id ? { ...n, isRead: true } : n);
  localStorage.setItem('okey_db_notifications', JSON.stringify(updated));
}

export function markAllNotificationsAsRead(userId: string) {
  const allNotifications = JSON.parse(localStorage.getItem('okey_db_notifications') || '[]');
  const updated = allNotifications.map((n: any) => (n.userId === userId || n.userId === 'all') ? { ...n, isRead: true } : n);
  localStorage.setItem('okey_db_notifications', JSON.stringify(updated));
}

export function syncRealNotifications(currentUser: any, requests: any[]) {
  if (!currentUser) return;
  const userId = currentUser.user_id;
  const allNotifications = JSON.parse(localStorage.getItem('okey_db_notifications') || '[]');
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
    localStorage.setItem('okey_db_notifications', JSON.stringify(allNotifications));
  }
}
