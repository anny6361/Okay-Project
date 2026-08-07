export interface Comment {
  id: string;
  author: string;
  date: string;
  text: string;
}

export interface ApprovalStep {
  id: string;
  approverName: string;
  approverRole: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  comment?: string;
}

export type ExpenseCategory = string;
export type ExpenseRequestType = 'advance' | 'reimbursement' | 'clearing';

export interface ExpenseRequest {
  id: string;
  expense_id?: string; // primary key
  type?: 'Reimbursement' | 'Advance' | 'Clearing';
  user_id?: string; // creator user_id
  amount: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Locked' | 'Paid' | 'Used' | 'Clearing' | 'Closed' | 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'locked' | 'cleared' | 'pending_refund' | 'refunded' | 'pending_deduction' | 'deducted' | 'more_info' | 'payroll_deduction';
  created_at?: string;
  
  title: string;
  category: ExpenseCategory;
  date: string;
  department: string;
  employeeName: string;
  employeeRole: string;
  receiptUrl?: string; // legacy support
  receiptName?: string; // legacy support
  receiptUrls?: string[]; // Multiple receipts
  receiptNames?: string[]; // Multiple receipt names
  description: string;
  policyStatus: 'compliant' | 'warning' | 'violation';
  policyNotes: string[];
  approvalHistory: ApprovalStep[];
  comments: Comment[];
  isDuplicate?: boolean;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  
  // Relational Database Fields for Dynamic Approval System
  created_by?: string;       // user_id
  current_approver?: string; // user_id of active approver in the rule chain
  next_approver?: string | null; // user_id of subsequent approver
  
  // Enterprise Expense Extensions
  expense_type?: ExpenseRequestType; // 'advance' | 'reimbursement' | 'clearing'
  advance_id?: string;               // Reference to an advance request if clearing
  advance_status?: 'Open' | 'Partially Cleared' | 'Fully Cleared'; // Advance status tracker
  remaining_balance?: number;        // Tracking remaining advance balance
  cleared_amount?: number;           // Actual cleared spent amount
  settlement_type?: 'refund' | 'reimbursement' | 'perfect' | 'payroll_deduction' | 'deduction'; // Clearing decision
  settlement_amount?: number;        // The calculated refund or deduction amount
  original_amount?: number;          // The originally requested amount prior to partial approval
  partial_approval_reason?: string;  // The reason for partial approval
  advance_paid_date?: string;        // วันที่รับเงินทดรอง
  clearing_submitted_date?: string;  // วันที่ส่งใบเคลียร์
  refund_transferred_date?: string;  // วันที่โอนเงินคืนบริษัท
  company_reimbursed_date?: string;  // วันที่บริษัทจ่ายเพิ่ม
  approved_date?: string;            // วันที่อนุมัติ
  finance_processed_date?: string;   // วันที่ฝ่ายการเงินดำเนินการ
  
  refund_proof_url?: string;         // ลิงก์รูป/PDF หลักฐานการโอนเงินคืน
  refund_proof_name?: string;        // ชื่อไฟล์หลักฐานการโอนเงินคืน
  reimbursement_proof_url?: string;  // ลิงก์รูป/PDF หลักฐานการโอนเงินเพิ่ม
  reimbursement_proof_name?: string; // ชื่อไฟล์หลักฐานการโอนเงินเพิ่ม
  company_reimbursement_proof_url?: string;
  company_reimbursement_proof_name?: string;
  advance_paid_by?: string;
  company_reimbursed_by?: string;
  payroll_deducted_by?: string;
  payroll_period?: string;           // งวดบัญชีหักเงินเดือน (เช่น 2026-07)
  payroll_deduction_date?: string;   // วันที่หักเงินเดือน
  refund_confirmed_date?: string;    // วันที่ฝ่ายการเงินยืนยันการรับคืนเงิน
  refund_confirmed_by?: string;      // ชื่อฝ่ายการเงินที่ยืนยันการรับคืนเงิน
  
  version?: number;
  revisions?: Array<{ version: string; date: string; time?: string; author: string; action: string; notes?: string; amount?: number; before?: number; after?: number }>;
  file_hash?: string;

