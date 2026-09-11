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
  expense_id?: string;
  type?: 'Reimbursement' | 'Advance' | 'Clearing';
  user_id?: string;
  amount: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Locked' | 'Paid' | 'Used' | 'Clearing' | 'Closed' | 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'locked' | 'cleared' | 'pending_refund' | 'refunded' | 'pending_deduction' | 'deducted' | 'more_info' | 'payroll_deduction';
  created_at?: string;
  title: string;
  category: ExpenseCategory;
  date: string;
  department: string;
  employeeName: string;
  employeeRole: string;
  receiptUrl?: string;
  receiptName?: string;
  receiptUrls?: string[];
  receiptNames?: string[];
  description: string;
  policyStatus: 'compliant' | 'warning' | 'violation';
  policyNotes: string[];
  approvalHistory: ApprovalStep[];
  comments: Comment[];
  isDuplicate?: boolean;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  created_by?: string;
  current_approver?: string;
  next_approver?: string | null;
  expense_type?: ExpenseRequestType;
  advance_id?: string;
  advance_status?: 'Open' | 'Partially Cleared' | 'Fully Cleared';
  remaining_balance?: number;
  cleared_amount?: number;
  settlement_type?: 'refund' | 'reimbursement' | 'perfect' | 'payroll_deduction' | 'deduction';
  settlement_amount?: number;
  original_amount?: number;
  partial_approval_reason?: string;
  advance_paid_date?: string;
  clearing_submitted_date?: string;
  refund_transferred_date?: string;
  company_reimbursed_date?: string;
  approved_date?: string;
  finance_processed_date?: string;
  refund_proof_url?: string;
  refund_proof_name?: string;
  reimbursement_proof_url?: string;
  reimbursement_proof_name?: string;
  company_reimbursement_proof_url?: string;
  company_reimbursement_proof_name?: string;
  advance_paid_by?: string;
  company_reimbursed_by?: string;
  payroll_deducted_by?: string;
  payroll_period?: string;
  payroll_deduction_date?: string;
  refund_confirmed_date?: string;
  refund_confirmed_by?: string;
  version?: number;
  revisions?: Array<{ version: string; date: string; time?: string; author: string; action: string; notes?: string; amount?: number; before?: number; after?: number }>;
  file_hash?: string;
  supporting_document_type?: 'receipt' | 'replacement' | 'other';
  other_evidence_type?: string;
  other_evidence_detail?: string;
  replacement_reason?: string;
  replacement_receipt_number?: string;
  replacement_policy_status?: 'compliant' | 'warning' | 'violation';
  replacement_approved?: boolean;
  attachment_list?: Array<{ name: string; dataUrl: string; type: string; category?: 'ใบเสร็จรับเงิน' | 'ใบกำกับภาษี' | 'Slip โอนเงิน' | 'หลักฐานคืนเงินบริษัท' | 'ใบเสนอราคา' | 'ใบแจ้งหนี้ (Invoice)' | 'ใบส่งของ' | 'หนังสือรับรอง' | 'หนังสืออนุมัติ' | 'เอกสารอื่น ๆ' }>;
  replacement_merchant?: string;
  replacement_location?: string;
  replacement_involved?: string;
  replacement_payment_method?: string;
  replacement_remarks?: string;
  has_vat?: boolean;
  vat_amount?: number;
  tax_id?: string;
}

export interface ReplacementPolicy {
  maxAmount: number;
  maxTimesPerMonth: number;
  allowedCategories: string[];
  forbiddenCategories: string[];
  additionalApprovers: string[];
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

export interface ApprovalRule {
  rule_id: string;
  requester_user_id: string;
  approver_user_id: string;
  level: number;
  next_approver_id: string | null;
}

export interface ApprovalLog {
  log_id: string;
  request_id: string;
  action_by: string;
  action: 'approve' | 'reject';
  timestamp: string;
  comment: string;
}

export interface Department {
  department_id: string;
  department_name: string;
  // Existing project data already uses these fields; keep them optional for backward compatibility.
  id?: string;
  name?: string;
  head_of_department?: string;
  budget?: number;
  budgetLimit?: number;
  budgetSpent?: number;
  budgetPending?: number;
  status?: string;
  color?: string;
}

export interface UserProfile {
  user_id: string;
  employee_id?: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  department: string;
  position: string;
  role?: string;
  is_active: boolean;
  approval_level?: string;
  signatureUrl?: string;
  signature_id?: string;
  signature_vector?: string;
  signature_metadata?: string;
  profilePictureUrl?: string;
  force_password_change?: boolean;
  title?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  idCard?: string;
  idCardImageUrl?: string;
  birthDate?: string;
  age?: number;
  gender?: string;
  address?: string;
  province?: string;
  electricityRegion?: string;
  startDate?: string;
  employmentStatus?: 'probation' | 'active' | 'suspended' | 'resigned';
  bankName?: string;
  bankAccount?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  deleted?: boolean;
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
  action_by: string;
  action_type: string;
  ref_id: string;
  timestamp: string;
  details: string;
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
  advance_id: string;
  request_id: string;
  approved_amount: number;
  remaining_balance: number;
}

export interface ExpenseItem {
  item_id: string;
  request_id: string;
  description: string;
  amount: number;
  receipt_url?: string;
  receipt_name?: string;
}