  // Replacement Receipt Fields
  supporting_document_type?: 'receipt' | 'replacement' | 'other';
  other_evidence_type?: string;
  other_evidence_detail?: string;
  replacement_reason?: string;
  replacement_receipt_number?: string;
  replacement_policy_status?: 'compliant' | 'warning' | 'violation';
  replacement_approved?: boolean;
  attachment_list?: Array<{ 
    name: string; 
    dataUrl: string; 
    type: string; 
    category?: 'ใบเสร็จรับเงิน' | 'ใบกำกับภาษี' | 'Slip โอนเงิน' | 'หลักฐานคืนเงินบริษัท' | 'ใบเสนอราคา' | 'ใบแจ้งหนี้ (Invoice)' | 'ใบส่งของ' | 'หนังสือรับรอง' | 'หนังสืออนุมัติ' | 'เอกสารอื่น ๆ' 
  }>;
  replacement_merchant?: string;
  replacement_location?: string;
  replacement_involved?: string;
  replacement_payment_method?: string;
  replacement_remarks?: string;

  // VAT & Tax Support
  has_vat?: boolean;
  vat_amount?: number;
  tax_id?: string;
}

export interface ReplacementPolicy {
  maxAmount: number;
  maxTimesPerMonth: number;
  allowedCategories: string[];
  forbiddenCategories: string[];
  additionalApprovers: string[]; // user_id array
}

export interface DepartmentBudget {
  department: string;
  allocated: number;
  spent: number;
  pending: number;
  color: string;
}

export interface ExpenseCategoryConfig {
  id: ExpenseCategory;
  name: string;
  limitPerRequest: number;
  requiresReceipt: boolean;
  color: string;
}

export interface OCRResult {
  merchant: string;
  date: string;
  amount: number;
  items: Array<{ name: string; price: number }>;
  taxId?: string;
}

// === DYNAMIC DATABASE SCHEMAS ===

export interface ApprovalRule {
  rule_id: string;        // Primary Key
  requester_user_id: string; // The user who submits (can be specific user ID)
  approver_user_id: string;  // The user assigned to approve
  level: number;            // Step sequence (e.g. 1, 2, 3...)
  next_approver_id: string | null; // Next rule ID or direct next approver ID
}

export interface ApprovalLog {
  log_id: string;        // Primary Key
  request_id: string;
  action_by: string;     // user_id of the person who acted
  action: 'approve' | 'reject';
  timestamp: string;
  comment: string;
}

// === ENTERPRISE FINANCE DATABASE EXPANSIONS ===

export interface Department {
  department_id: string;   // Primary Key
  department_name: string;
}

export interface UserProfile {
  user_id: string;
  employee_id?: string;         // Primary Key
  username: string;        // E.g., Okay0001, Okay0002
  name: string;
  email?: string;
  phone?: string;          // Mobile number for login
  password?: string;
  department: string;
  position: string;
  role?: string;
  is_active: boolean;
  approval_level?: string; // Level 1, Level 2, Level 3, Finance, Admin etc.
  signatureUrl?: string;   // Image (PNG/Base64/Drive Link)
  signature_id?: string;   // Google Drive File ID
  signature_vector?: string; // Serialized SVG/Coordinates
  signature_metadata?: string; // Date, IP, Device Metadata
  profilePictureUrl?: string; // Base64 or image URL
  force_password_change?: boolean; // Force user to change password on first login

  // Employee Profile Extended Fields (Section 1)
  title?: string;             // คำนำหน้า (e.g. นาย, นาง, นางสาว)
  firstName?: string;         // ชื่อ
  lastName?: string;          // นามสกุล
  nickname?: string;           // ชื่อเล่น
  idCard?: string;            // เลขบัตรประชาชน 13 หลัก
  idCardImageUrl?: string;    // รูปภาพบัตรประชาชน
  birthDate?: string;         // วันเดือนปีเกิด YYYY-MM-DD
  age?: number;               // อายุ
  gender?: string;            // เพศ
  address?: string;           // ที่อยู่
  province?: string;          // จังหวัด
  electricityRegion?: string; // เขตการไฟฟ้าที่รับผิดชอบ
  startDate?: string;         // วันที่เริ่มงาน YYYY-MM-DD
  employmentStatus?: 'probation' | 'active' | 'suspended' | 'resigned'; // สถานะพนักงาน
  bankName?: string;          // ธนาคาร
  bankAccount?: string;       // เลขบัญชี
  emergencyContact?: string;  // ผู้ติดต่อฉุกเฉิน
  emergencyPhone?: string;    // เบอร์ผู้ติดต่อฉุกเฉิน
  deleted?: boolean;          // Soft Delete Flag
}

export interface CompanyMasterData {
  companyName: string;
  logoUrl: string;
  address: string;
  taxId: string;
  phone: string;
  email: string;
  bankInfo: string;
}

export interface EnterpriseAuditLog {
  log_id: string;
  action_by: string; // Name or User ID
  action_type: string; // Event type
  ref_id: string; // request_id / doc_id / etc.
  timestamp: string;
  details: string;

  // Rich Enterprise Auditing Fields
  event: 'Login' | 'Logout' | 'Upload' | 'Download' | 'Preview' | 'Print' | 'Approve' | 'Reject' | 'Cancel' | 'Delete' | 'Edit' | 'Permission_Change' | 'Budget_Change' | 'Master_Change';
  user_name: string;
  user_id: string;
  role: string;
  date: string;
  time: string;
  ip_address: string;
  browser: string;
  device: string;
  os: string;
}

export interface AdvanceRecord {
  advance_id: string;      // Primary Key
  request_id: string;      // Reference to ExpenseRequest
  approved_amount: number;
  remaining_balance: number;
}

export interface ExpenseItem {
  item_id: string;         // Primary Key
  request_id: string;      // Reference to ExpenseRequest
  description: string;
  amount: number;
  receipt_url?: string;
  receipt_name?: string;
}

export interface ClearingRecord {
  clearing_id: string;     // Primary Key
  advance_id: string;      // Reference to AdvanceRecord
  total_spent: number;
  refund_amount: number;   // Calculated if spent < advance
  extra_payment: number;   // Calculated if spent > advance (deduction)
  status: 'pending' | 'cleared';
}

export interface RefundRecord {
  refund_id: string;       // Primary Key
  advance_id: string;      // Reference to AdvanceRecord
  amount: number;
  status: 'pending' | 'refunded' | 'payroll_deduction';
  approved_by?: string;    // user_id (Finance)
  date: string;
}

export interface DeductionRecord {
  deduction_id: string;    // Primary Key
  user_id: string;         // Reference to UserProfile
  amount: number;
  method: 'salary' | 'invoice'; // Payroll deduction or employee pay invoice
  status: 'pending' | 'deducted';
  approved_by?: string;    // user_id
  date: string;
}

export interface JournalEntry {
  journal_id: string;      // Primary Key (E.g. JRN-2026-0001)
  ref_type: 'expense' | 'refund' | 'deduction' | 'advance';
  ref_id: string;          // ID of referencing document/record
  debit_account: string;
  credit_account: string;
  amount: number;
  date: string;
  description: string;
}

export interface AccountingDocument {
  doc_id: string;          // Primary Key (AUTO-XXXX)
  doc_type: 'expense_voucher' | 'advance_payment_voucher' | 'refund_receipt' | 'deduction_notice' | 'reimbursement_voucher';
  ref_id: string;          // Source record reference
  requester_name: string;
  department: string;
  details: string;
  amount: number;
  date: string;
  approved_by?: string;
}

export interface Department {
  department_id: string; // รหัสแผนก
  department_name: string; // ชื่อแผนก
  head_of_department: string; // หัวหน้าแผนก
  budget: number; // งบประมาณประจำปี/เดือน
  status: 'active' | 'disabled'; // สถานะ
}

export interface ExpenseTypeMaster {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  order: number;
}

export interface ExpenseCategoryMaster {
  id: string;
  name: string;
  limitPerRequest: number;
  requiresReceipt: boolean;
  color: string;
  isActive: boolean;
  order: number;
}

export interface ApprovalLevelMaster {
  level_id: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface RoleMaster {
  role_id: string;
  role_name: string;
  permissions: string[];
  approval_sequence: number;
}

export interface PdfTemplateMaster {
  template_id: string;
  template_name: string;
  color_primary: string;
  color_secondary: string;
  isActive: boolean;
}





export interface NotificationMessage {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'approval' | 'advance' | 'system' | 'general';
  isRead: boolean;
  createdAt: string;
  linkToTab?: string;
  requestId?: string;
}
