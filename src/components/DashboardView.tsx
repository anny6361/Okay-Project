import React, { useState } from 'react';
import { uploadToStorage } from '../lib/storage';
import { openPdfPreview } from '../lib/pdf-preview';
import { 
  ArrowRight, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  PlusCircle, 
  Users, 
  Activity,
  FileSpreadsheet,
  Wallet,
  CheckSquare,
  AlertCircle,
  Award,
  DollarSign,
  Layers,
  Database,
  Building,
  Check,
  X,
  Eye,
  FileText,
  Search,
  Bell,
  Cpu,
  RefreshCw,
  Server,
  Fingerprint,
  ArrowLeft,
  Printer,
  Download,
  Trash2,
  Edit,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { ExpenseRequest, DepartmentBudget, UserProfile, ApprovalStep } from '../types';
import { CATEGORIES_CONFIG } from '../data/masterData';
import { getDbUsers, getClearingStatusInfo, addEnterpriseAuditLog, getDbDepartments, getDbJournalEntries, getDbEnterpriseAuditLogs, getDbRequests } from '../data/db';


interface DashboardViewProps {
  requests: ExpenseRequest[];
  budgets: DepartmentBudget[];
  setActiveTab: (tab: string) => void;
  onSelectRequest: (request: ExpenseRequest) => void;
  onCreateNewRequest: () => void;
  currentUser?: UserProfile | null;
  onUpdateRequest?: (updatedRequests: ExpenseRequest[], updatedBudgets?: DepartmentBudget[]) => void;
}

export default function DashboardView({ 
  requests, 
  budgets, 
  setActiveTab, 
  onSelectRequest,
  onCreateNewRequest,
  currentUser,
  onUpdateRequest
}: DashboardViewProps) {
  
  const [managerComment, setManagerComment] = useState('');
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [fullImageModal, setFullImageModal] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  // Finance Settlement States
  const [settlementModalRequest, setSettlementModalRequest] = useState<ExpenseRequest | null>(null);
  const [settlementPreviewUrl, setSettlementPreviewUrl] = useState<string | null>(null);
  const [settlementDate, setSettlementDate] = useState('');
  const [settlementProofUrl, setSettlementProofUrl] = useState('');
  const [settlementProofName, setSettlementProofName] = useState('');
  const [payrollPeriodInput, setPayrollPeriodInput] = useState('');

  // Interactive Drill-Down States
  const [drillDownType, setDrillDownType] = useState<string | null>(null);
  const [drillDownSearch, setDrillDownSearch] = useState('');
  const [drillDownStatusFilter, setDrillDownStatusFilter] = useState('');
  const [drillDownCategoryFilter, setDrillDownCategoryFilter] = useState('');
  const [drillDownSortField, setDrillDownSortField] = useState('date');
  const [drillDownSortOrder, setDrillDownSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingRequest, setEditingRequest] = useState<ExpenseRequest | null>(null);

  // States for Editing Form
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // PDF Report/Print Layout state
  const [printPreviewMode, setPrintPreviewMode] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Handle Esc key for modals
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (printPreviewMode) setPrintPreviewMode(false);
        else if (fullImageModal) setFullImageModal(null);
        else if (settlementModalRequest) setSettlementModalRequest(null);
        else if (editingRequest) setEditingRequest(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [printPreviewMode, fullImageModal, settlementModalRequest, editingRequest]);

  // 1. DETERMINE ROLE ENFORCEMENT
  const getRoleLevel = (): 'Employee' | 'Manager' | 'Finance' | 'Executive' | 'Administrator' => {
    if (!currentUser) return 'Employee';
    const level = currentUser.approval_level;
    if (level === 'Administrator') return 'Administrator';
    if (level === 'Level 4' || level === 'Finance') return 'Finance';
    if (level === 'Level 3' || level === 'Level 2') return 'Manager';
    if (level === 'Executive') return 'Executive';
    return 'Employee';
  };

  const role = getRoleLevel();

  // -----------------------------------------
  // ACTION HANDLERS (Real updates writing to DB)
  // -----------------------------------------
  
  const handleManagerAction = (request: ExpenseRequest, action: 'approve' | 'reject') => {
    if (!onUpdateRequest || !currentUser) return;

    const updatedRequests = requests.map(req => {
      if (req.id === request.id) {
        const history = [...req.approvalHistory];
        
        // Update current step
        const currentStepIndex = history.findIndex(h => h.status === 'pending');
        if (currentStepIndex !== -1) {
          history[currentStepIndex] = {
            ...history[currentStepIndex],
            status: action === 'approve' ? 'approved' : 'rejected',
            date: new Date().toISOString().split('T')[0],
            comment: managerComment || (action === 'approve' ? 'อนุมัติผ่านเกณฑ์' : 'ไม่อนุมัติ - ข้อมูลไม่ถูกต้อง')
          };
        }

        let newStatus: ExpenseRequest['status'] = req.status;
        let nextApproverId: string | null = null;

        if (action === 'reject') {
          newStatus = 'rejected';
        } else {
          // If approved, check if there's a next level approver configured
          // For simplicity in simulation:
          if (req.next_approver) {
            nextApproverId = null; // cleared
            newStatus = 'approved';
          } else {
            newStatus = 'approved';
          }
        }

        // Record a comment
        const updatedComments = [...(req.comments || [])];
        updatedComments.push({
          id: `comment-${Date.now()}`,
          author: currentUser.name,
          date: new Date().toISOString().split('T')[0],
          text: `[พิจารณาสถานะ: ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}] ${managerComment || '-'}`
        });

        return {
          ...req,
          status: newStatus,
          approvalHistory: history,
          comments: updatedComments
        };
      }
      return req;
    });

    onUpdateRequest(updatedRequests);
    setManagerComment('');
    setActiveQueueId(null);
  };

  const handleFinancePayment = (request: ExpenseRequest) => {
    setSettlementModalRequest(request);
    setSettlementDate(new Date().toISOString().split('T')[0]);
    setSettlementProofUrl(request.company_reimbursement_proof_url || '');
    setSettlementProofName(request.company_reimbursement_proof_name || '');
    setPayrollPeriodInput(request.payroll_period || new Date().toISOString().slice(0, 7));
  };

  const submitSettlement = (request: ExpenseRequest) => {
    if (!onUpdateRequest || !currentUser) return;

    const opName = currentUser.name;
    const opRole = currentUser.role;

    const updatedRequests = requests.map(req => {
      if (req.id === request.id) {
        let updateFields: Partial<ExpenseRequest> = {
          status: 'cleared' as const
        };

        const dateStr = settlementDate || new Date().toISOString().split('T')[0];
        const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        const historyItem = {
          version: `v${(req.version || 1) + 1}`,
          date: dateStr,
          time: timeStr,
          author: opName,
          notes: '',
          action: '',
          before: req.amount,
          after: req.amount
        };

        if (req.expense_type === 'advance') {
          updateFields.advance_paid_date = dateStr;
          updateFields.advance_paid_by = opName;
          
          historyItem.action = `บันทึกวันจ่ายเงินทดรองล่วงหน้า: ${dateStr}`;
          historyItem.notes = `ผู้ดำเนินการฝ่ายการเงิน: ${opName}`;
          
          addEnterpriseAuditLog(
            currentUser.user_id,
            opName,
            opRole,
            'FINANCE_PAYOUT',
            `ฝ่ายการเงิน ${opName} จ่ายเงินทดรองล่วงหน้า ฿${req.amount.toLocaleString()} (ใบคำขอ ${req.id}) วันที่จ่าย: ${dateStr}`
          );
        } else if (req.expense_type === 'clearing') {
          updateFields.clearing_submitted_date = req.clearing_submitted_date || req.date; // ensure clearing submission date exists
          
          if (req.settlement_type === 'reimbursement') {
            updateFields.company_reimbursed_date = dateStr;
            updateFields.company_reimbursed_by = opName;
            updateFields.company_reimbursement_proof_url = settlementProofUrl;
            updateFields.company_reimbursement_proof_name = settlementProofName;
            
            historyItem.action = `จ่ายเงินชดเชยเพิ่มเติมสำเร็จ: ฿${(req.settlement_amount || 0).toLocaleString()} แนบหลักฐาน ${settlementProofName || 'สลิปโอนเงิน'}`;
            historyItem.notes = `วันที่จ่าย: ${dateStr} โดย: ${opName}`;

            addEnterpriseAuditLog(
              currentUser.user_id,
              opName,
              opRole,
              'FINANCE_REIMBURSEMENT',
              `ฝ่ายการเงิน ${opName} จ่ายชดเชยเพิ่มเติม ฿${(req.settlement_amount || 0).toLocaleString()} (ใบคำขอเคลียร์ ${req.id}) วันที่จ่าย: ${dateStr}`
            );
          } else if (req.settlement_type === 'payroll_deduction') {
            updateFields.payroll_period = payrollPeriodInput;
            updateFields.payroll_deduction_date = dateStr;
            updateFields.payroll_deducted_by = opName;
            
            historyItem.action = `บันทึกการหักเงินเดือน รอบบัญชี ${payrollPeriodInput} สำเร็จ`;
            historyItem.notes = `วันที่หักเงินเดือน: ${dateStr} โดย: ${opName}`;

            addEnterpriseAuditLog(
              currentUser.user_id,
              opName,
              opRole,
              'FINANCE_PAYROLL_DEDUCTION',
              `ฝ่ายการเงิน ${opName} บันทึกหักเงินเดือนพนักงาน รอบบัญชี ${payrollPeriodInput} ยอดหัก: ฿${(req.settlement_amount || 0).toLocaleString()} (ใบคำขอเคลียร์ ${req.id}) วันที่ทำรายการ: ${dateStr}`
            );
          } else if (req.settlement_type === 'refund') {
            updateFields.refund_confirmed_date = dateStr;
            updateFields.refund_confirmed_by = opName;
            
            historyItem.action = `ฝ่ายการเงินยืนยันการรับเงินคืนจำนวน ฿${(req.settlement_amount || 0).toLocaleString()} เรียบร้อย`;
            historyItem.notes = `ตรวจรับยอดเงินเมื่อวันที่: ${dateStr} โดย: ${opName}`;

            addEnterpriseAuditLog(
              currentUser.user_id,
              opName,
              opRole,
              'FINANCE_REFUND_CONFIRMED',
              `ฝ่ายการเงิน ${opName} กดยืนยันได้รับยอดโอนเงินคืน ฿${(req.settlement_amount || 0).toLocaleString()} (ใบคำขอเคลียร์ ${req.id}) ยืนยันเมื่อ: ${dateStr}`
            );
          } else {
            // perfect match
            historyItem.action = `ฝ่ายการเงินปิดยอดดุลเคลียร์เรียบร้อย`;
            historyItem.notes = `วันที่ทำรายการ: ${dateStr} โดย: ${opName}`;

            addEnterpriseAuditLog(
              currentUser.user_id,
              opName,
              opRole,
              'FINANCE_CLEAR_PERFECT',
              `ฝ่ายการเงิน ${opName} ปิดดุลสมุดรายวันยอดเคลียร์พอดี (ใบคำขอเคลียร์ ${req.id}) วันที่: ${dateStr}`
            );
          }
        } else {
          // Normal reimbursement payout
          updateFields.company_reimbursed_date = dateStr;
          updateFields.company_reimbursed_by = opName;
          updateFields.company_reimbursement_proof_url = settlementProofUrl;
          updateFields.company_reimbursement_proof_name = settlementProofName;
          
          historyItem.action = `จ่ายเงินชดเชยสำเร็จ: ฿${req.amount.toLocaleString()} แนบหลักฐาน ${settlementProofName || 'สลิปโอนเงิน'}`;
          historyItem.notes = `วันที่จ่าย: ${dateStr} โดย: ${opName}`;

          addEnterpriseAuditLog(
            currentUser.user_id,
            opName,
            opRole,
            'FINANCE_REIMBURSEMENT',
            `ฝ่ายการเงิน ${opName} จ่ายชดเชยพนักงาน ฿${req.amount.toLocaleString()} (ใบคำขอเบิกชดเชย ${req.id}) วันที่จ่าย: ${dateStr}`
          );
        }

        const existingRevisions = req.revisions || [];
        const updatedRevisions = [...existingRevisions, historyItem];

        const systemComment = {
          id: `comment-sys-${Date.now()}`,
          author: 'ระบบฝ่ายการเงินองค์กร',
          date: `${dateStr} ${timeStr}`,
          text: `[บันทึกทางการเงิน] ดำเนินการโดย: ${opName} - ${historyItem.action}`
        };

        return {
          ...req,
          ...updateFields,
          version: (req.version || 1) + 1,
          revisions: updatedRevisions,
          comments: [...(req.comments || []), systemComment]
        } as ExpenseRequest;
      }
      return req;
    });

    const updatedBudgets = budgets.map(b => {
      if (b.department === request.department) {
        return {
          ...b,
          spent: b.spent + request.amount,
          pending: Math.max(0, b.pending - request.amount)
        };
      }
      return b;
    });

    onUpdateRequest(updatedRequests, updatedBudgets);
    setSettlementModalRequest(null);
  };

  // =========================================================================
  // INTERACTIVE DRILL-DOWN HELPERS
  // =========================================================================
  
  const getDrillDownTitle = () => {
    switch (drillDownType) {
      case 'spent': return 'ยอดเงินอนุมัติของฉัน';
      case 'pending': return 'คำขอที่อยู่ระหว่างพิจารณาของฉัน';
      case 'rejected': return 'คำขอที่ถูกปฏิเสธ / ต้องแก้ไข';
      case 'allowance': return 'วงเงินส่วนบุคคลรายเดือน';
      case 'team_bills': return 'ยอดขอเบิกสะสมในทีมทั้งหมด';
      case 'team_pending': return 'รายการค้างรอฉันพิจารณาอนุมัติ';
      case 'team_budget': return 'รายการใช้จ่ายงบประมาณแผนก';
      case 'uncleared_advances': return 'เงินทดรองจ่ายค้างเคลียร์';
      case 'finance_pending': return 'รายการสั่งจ่ายเงินชดเชย / ล้างเงินคลัง';
      case 'finance_clearing': return 'รายการใบสะสางสัญญายืมเงิน (Clearing)';
      case 'finance_petty': return 'บันทึกสมุดเงินสดย่อยองค์กรคงเหลือ';
      case 'exec_budget': return 'งบประมาณรวมทั้งองค์กร';
      case 'exec_spent': return 'รายการที่เบิกจ่ายสำเร็จจริงทั้งองค์กร';
      case 'exec_pending': return 'รายการงบประมาณที่ค้างการอนุมัติรวม';
      case 'exec_violations': return 'รายการใบคำขอเบิกสุ่มเสี่ยง / ผิดกฎนโยบาย';
      case 'admin_users': return 'ตารางข้อมูลบัญชีพนักงานองค์กร';
      case 'admin_telemetry': return 'รายงานโครงข่ายและ telemetry ซอฟต์แวร์';
      case 'admin_workflows': return 'กฎสายงานการอนุมัติองค์กร (Workflows)';
      case 'admin_logs': return 'ตารางประวัติกิจกรรมความมั่นคงความปลอดภัย (Audit Logs)';
      default: return 'รายละเอียดข้อมูล';
    }
  };

  const getDrillDownData = () => {
    switch (drillDownType) {
      // EMPLOYEE
      case 'spent':
        return requests.filter(r => (r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id) && (r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'cleared' || r.status?.toLowerCase() === 'paid'));
      case 'pending':
        return requests.filter(r => (r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id) && r.status?.toLowerCase() === 'pending');
      case 'rejected':
        return requests.filter(r => (r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id) && r.status?.toLowerCase() === 'rejected');
      case 'allowance':
        return requests.filter(r => (r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id) && (r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'cleared' || r.status?.toLowerCase() === 'paid'));

      // MANAGER
      case 'team_bills':
        return requests.filter(r => r.department === currentUser?.department);
      case 'team_pending':
        return requests.filter(r => r.status?.toLowerCase() === 'pending' && r.department === currentUser?.department);
      case 'team_budget':
        return requests.filter(r => r.department === currentUser?.department && (r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'cleared' || r.status?.toLowerCase() === 'paid'));
      case 'uncleared_advances':
        return requests.filter(req => 
          req.expense_type === 'advance' && 
          (req.status?.toLowerCase() === 'cleared' || req.status?.toLowerCase() === 'paid' || req.status === 'approved') && 
          !requests.some(c => (c.expense_type === 'clearing' || c.type === 'Clearing') && c.advance_id === req.id && c.status?.toLowerCase() !== 'rejected') &&
          (role === 'Manager' ? req.department === currentUser?.department : true)
        );

      // FINANCE
      case 'finance_pending':
        return requests.filter(r => r.status?.toLowerCase() === 'approved' || r.status === 'pending_refund');
      case 'finance_clearing':
        return requests.filter(r => r.type === 'Clearing' || r.expense_type === 'clearing');
      case 'finance_petty':
        return requests.filter(r => r.status?.toLowerCase() === 'cleared' || r.status?.toLowerCase() === 'paid');

      // EXECUTIVE
      case 'exec_budget':
        return requests;
      case 'exec_spent':
        return requests.filter(r => r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'cleared' || r.status?.toLowerCase() === 'paid');
      case 'exec_pending':
        return requests.filter(r => r.status?.toLowerCase() === 'pending');
      case 'exec_violations':
        return requests.filter(r => r.policyStatus === 'warning' || r.policyStatus === 'violation');

      // ADMIN
      case 'admin_users':
        return getDbUsers();
      case 'admin_telemetry':
        return [
          { id: 'NODE-1', name: 'Asia-Southeast Gateway Core', status: 'Active', load: '14%', latency: '8ms', ip: '10.140.0.4' },
          { id: 'DB-MAIN', name: 'PostgreSQL Enterprise Cluster', status: 'Synced', load: '22%', latency: '3ms', ip: '10.140.12.9' },
          { id: 'FILE-OCR', name: 'Google Vision OCR Engine API', status: 'Online', load: '5%', latency: '124ms', ip: 'Google API Ingress' },
          { id: 'AUTH-SEC', name: 'Firebase SSO Identity Provider', status: 'Active', load: '2%', latency: '15ms', ip: 'Firebase Auth API' },
        ];
      case 'admin_workflows':
        return JSON.parse(localStorage.getItem('okey_db_rules') || '[]');
      case 'admin_logs':
        return JSON.parse(localStorage.getItem('okey_db_logs') || '[]');
      default:
        return [];
    }
  };

  const getFilteredAndSortedDrillDownData = () => {
    const rawData = getDrillDownData();
    
    const filtered = rawData.filter(item => {
      const searchLower = (drillDownSearch || '').toLowerCase();
      if (searchLower) {
        if (drillDownType === 'admin_users') {
          const nameMatch = (item.name || '').toLowerCase().includes(searchLower);
          const deptMatch = (item.department || '').toLowerCase().includes(searchLower);
          const posMatch = (item.position || '').toLowerCase().includes(searchLower);
          const idMatch = (item.user_id || '').toLowerCase().includes(searchLower);
          if (!nameMatch && !deptMatch && !posMatch && !idMatch) return false;
        } else if (drillDownType === 'admin_logs') {
          const userMatch = (item.action_by || '').toLowerCase().includes(searchLower);
          const detailMatch = (item.details || '').toLowerCase().includes(searchLower);
          const commentMatch = (item.comment || '').toLowerCase().includes(searchLower);
          if (!userMatch && !detailMatch && !commentMatch) return false;
        } else if (drillDownType === 'admin_workflows') {
          const reqMatch = (item.requester_user_id || '').toLowerCase().includes(searchLower);
          const appMatch = (item.approver_user_id || '').toLowerCase().includes(searchLower);
          const idMatch = (item.rule_id || '').toLowerCase().includes(searchLower);
          if (!reqMatch && !appMatch && !idMatch) return false;
        } else if (drillDownType === 'admin_telemetry') {
          const nameMatch = (item.name || '').toLowerCase().includes(searchLower);
          const statusMatch = (item.status || '').toLowerCase().includes(searchLower);
          const ipMatch = (item.ip || '').toLowerCase().includes(searchLower);
          if (!nameMatch && !statusMatch && !ipMatch) return false;
        } else {
          const titleMatch = (item.title || '').toLowerCase().includes(searchLower);
          const empMatch = (item.employeeName || '').toLowerCase().includes(searchLower);
          const idMatch = String(item.id || '').toLowerCase().includes(searchLower);
          const catMatch = (item.category || '').toLowerCase().includes(searchLower);
          const deptMatch = (item.department || '').toLowerCase().includes(searchLower);
          if (!titleMatch && !empMatch && !idMatch && !catMatch && !deptMatch) return false;
        }
      }

      if (drillDownStatusFilter) {
        if (drillDownType === 'admin_users') {
          const isActiveStr = item.is_active ? 'active' : 'inactive';
          if (isActiveStr !== drillDownStatusFilter) return false;
        } else if (drillDownType === 'admin_telemetry') {
          if ((item.status || '').toLowerCase() !== (drillDownStatusFilter || '').toLowerCase()) return false;
        } else if (drillDownType !== 'admin_logs' && drillDownType !== 'admin_workflows') {
          if ((item.status || '').toLowerCase() !== (drillDownStatusFilter || '').toLowerCase()) return false;
        }
      }

      if (drillDownCategoryFilter) {
        if (drillDownType !== 'admin_users' && drillDownType !== 'admin_logs' && drillDownType !== 'admin_workflows' && drillDownType !== 'admin_telemetry') {
          if (item.category !== drillDownCategoryFilter) return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      let valA: any = a[drillDownSortField];
      let valB: any = b[drillDownSortField];

      if (drillDownSortField === 'amount') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      } else if (drillDownSortField === 'date') {
        valA = a.date || a.timestamp || '';
        valB = b.date || b.timestamp || '';
      } else if (drillDownSortField === 'title') {
        valA = a.title || a.name || '';
        valB = b.title || b.name || '';
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return drillDownSortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return drillDownSortOrder === 'asc'
          ? (valA > valB ? 1 : -1)
          : (valB > valA ? 1 : -1);
      }
    });
  };

  const handleDeleteDrillDownItem = (id: string) => {
    if (!onUpdateRequest) return;
    const reqToDelete = requests.find(r => r.id === id);
    if (!reqToDelete) return;

    if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรายการ ${id}?`)) {
      const updatedRequests = requests.filter(r => r.id !== id);
      
      let updatedBudgets = [...budgets];
      if (reqToDelete.status === 'pending') {
        updatedBudgets = budgets.map(b => {
          if (b.department === reqToDelete.department) {
            return { ...b, pending: Math.max(0, b.pending - reqToDelete.amount) };
          }
          return b;
        });
      } else if (reqToDelete.status === 'approved' || reqToDelete.status === 'cleared') {
        updatedBudgets = budgets.map(b => {
          if (b.department === reqToDelete.department) {
            return { ...b, spent: Math.max(0, b.spent - reqToDelete.amount) };
          }
          return b;
        });
      }

      onUpdateRequest(updatedRequests, updatedBudgets);
      addEnterpriseAuditLog(
        currentUser?.user_id || 'user-unknown',
        currentUser?.name || 'ผู้ใช้ระบบ',
        currentUser?.approval_level || 'Staff',
        'Delete',
        `ลบเอกสารเลขที่ ${id} (${reqToDelete.title}) โดยผู้ใช้`
      );
    }
  };

  const handleEditDrillDownItem = (item: ExpenseRequest) => {
    setEditingRequest(item);
    setEditTitle(item.title);
    setEditAmount(item.amount);
    setEditCategory(item.category);
    setEditDescription(item.description || '');
  };

  const handleSaveDrillDownItem = () => {
    if (!onUpdateRequest || !editingRequest) return;
    
    const oldAmount = editingRequest.amount;
    const amountDiff = editAmount - oldAmount;
    
    const updatedRequests = requests.map(r => {
      if (r.id === editingRequest.id) {
        return {
          ...r,
          title: editTitle,
          amount: editAmount,
          category: editCategory,
          description: editDescription
        };
      }
      return r;
    });

    let updatedBudgets = [...budgets];
    if (amountDiff !== 0) {
      if (editingRequest.status === 'pending') {
        updatedBudgets = budgets.map(b => {
          if (b.department === editingRequest.department) {
            return { ...b, pending: Math.max(0, b.pending + amountDiff) };
          }
          return b;
        });
      } else if (editingRequest.status === 'approved' || editingRequest.status === 'cleared') {
        updatedBudgets = budgets.map(b => {
          if (b.department === editingRequest.department) {
            return { ...b, spent: Math.max(0, b.spent + amountDiff) };
          }
          return b;
        });
      }
    }

    onUpdateRequest(updatedRequests, updatedBudgets);
    addEnterpriseAuditLog(
      currentUser?.user_id || 'user-unknown',
      currentUser?.name || 'ผู้ใช้ระบบ',
      currentUser?.approval_level || 'Staff',
      'Edit',
      `แก้ไขรายละเอียดเอกสารเลขที่ ${editingRequest.id} (${editTitle}) ยอดปรับปรุงจาก ฿${oldAmount.toLocaleString()} เป็น ฿${editAmount.toLocaleString()}`
    );
    setEditingRequest(null);
  };

  const exportToExcel = async (dataToExport: any[]) => {
    if (isExportingExcel) return;
    setIsExportingExcel(true);

    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `O-Key_Drilldown_Report_${drillDownType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    let titleText = '';

    if (drillDownType === 'admin_users') {
      titleText = 'รายงานบัญชีรายชื่อผู้ใช้งานและพนักงานในระบบ (Users & Staff Directory)';
      headers = ["User ID", "ชื่อ-นามสกุล", "แผนก/ฝ่าย", "ตำแหน่งงาน", "ระดับสิทธิ์ (Role)", "สถานะ", "ระดับพิจารณาอนุมัติ"];
      rows = dataToExport.map(u => [
        u.user_id,
        u.name,
        u.department,
        u.position,
        u.role || '',
        u.is_active ? 'Active' : 'Disabled',
        u.approval_level || ''
      ]);
    } else if (drillDownType === 'admin_logs') {
      titleText = 'รายงานบันทึกประวัติกิจกรรมและการดำเนินการในระบบ (ERP System Audit Log Trail)';
      headers = ["วันที่และเวลา (Timestamp)", "ผู้กระทำกิจกรรม", "กิจกรรม (Action)", "รายละเอียดเพิ่มเติม"];
      rows = dataToExport.map(l => [
        l.timestamp,
        l.action_by,
        l.action,
        l.comment || l.details || ''
      ]);
    } else if (drillDownType === 'admin_workflows') {
      titleText = 'รายงานโครงสร้างลำดับสายงานและกฎการพิจารณาอนุมัติ (Enterprise Workflow Rules)';
      headers = ["รหัสกฎ (Rule ID)", "ผู้ขอเบิกเงิน", "ผู้อนุมัติเอกสาร", "ลำดับขั้นตอน (Workflow Level)"];
      rows = dataToExport.map(r => [
        r.rule_id,
        r.requester_user_id,
        r.approver_user_id,
        r.level
      ]);
    } else if (drillDownType === 'admin_telemetry') {
      titleText = 'รายงานสถิติสถานะเซิร์ฟเวอร์และการเชื่อมต่อระบบ (Server Ingress Telemetry)';
      headers = ["Node ID", "ชื่อเซิร์ฟเวอร์", "สถานะระบบ", "อัตราโหลด CPU (%)", "เวลาตอบสนอง (Latency - ms)", "IP Address"];
      rows = dataToExport.map(n => [
        n.id,
        n.name,
        n.status,
        n.load,
        n.latency,
        n.ip
      ]);
    } else {
      titleText = `รายงานสรุปรายละเอียดการเงินและรายการเบิกเงินทดรองจ่าย (${drillDownType?.toUpperCase() || 'DATA'})`;
      headers = ["เลขที่เอกสาร (ID)", "หัวข้อรายการเบิก", "พนักงานขอเบิก", "วันที่ทำรายการ", "แผนก/ฝ่าย", "หมวดหมู่สินค้า", "ประเภทเงินเบิก", "จำนวนเงิน (Amount)", "สถานะใบเสร็จ", "สถานะนโยบายควบคุม"];
      rows = dataToExport.map(r => [
        r.id,
        r.title,
        r.employeeName,
        r.date,
        r.department,
        r.category,
        r.expense_type || r.type || '',
        r.amount,
        r.status,
        r.policyStatus
      ]);
    }

    try {
      const { exportDrillDownToExcel } = await import('../utils/excelExport');
      await exportDrillDownToExcel(titleText, headers, rows, currentUser?.name || 'พนักงาน ERP', filename);
    } catch (err) {
      console.error('Failed to export to Google Sheets style Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadDashboardPdf = async () => {
    if (isPdfGenerating) return;
    setPdfError(null);
    setIsPdfGenerating(true);

    let restoreStyles: (() => void) | null = null;
    try {
      const dataList = getFilteredAndSortedDrillDownData();
      if (!dataList || dataList.length === 0) {
        throw new Error('ไม่พบข้อมูลจริงในระบบสำหรับดาวน์โหลดเอกสาร (ฐานข้อมูลว่างหรือตัวกรองไม่ตรงรายการ)');
      }

      // Check role permission
      const roleLevel = getRoleLevel();
      const adminTypes = ['admin_users', 'admin_logs', 'admin_workflows', 'admin_telemetry'];
      if (adminTypes.includes(drillDownType || '')) {
        if (roleLevel !== 'Administrator' && roleLevel !== 'Executive') {
          throw new Error('ขออภัย! สิทธิ์การเข้าถึงของคุณไม่เพียงพอในการเข้าถึงหรือดาวน์โหลดรายงานข้อมูลระบบส่วนนี้ (เฉพาะผู้ดูแลระบบและผู้บริหารระดับสูงเท่านั้น)');
        }
      }

      const element = document.getElementById('report-printable-content');
      if (!element) throw new Error('ไม่พบข้อมูลสำหรับสร้าง PDF');

      // Pre-load all images to prevent incomplete rendering
      const images = Array.from(element.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if error
          });
        })
      );

      // Sanitize main document styles to bypass oklch parsing error in html2canvas
      const sanitizeMainDocumentStyles = () => {
        const backups: { type: 'style' | 'link'; element: HTMLElement; originalValue: string | boolean; tempStyleEl?: HTMLStyleElement }[] = [];
        
        const oklchToRgb = (l: number, c: number, h: number, a: number = 1) => {
          const hRad = (h * Math.PI) / 180;
          const oklab_a = c * Math.cos(hRad);
          const oklab_b = c * Math.sin(hRad);

          const l_ = l + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
          const m_ = l - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
          const s_ = l - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

          const lms_l = l_ * l_ * l_;
          const lms_m = m_ * m_ * m_;
          const lms_s = s_ * s_ * s_;

          const r_l = +4.0767416621 * lms_l - 3.3077115913 * lms_m + 0.2309699292 * lms_s;
          const g_l = -1.2684380046 * lms_l + 2.6097574011 * lms_m - 0.3413193965 * lms_s;
          const b_l = -0.0041960863 * lms_l - 0.7034186147 * lms_m + 1.7076147010 * lms_s;

          const f = (x: number) => {
            return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
          };

          const r = Math.max(0, Math.min(255, Math.round(f(r_l) * 255)));
          const g = Math.max(0, Math.min(255, Math.round(f(g_l) * 255)));
          const b = Math.max(0, Math.min(255, Math.round(f(b_l) * 255)));

          return `rgba(${r}, ${g}, ${b}, ${a})`;
        };

        const parseAndConvertOklch = (colorStr: string): string => {
          if (!colorStr || !colorStr.includes('oklch')) return colorStr;
          const match = colorStr.match(/oklch\(([^)]+)\)/i);
          if (!match) return colorStr;

          const content = match[1].trim();
          let lStr = '0';
          let cStr = '0';
          let hStr = '0';
          let aStr = '1';

          if (content.includes('/')) {
            const slashParts = content.split('/');
            if (slashParts.length === 2) {
              const mainColorParts = slashParts[0].trim().split(/[\s,]+/);
              lStr = mainColorParts[0] || '0';
              cStr = mainColorParts[1] || '0';
              hStr = mainColorParts[2] || '0';
              aStr = slashParts[1].trim();
            }
          } else {
            const parts = content.split(/[\s,]+/);
            lStr = parts[0] || '0';
            cStr = parts[1] || '0';
            hStr = parts[2] || '0';
          }

          let l = parseFloat(lStr);
          if (lStr.includes('%')) {
            l = parseFloat(lStr) / 100;
          }
          let c = parseFloat(cStr);
          let h = parseFloat(hStr);
          if (isNaN(h)) h = 0;

          let a = parseFloat(aStr);
          if (aStr.includes('%')) {
            a = parseFloat(aStr) / 100;
          }
          if (isNaN(a)) a = 1;

          if (isNaN(l)) l = 0;
          if (isNaN(c)) c = 0;

          return oklchToRgb(l, c, h, a);
        };

        const findOklchSubstring = (str: string): string | null => {
          const index = str.indexOf('oklch(');
          if (index === -1) return null;
          let openBrackets = 1;
          let j = index + 6;
          while (j < str.length && openBrackets > 0) {
            if (str[j] === '(') openBrackets++;
            else if (str[j] === ')') openBrackets--;
            j++;
          }
          if (openBrackets === 0) {
            return str.substring(index, j);
          }
          return null;
        };

        const cleanCss = (cssText: string): string => {
          let resolved = cssText;
          while (resolved.includes('oklch')) {
            const nextOklch = findOklchSubstring(resolved);
            if (!nextOklch) break;
            const converted = parseAndConvertOklch(nextOklch);
            resolved = resolved.replace(nextOklch, converted);
          }

          // Replace color-mix(in srgb, ...)
          const colorMixRegex = /color-mix\(\s*in\s+srgb\s*,\s*([^,]+)\s*,\s*([^)]+)\)/gi;
          resolved = resolved.replace(colorMixRegex, (match, p1) => {
            const c1 = p1.trim().split(/\s+/)[0];
            return c1 !== 'transparent' ? c1 : 'rgba(120, 120, 120, 0.5)';
          });

          return resolved;
        };

        // 1. Process inline <style> elements
        const styleElements = Array.from(document.querySelectorAll('style'));
        styleElements.forEach(styleEl => {
          try {
            const originalText = styleEl.textContent || '';
            if (originalText.includes('oklch') || originalText.includes('color-mix')) {
              backups.push({ type: 'style', element: styleEl, originalValue: originalText });
              styleEl.textContent = cleanCss(originalText);
            }
          } catch (e) {
            console.error('Error handling style element:', e);
          }
        });

        // 2. Process <link rel="stylesheet"> elements
        const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
        linkElements.forEach(linkEl => {
          try {
            const sheet = linkEl.sheet;
            if (!sheet) return;
            
            if (!linkEl.href || linkEl.href.startsWith(window.location.origin)) {
              let combinedCss = '';
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  for (let i = 0; i < rules.length; i++) {
                    combinedCss += rules[i].cssText + '\n';
                  }
                }
              } catch (err) {
                // Ignore
              }

              if (combinedCss) {
                const sanitizedCss = cleanCss(combinedCss);
                const tempStyle = document.createElement('style');
                tempStyle.textContent = sanitizedCss;
                document.head.appendChild(tempStyle);

                backups.push({
                  type: 'link',
                  element: linkEl,
                  originalValue: linkEl.disabled,
                  tempStyleEl: tempStyle
                });

                linkEl.disabled = true;
              }
            }
          } catch (e) {
            console.error('Error handling link element:', e);
          }
        });

        const restore = () => {
          backups.forEach(backup => {
            if (backup.type === 'style') {
              backup.element.textContent = backup.originalValue as string;
            } else if (backup.type === 'link') {
              (backup.element as HTMLLinkElement).disabled = backup.originalValue as boolean;
              if (backup.tempStyleEl && backup.tempStyleEl.parentNode) {
                backup.tempStyleEl.parentNode.removeChild(backup.tempStyleEl);
              }
            }
          });
        };

        return restore;
      };

      restoreStyles = sanitizeMainDocumentStyles();

      const opt = {
        margin:       0.5,
        filename:     `okey_report_${drillDownType}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          onclone: (clonedDoc: Document) => {
            const oklchToRgb = (l: number, c: number, h: number, a: number = 1): string => {
              const hRad = (h * Math.PI) / 180;
              const oklab_a = c * Math.cos(hRad);
              const oklab_b = c * Math.sin(hRad);

              const l_ = l + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
              const m_ = l - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
              const s_ = l - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;

              const lms_l = l_ * l_ * l_;
              const lms_m = m_ * m_ * m_;
              const lms_s = s_ * s_ * s_;

              const r_l = +4.0767416621 * lms_l - 3.3077115913 * lms_m + 0.2309699292 * lms_s;
              const g_l = -1.2684380046 * lms_l + 2.6097574011 * lms_m - 0.3413193965 * lms_s;
              const b_l = -0.0041960863 * lms_l - 0.7034186147 * lms_m + 1.7076147010 * lms_s;

              const f = (x: number) => {
                return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
              };

              const r = Math.max(0, Math.min(255, Math.round(f(r_l) * 255)));
              const g = Math.max(0, Math.min(255, Math.round(f(g_l) * 255)));
              const b = Math.max(0, Math.min(255, Math.round(f(b_l) * 255)));

              return `rgba(${r}, ${g}, ${b}, ${a})`;
            };

            const parseAndConvertOklch = (colorStr: string): string => {
              if (!colorStr || !colorStr.includes('oklch')) return colorStr;
              const match = colorStr.match(/oklch\(([^)]+)\)/i);
              if (!match) return colorStr;

              const content = match[1].trim();
              let lStr = '0';
              let cStr = '0';
              let hStr = '0';
              let aStr = '1';

              if (content.includes('/')) {
                const slashParts = content.split('/');
                if (slashParts.length === 2) {
                  const mainColorParts = slashParts[0].trim().split(/[\s,]+/);
                  lStr = mainColorParts[0] || '0';
                  cStr = mainColorParts[1] || '0';
                  hStr = mainColorParts[2] || '0';
                  aStr = slashParts[1].trim();
                }
              } else {
                const parts = content.split(/[\s,]+/);
                lStr = parts[0] || '0';
                cStr = parts[1] || '0';
                hStr = parts[2] || '0';
              }

              let l = parseFloat(lStr);
              if (lStr.includes('%')) {
                l = parseFloat(lStr) / 100;
              }
              let c = parseFloat(cStr);
              let h = parseFloat(hStr);
              if (isNaN(h)) h = 0;

              let a = parseFloat(aStr);
              if (aStr.includes('%')) {
                a = parseFloat(aStr) / 100;
              }
              if (isNaN(a)) a = 1;

              if (isNaN(l)) l = 0;
              if (isNaN(c)) c = 0;

              return oklchToRgb(l, c, h, a);
            };

            const findOklchSubstring = (str: string): string | null => {
              const index = str.indexOf('oklch(');
              if (index === -1) return null;
              let openBrackets = 1;
              let j = index + 6;
              while (j < str.length && openBrackets > 0) {
                if (str[j] === '(') openBrackets++;
                else if (str[j] === ')') openBrackets--;
                j++;
              }
              if (openBrackets === 0) {
                return str.substring(index, j);
              }
              return null;
            };

            const convertColor = (colorStr: string): string => {
              if (!colorStr || (!colorStr.includes('oklch') && !colorStr.includes('color-mix'))) return colorStr;
              try {
                let resolved = colorStr;
                while (resolved.includes('oklch')) {
                  const nextOklch = findOklchSubstring(resolved);
                  if (!nextOklch) break;
                  const converted = parseAndConvertOklch(nextOklch);
                  resolved = resolved.replace(nextOklch, converted);
                }

                if (resolved.includes('color-mix')) {
                  const colorRegex = /(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)/gi;
                  const srgbIndex = resolved.indexOf('in srgb,');
                  if (srgbIndex !== -1) {
                    const searchPart = resolved.substring(srgbIndex + 8);
                    const matches = searchPart.match(colorRegex);
                    if (matches && matches.length > 0) {
                      const firstColor = matches[0];
                      if (firstColor !== 'transparent') {
                        return firstColor;
                      }
                    }
                  }
                  return 'rgba(120, 120, 120, 0.5)';
                }

                return resolved;
              } catch (e) {
                return colorStr;
              }
            };

            const replaceColorFunctions = (cssText: string): string => {
              let result = cssText;
              const keywords = ['oklch', 'color-mix'];
              for (const keyword of keywords) {
                let index = 0;
                while ((index = result.indexOf(keyword + '(', index)) !== -1) {
                  let openBrackets = 1;
                  let j = index + keyword.length + 1;
                  while (j < result.length && openBrackets > 0) {
                    if (result[j] === '(') openBrackets++;
                    else if (result[j] === ')') openBrackets--;
                    j++;
                  }
                  if (openBrackets === 0) {
                    const fullMatch = result.substring(index, j);
                    const resolvedColor = convertColor(fullMatch);
                    result = result.substring(0, index) + resolvedColor + result.substring(j);
                    index += resolvedColor.length;
                  } else {
                    index += keyword.length + 1;
                  }
                }
              }
              return result;
            };

            // Sanitize all inline styles on elements in the cloned document
            const sanitizeElement = (el: HTMLElement) => {
              const style = clonedDoc.defaultView?.getComputedStyle(el);
              if (!style) return;
              
              if (style.color && (style.color.includes('oklch') || style.color.includes('color-mix'))) {
                el.style.setProperty('color', convertColor(style.color), 'important');
              }
              if (style.backgroundColor && (style.backgroundColor.includes('oklch') || style.backgroundColor.includes('color-mix'))) {
                el.style.setProperty('background-color', convertColor(style.backgroundColor), 'important');
              }
              if (style.borderColor && (style.borderColor.includes('oklch') || style.borderColor.includes('color-mix'))) {
                el.style.setProperty('border-color', convertColor(style.borderColor), 'important');
              }
              if (style.borderTopColor && (style.borderTopColor.includes('oklch') || style.borderTopColor.includes('color-mix'))) {
                el.style.setProperty('border-top-color', convertColor(style.borderTopColor), 'important');
              }
            };

            // Process cloned document elements
            sanitizeElement(clonedDoc.body);
            const elements = clonedDoc.querySelectorAll('*');
            for (let i = 0; i < elements.length; i++) {
              sanitizeElement(elements[i] as HTMLElement);
            }

            // Sanitize all stylesheets in the cloned document
            try {
              const newStyleEl = clonedDoc.createElement('style');
              let combinedCss = '';

              for (let i = 0; i < clonedDoc.styleSheets.length; i++) {
                const sheet = clonedDoc.styleSheets[i];
                try {
                  if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                    continue;
                  }
                  
                  const rules = sheet.cssRules || sheet.rules;
                  if (!rules) continue;

                  for (let j = 0; j < rules.length; j++) {
                    combinedCss += rules[j].cssText + '\n';
                  }
                } catch (e) {
                  // Ignore stylesheet access errors
                }
              }

              if (combinedCss) {
                newStyleEl.innerHTML = replaceColorFunctions(combinedCss);
                
                // Disable existing local stylesheets
                for (let i = clonedDoc.styleSheets.length - 1; i >= 0; i--) {
                  const sheet = clonedDoc.styleSheets[i];
                  if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
                    sheet.disabled = true;
                    if (sheet.ownerNode && sheet.ownerNode.parentNode) {
                      sheet.ownerNode.parentNode.removeChild(sheet.ownerNode);
                    }
                  }
                }
                
                clonedDoc.head.appendChild(newStyleEl);
              }
            } catch (err) {
              console.error('Error sanitizing cloned document styles:', err);
            }
          }
        },
        jsPDF:        { unit: 'in' as const, format: 'a4' as const, orientation: 'landscape' as const }
      };

      try {
        // @ts-ignore
        const html2pdfModule = await import('html2pdf.js');
        const html2pdfFunc = (html2pdfModule.default || html2pdfModule) as any;
        await html2pdfFunc().set(opt).from(element).save();
      } finally {
        if (restoreStyles) {
          restoreStyles();
        }
      }
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      setPdfError(error.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handlePrintDashboard = () => {
    if (isPdfGenerating) return;
    setPdfError(null);
    setIsPdfGenerating(true);

    try {
      const dataList = getFilteredAndSortedDrillDownData();
      if (!dataList || dataList.length === 0) {
        throw new Error('ไม่พบข้อมูลจริงในระบบสำหรับสั่งพิมพ์ (ฐานข้อมูลว่างหรือตัวกรองไม่ตรงรายการ)');
      }

      // Check permission
      const roleLevel = getRoleLevel();
      const adminTypes = ['admin_users', 'admin_logs', 'admin_workflows', 'admin_telemetry'];
      if (adminTypes.includes(drillDownType || '')) {
        if (roleLevel !== 'Administrator' && roleLevel !== 'Executive') {
          throw new Error('ขออภัย! สิทธิ์การเข้าถึงของคุณไม่เพียงพอในการสั่งพิมพ์รายงานข้อมูลระบบส่วนนี้ (เฉพาะผู้ดูแลระบบและผู้บริหารระดับสูงเท่านั้น)');
        }
      }

      const element = document.getElementById('report-printable-content');
      if (!element) throw new Error('ไม่พบเนื้อหารายงานสำหรับจัดเตรียมหน้าพิมพ์เอกสาร');

      const printWindow: any = {
      document: {
        open: () => { printWindow._html = ''; },
        write: (html: string) => { printWindow._html = (printWindow._html || '') + html; },
        close: () => { openPdfPreview(printWindow._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
      if (!printWindow) {
        throw new Error('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป! กรุณาอนุญาตให้แสดงป๊อปอัปสำหรับหน้าเว็บ O-KEY ERP เพื่อทำการพิมพ์เอกสาร');
      }

      const contentHtml = element.innerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>OKEY_ERP_REPORT_${new Date().toISOString().split('T')[0]}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&family=Inter:wght@400;500;600;700&display=swap');
              body {
                font-family: 'Sarabun', 'Inter', sans-serif;
                margin: 0;
                padding: 40px;
                color: #0f172a;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print-container {
                max-width: 1100px;
                margin: 0 auto;
              }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
              th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
              th { background-color: #f8fafc; font-weight: 700; font-size: 10px; color: #475569; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: 700; }
              .font-black { font-weight: 900; }
              .uppercase { text-transform: uppercase; }
              .font-mono { font-family: monospace; }
              .page-break-avoid { page-break-inside: avoid; }
              @media print {
                @page {
                  size: A4 landscape;
                  margin: 15mm;
                }
                body {
                  padding: 0;
                  margin: 0;
                }
                button, .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${contentHtml}
            </div>
            <script>
              window.addEventListener('load', () => {
                setTimeout(() => {
                  window.print();
                }, 1000);
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error: any) {
      console.error('Print Dashboard Error:', error);
      setPdfError(error.message || 'เกิดข้อผิดพลาดในการเปิดระบบพิมพ์เอกสาร');
      
      if (error.message && error.message.includes('บล็อกหน้าต่างป๊อปอัป')) {
        alert('⚠️ ระบบเบราว์เซอร์บล็อกหน้าต่างป๊อปอัป (Pop-up Blocked)\n\nกรุณาอนุญาตป๊อปอัปสำหรับหน้าเว็บนี้:\n1. สังเกตไอคอนล็อกหรือไอคอนป๊อปอัปที่แถบที่อยู่เว็บ (Address bar) ทางด้านบนขวา\n2. คลิกไอคอนและเลือก "อนุญาตป๊อปอัปและสคริปต์จากเว็บไซต์นี้เสมอ" (Always allow pop-ups from this site)\n3. กดตกลง แล้วลองกดปุ่มพิมพ์ใหม่อีกครั้งเพื่อแสดงหน้าพิมพ์เอกสาร');
      }
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // =========================================================================
  // RENDER INTERACTIVE DRILL-DOWN CONTAINER
  // =========================================================================
  if (drillDownType) {
    const dataList = getFilteredAndSortedDrillDownData();
    const hasData = dataList.length > 0;
    const isStandardRequests = drillDownType !== 'admin_users' && drillDownType !== 'admin_logs' && drillDownType !== 'admin_workflows' && drillDownType !== 'admin_telemetry';
    
    return (
      <div className="space-y-6" id="drilldown-workspace-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <button 
              onClick={() => {
                setDrillDownType(null);
                setDrillDownSearch('');
                setDrillDownStatusFilter('');
                setDrillDownCategoryFilter('');
              }}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all mb-2"
            >
              <ArrowLeft size={14} />
              <span>กลับสู่แผงควบคุมหลัก (O-KEY Control Center)</span>
            </button>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {getDrillDownTitle()}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              กำลังแสดงข้อมูลเรียลไทม์จากฐานข้อมูลระบบบัญชีและการเบิกจ่าย O-KEY
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {hasData && (
              <>
                <button
                  onClick={() => exportToExcel(dataList)}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs font-bold transition-all"
                >
                  <FileSpreadsheet size={14} />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => setPrintPreviewMode(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-900/50 rounded-xl text-xs font-bold transition-all"
                >
                  <Printer size={14} />
                  <span>พิมพ์ / Export PDF</span>
                </button>
              </>
            )}
            {isStandardRequests && (
              <button
                onClick={onCreateNewRequest}
                className="flex items-center gap-2 px-3.5 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle size={14} />
                <span>สร้างรายการใหม่</span>
              </button>
            )}
          </div>
        </div>

        {/* Search, Filter, Sort Controls bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา (ID, ชื่อพนักงาน, เรื่อง, แผนก)..."
              value={drillDownSearch}
              onChange={e => setDrillDownSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            {/* Status Filter */}
            {drillDownType !== 'admin_logs' && drillDownType !== 'admin_workflows' && (
              <select
                value={drillDownStatusFilter}
                onChange={e => setDrillDownStatusFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">กรองสถานะ (ทั้งหมด)</option>
                {drillDownType === 'admin_users' ? (
                  <>
                    <option value="active">Active (ใช้งานปกติ)</option>
                    <option value="inactive">Inactive (ระงับชั่วคราว)</option>
                  </>
                ) : drillDownType === 'admin_telemetry' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="synced">Synced</option>
                    <option value="online">Online</option>
                  </>
                ) : (
                  <>
                    <option value="draft">Draft (ฉบับร่าง)</option>
                    <option value="pending">Pending (รอพิจารณา)</option>
                    <option value="approved">Approved (อนุมัติแล้ว)</option>
                    <option value="rejected">Rejected (ปฏิเสธ)</option>
                    <option value="cleared">Cleared (เคลียร์บัญชีแล้ว)</option>
                    <option value="cancelled">Cancelled (ยกเลิก)</option>
                  </>
                )}
              </select>
            )}

            {/* Category Filter */}
            {isStandardRequests && (
              <select
                value={drillDownCategoryFilter}
                onChange={e => setDrillDownCategoryFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">กรองหมวดหมู่ (ทั้งหมด)</option>
                {Object.keys(CATEGORIES_CONFIG).map(key => (
                  <option key={key} value={key}>{CATEGORIES_CONFIG[key].name}</option>
                ))}
              </select>
            )}

            {/* Sort SortField selector */}
            <select
              value={drillDownSortField}
              onChange={e => setDrillDownSortField(e.target.value)}
              className="text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="date">เรียงตาม วันที่ / ลำดับเวลา</option>
              <option value="title">เรียงตาม หัวข้อ / ชื่อ</option>
              {drillDownType !== 'admin_logs' && drillDownType !== 'admin_workflows' && drillDownType !== 'admin_telemetry' && (
                <option value="amount">เรียงตาม จำนวนเงิน</option>
              )}
            </select>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setDrillDownSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
              title="สลับลำดับการจัดเรียง"
            >
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>

        {/* Grid Layout or Empty State */}
        {!hasData ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <div className="h-14 w-14 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">ยังไม่มีข้อมูล</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                ไม่พบประวัติการทำรายการหรือเอกสารที่ตรงตามเงื่อนไขการค้นหานี้ในฐานข้อมูลองค์กร
              </p>
            </div>
            {isStandardRequests && (
              <button
                onClick={onCreateNewRequest}
                className="px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                สร้างรายการใหม่
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  {drillDownType === 'admin_users' ? (
                    <tr>
                      <th className="p-4">User ID</th>
                      <th className="p-4">ชื่อพนักงาน</th>
                      <th className="p-4">แผนก</th>
                      <th className="p-4">ตำแหน่ง</th>
                      <th className="p-4">ลำดับอนุมัติ</th>
                      <th className="p-4">สถานะการใช้งาน</th>
                    </tr>
                  ) : drillDownType === 'admin_workflows' ? (
                    <tr>
                      <th className="p-4">Rule ID</th>
                      <th className="p-4">รหัสพนักงานผู้ขอเบิก</th>
                      <th className="p-4">รหัสพนักงานผู้อนุมัติร่วม</th>
                      <th className="p-4">ระดับลำดับขั้นตอน</th>
                    </tr>
                  ) : drillDownType === 'admin_logs' ? (
                    <tr>
                      <th className="p-4">เวลาทำรายการ</th>
                      <th className="p-4">ประเภทเหตุการณ์</th>
                      <th className="p-4">ผู้ปฏิบัติงาน</th>
                      <th className="p-4">รายละเอียดเหตุการณ์</th>
                    </tr>
                  ) : drillDownType === 'admin_telemetry' ? (
                    <tr>
                      <th className="p-4">ID โหนด</th>
                      <th className="p-4">ชื่อเซิร์ฟเวอร์ย่อย / API</th>
                      <th className="p-4">IP Address</th>
                      <th className="p-4">ค่าเฉลี่ย Latency</th>
                      <th className="p-4">ปริมาณเวิร์กโหลด</th>
                      <th className="p-4">สถานะระบบ</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="p-4">เลขที่ใบสำคัญ</th>
                      <th className="p-4">รายละเอียดรายการเบิก</th>
                      <th className="p-4">ผู้ส่งคำขอเบิก</th>
                      <th className="p-4">วันที่ส่งเรื่อง</th>
                      <th className="p-4">หมวดหมู่</th>
                      <th className="p-4">ประเภท</th>
                      <th className="p-4 text-right">จำนวนยอดเบิก</th>
                      <th className="p-4">สถานะ</th>
                      <th className="p-4 text-center">ความถูกต้อง</th>
                      <th className="p-4 text-center">จัดการรายการ</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dataList.map((item, idx) => {
                    if (drillDownType === 'admin_users') {
                      return (
                        <tr key={item.user_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all font-mono">
                          <td className="p-4 font-bold text-primary-600 dark:text-primary-400">{item.user_id}</td>
                          <td className="p-4 font-sans font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                          <td className="p-4 font-sans text-slate-600 dark:text-slate-400">{item.department}</td>
                          <td className="p-4 font-sans text-slate-500">{item.position}</td>
                          <td className="p-4 font-sans"><span className="px-2 py-0.5 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded text-[9px] font-bold">{item.approval_level || 'Staff'}</span></td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {item.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (drillDownType === 'admin_workflows') {
                      return (
                        <tr key={item.rule_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all font-mono">
                          <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{item.rule_id}</td>
                          <td className="p-4 text-primary-600 dark:text-primary-400">{item.requester_user_id}</td>
                          <td className="p-4 text-amber-600 dark:text-amber-400">{item.approver_user_id}</td>
                          <td className="p-4 font-black">Level {item.level}</td>
                        </tr>
                      );
                    }

                    if (drillDownType === 'admin_logs') {
                      return (
                        <tr key={item.log_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all font-mono">
                          <td className="p-4 text-slate-400">{item.timestamp}</td>
                          <td className="p-4"><span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-900/10 rounded font-bold text-[9px]">{item.action_type || item.event || 'System'}</span></td>
                          <td className="p-4 font-sans font-bold text-slate-800 dark:text-slate-200">{item.action_by || item.user_name}</td>
                          <td className="p-4 font-sans text-slate-600 dark:text-slate-400 max-w-sm truncate">{item.details || item.comment}</td>
                        </tr>
                      );
                    }

                    if (drillDownType === 'admin_telemetry') {
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all font-mono">
                          <td className="p-4 font-bold text-primary-600 dark:text-primary-400">{item.id}</td>
                          <td className="p-4 font-sans font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                          <td className="p-4 text-slate-500">{item.ip}</td>
                          <td className="p-4 text-slate-600">{item.latency}</td>
                          <td className="p-4 text-slate-600">{item.load}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    // Standard ExpenseRequests
                    const config = CATEGORIES_CONFIG[item.category] || CATEGORIES_CONFIG.other;
                    const statusInfo = getClearingStatusInfo(item);
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                        <td className="p-4 font-mono font-black text-slate-800 dark:text-slate-200">{item.id}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">{item.title}</td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{item.employeeName}</div>
                          <div className="text-[9px] text-slate-400">{item.department}</div>
                        </td>
                        <td className="p-4 text-slate-500 font-mono">{item.date}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${config.color}`}>
                            {config.name}
                          </span>
                        </td>
                        <td className="p-4 font-semibold uppercase text-slate-500 font-mono text-[10px]">
                          {item.expense_type || item.type || 'Reimbursement'}
                        </td>
                        <td className="p-4 text-right font-mono font-extrabold text-slate-900 dark:text-white text-xs">
                          ฿{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            item.policyStatus === 'compliant' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10' :
                            item.policyStatus === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/10' :
                            'bg-rose-50 text-rose-700 dark:bg-rose-900/10'
                          }`}>
                            {item.policyStatus === 'compliant' ? '✓ ผ่านเกณฑ์' :
                             item.policyStatus === 'warning' ? '⚠ มีประเด็น' : '✘ ผิดเงื่อนไข'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => onSelectRequest(item)}
                              className="p-1 text-slate-500 hover:text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-all"
                              title="เปิดดูรายละเอียด"
                            >
                              <Eye size={13} />
                            </button>
                            
                            <button
                              onClick={() => handleEditDrillDownItem(item)}
                              className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-all"
                              title="แก้ไขข้อมูลรายการ"
                            >
                              <Edit size={13} />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteDrillDownItem(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                              title="ลบรายการ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Request Modal */}
        {editingRequest && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 max-w-md w-full p-6 space-y-4 animate-scale-up">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">✏️ แก้ไขข้อมูลเอกสารสำคัญ ({editingRequest.id})</h3>
                <button onClick={() => setEditingRequest(null)} className="text-rose-500 hover:text-white hover:bg-rose-500 dark:text-rose-400 dark:hover:text-white p-1.5 rounded-xl transition-all duration-150 bg-rose-50 dark:bg-rose-950/20 shadow-sm font-bold cursor-pointer h-8 w-8 flex items-center justify-center" title="ปิด"><X size={16} /></button>
              </div>
              
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">หัวข้อรายการ</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">จำนวนยอดเงินเบิก (฿)</label>
                  <input 
                    type="number" 
                    value={editAmount}
                    onChange={e => setEditAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">หมวดหมู่ค่าใช้จ่าย</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.keys(CATEGORIES_CONFIG).map(k => (
                      <option key={k} value={k}>{CATEGORIES_CONFIG[k].name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">คำอธิบายประกอบเพิ่มเติม</label>
                  <textarea 
                    rows={3}
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
                <button 
                  onClick={() => setEditingRequest(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSaveDrillDownItem}
                  className="px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg text-xs font-extrabold transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  บันทึกความเปลี่ยนแปลง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF / Print Report Preview Modal */}
        {printPreviewMode && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in print:p-0 print:bg-white">
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full relative animate-scale-up my-auto font-sans print:p-0 print:shadow-none print:my-0 print:rounded-none overflow-hidden">
              
              {/* Modal Top Actions - Hidden during print */}
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/20">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight">รายงานใบสำคัญสั่งเบิกและประวัติการเงิน</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Certified PDF Report Preview • พร้อมพิมพ์ทันที</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {pdfError && (
                      <div className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-200 flex items-center gap-1.5 max-w-[200px] truncate" title={pdfError}>
                        <AlertTriangle size={12} />
                        <span className="truncate">{pdfError}</span>
                      </div>
                    )}
                    <button 
                      onClick={handleDownloadDashboardPdf}
                      disabled={isPdfGenerating}
                      className={`flex-1 sm:flex-none px-5 py-2.5 ${isPdfGenerating ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md shadow-blue-500/20'} rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2`}
                    >
                      {isPdfGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>{isPdfGenerating ? 'กำลังสร้าง PDF...' : pdfError ? 'ลองใหม่ (Retry)' : 'ดาวน์โหลด PDF'}</span>
                    </button>
                    <button 
                      onClick={handlePrintDashboard}
                      disabled={isPdfGenerating}
                      className={`flex-1 sm:flex-none px-5 py-2.5 ${isPdfGenerating ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/20'} rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2`}
                    >
                      <Printer size={14} />
                      <span>สั่งพิมพ์ (Print)</span>
                    </button>
                    <button 
                      onClick={() => setPrintPreviewMode(false)}
                      disabled={isPdfGenerating}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
                      title="ปิดหน้าต่าง (Esc)"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Printable Content */}
              <div id="report-printable-content" className="p-8 sm:p-12 space-y-8 print:p-0 print:m-0 bg-white">
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6">
                  <div className="flex gap-4 items-start">
                    <div className="h-14 w-14 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                      <Wallet size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase leading-none mb-1">
                        O-KEY EXPENSE MANAGEMENT CO., LTD.
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium max-w-md leading-relaxed">
                        อาคารสิงห์คอมเพล็กซ์, ถ.อโศกมนตรี, เขตห้วยขวาง, กรุงเทพฯ 10310 <br />
                        Tax ID: 0105562145874 • Email: finance@okay-expense.com
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-widest mb-3">
                      OFFICIAL REPORT
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">REPORT DATE: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</p>
                    <p className="text-[10px] text-slate-400 font-mono">OPERATOR: {currentUser?.name?.toUpperCase() || 'SYSTEM ADMIN'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">{getDrillDownTitle()}</h1>
                    <p className="text-xs text-slate-500">สรุปรายการเบิกจ่ายสะสมและรายละเอียดใบสำคัญทางการเงิน</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right border-r border-slate-200 pr-4">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Items</span>
                      <span className="text-lg font-black text-slate-900">{dataList.length}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Grand Total</span>
                      <span className="text-lg font-black text-primary-600">
                        {isStandardRequests
                          ? `฿${dataList.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-2xl print:border-slate-900 print:rounded-none">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-slate-900">
                      <tr className="font-bold text-slate-700">
                        <th className="p-3">รหัสเอกสาร</th>
                        <th className="p-3">หัวข้อคำขอ</th>
                        <th className="p-3">ผู้เบิกจ่าย</th>
                        <th className="p-3">วันที่</th>
                        <th className="p-3">แผนก</th>
                        <th className="p-3 text-right">ยอดเงิน (บาท)</th>
                        <th className="p-3 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-900">
                      {dataList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors page-break-avoid">
                          <td className="p-3 font-mono font-bold text-slate-900">{item.id || item.user_id || item.rule_id || idx + 1}</td>
                          <td className="p-3 font-medium">
                            <p className="text-slate-900">{item.title || item.name || item.details || item.comment || '-'}</p>
                            <p className="text-[8px] text-slate-400 line-clamp-1">{item.description || '-'}</p>
                          </td>
                          <td className="p-3">{item.employeeName || item.action_by || item.requester_user_id || '-'}</td>
                          <td className="p-3 font-mono">{item.date || item.timestamp || '-'}</td>
                          <td className="p-3">{item.category || item.department || item.position || '-'}</td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {item.amount !== undefined ? `฿${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="p-3 text-center uppercase font-black text-[8px]">
                            {item.status || item.action || (item.is_active ? 'Active' : 'Inactive') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Print Signatures */}
                <div className="grid grid-cols-3 gap-8 pt-12 pb-6">
                  <div className="text-center space-y-8">
                    <p className="border-b border-dotted border-slate-400 pb-1 mx-4"></p>
                    <div>
                      <p className="text-[10px] font-bold text-slate-900">ผู้จัดทำรายงาน (Reporter)</p>
                      <p className="text-[9px] text-slate-400 mt-1">({currentUser?.name || '..................................'})</p>
                    </div>
                  </div>
                  <div className="text-center space-y-8">
                    <p className="border-b border-dotted border-slate-400 pb-1 mx-4"></p>
                    <div>
                      <p className="text-[10px] font-bold text-slate-900">ผู้ตรวจสอบบัญชี (Auditor)</p>
                      <p className="text-[9px] text-slate-400 mt-1">(..................................)</p>
                    </div>
                  </div>
                  <div className="text-center space-y-8">
                    <div className="flex flex-col items-center">
                      <p className="text-emerald-600 font-black italic text-[10px] h-4 leading-none">✓ SYSTEM CERTIFIED</p>
                      <p className="border-b border-dotted border-slate-400 w-full pb-1 mx-4"></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-900">ผู้อนุมัติรายงาน (Authorized)</p>
                      <p className="text-[9px] text-slate-400 mt-1">Electronic Approval Signature</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-medium">
                  <p>© 2026 OKAY EXPENSE MANAGEMENT SYSTEM - CONFIDENTIAL</p>
                  <p>REPORT ID: {btoa(drillDownType || '').substring(0, 8).toUpperCase()}-{Date.now()}</p>
                </div>
                
                {/* Append Receipts and Evidence for All requests in dataList */}
                {dataList.some((item: any) => 
                  item.receipt_url || item.slip_url || item.refund_slip || (item.attachment_list && item.attachment_list.length > 0)
                ) && (
                  <div className="pt-10 mt-10 border-t-2 border-dashed border-slate-300 page-break-before">
                    <h3 className="text-base font-black text-slate-900 mb-6 uppercase tracking-widest text-center">หลักฐานประกอบใบสั่งจ่ายและเคลียร์เงินสะสม (Evidence & Attachments)</h3>
                    <div className="space-y-8">
                      {dataList.map((item: any, idx: number) => {
                        const attachments: string[] = [];
                        if (item.receipt_url) attachments.push(item.receipt_url);
                        if (item.slip_url) attachments.push(item.slip_url);
                        if (item.refund_slip) attachments.push(item.refund_slip);
                        if (item.attachment_list) {
                          item.attachment_list.forEach((a: any) => { if(a.url) attachments.push(a.url); });
                        }
                        
                        if (attachments.length === 0) return null;
                        
                        return (
                          <div key={idx} className="space-y-3 page-break-avoid border border-slate-150 rounded-xl p-4 bg-slate-50">
                            <p className="text-xs font-bold text-slate-800">
                              เอกสารอ้างอิง: {item.id || idx+1} - {item.title || item.name || 'ไม่มีชื่อคำขอ'} ({item.employeeName || item.action_by || 'ไม่ระบุผู้ส่งเรื่อง'})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {attachments.map((imgUrl, imgIdx) => {
                                const isPdf = imgUrl.toLowerCase().endsWith('.pdf') || imgUrl.includes('/pdf');
                                return (
                                  <div key={imgIdx} className="border border-slate-200 rounded-lg p-2 bg-white text-center">
                                    {isPdf ? (
                                      <div className="h-40 flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded">
                                        <FileText size={40} className="text-blue-500 mb-2" />
                                        <span className="text-[9px] font-bold text-slate-700">เอกสารแนบ PDF</span>
                                        <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="text-[8px] text-blue-600 underline mt-1 truncate max-w-full px-2">เปิดดูไฟล์แนบจริง</a>
                                      </div>
                                    ) : (
                                      <img 
                                        src={imgUrl} 
                                        className="max-h-40 max-w-full object-contain mx-auto rounded border border-slate-100" 
                                        alt={`Evidence ${imgIdx+1} for ${item.id || idx+1}`} 
                                        referrerPolicy="no-referrer"
                                        crossOrigin="anonymous"
                                      />
                                    )}
                                    <p className="text-[9px] text-slate-500 mt-2 font-mono">Attachment {imgIdx+1}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" id="dashboard-container">
      
      {/* 1. Header with Role Indication */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <span className="px-2.5 py-1 text-[10px] font-bold bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 rounded-full border border-primary-100 dark:border-primary-800 uppercase tracking-wider">
            {role === 'Employee' && 'Staff / พนักงานระดับปฏิบัติการ'}
            {role === 'Manager' && 'Approver / ผู้อนุมัติสายงานพนักงาน'}
            {role === 'Finance' && 'Finance / ผู้จัดการฝ่ายการเงินและสมุดบัญชี'}
            {role === 'Executive' && 'Executive / คณะกรรมการผู้บริหารระดับสูง'}
            {role === 'Administrator' && 'Administrator / แอดมินควบคุมความปลอดภัยหลัก'}
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            แผงควบคุมความปลอดภัยอัจฉริยะ (O-KEY Control Center)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ยินดีต้อนรับ, <strong className="text-slate-800 dark:text-slate-200">คุณ{currentUser?.name || 'พนักงานองค์กร'}</strong> แผนก {currentUser?.department || '-'} ({currentUser?.position || '-'})
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <button 
              id="dash-export-backup-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              <span>Export ERP Master Backup</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2 space-y-1">
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      try {
                        const bRequests = getDbRequests();
                        const bUsers = getDbUsers();
                        const bDepts = getDbDepartments();
                        const bLogs = getDbEnterpriseAuditLogs();
                        const bJournals = getDbJournalEntries();
                        const { exportCompleteERPBackupToExcel } = await import('../utils/excelExport');
                        await exportCompleteERPBackupToExcel({
                          requests: bRequests,
                          users: bUsers,
                          departments: bDepts,
                          auditLogs: bLogs,
                          journalEntries: bJournals,
                          budgets: budgets
                        }, currentUser?.name || 'พนักงานองค์กร');
                        
                        addEnterpriseAuditLog(
                          currentUser?.name || 'พนักงานองค์กร',
                          'Download',
                          'DASH-EXPORT-EXCEL',
                          `Export Comprehensive Consolidated ERP Backup to Excel`
                        );
                      } catch (err) {
                        console.error('Error exporting backup:', err);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span>Excel (.xlsx)</span>
                  </button>
                   <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      try {
                        const bRequests = getDbRequests();
                        const bUsers = getDbUsers();
                        const bDepts = getDbDepartments();
                        const bLogs = getDbEnterpriseAuditLogs();
                        const bJournals = getDbJournalEntries();
                        const { exportCompleteERPBackupToCSV } = await import('../utils/backupExports');
                        await exportCompleteERPBackupToCSV({
                          requests: bRequests,
                          users: bUsers,
                          departments: bDepts,
                          auditLogs: bLogs,
                          journalEntries: bJournals,
                          budgets: budgets
                        }, currentUser?.name || 'พนักงานองค์กร');
                        addEnterpriseAuditLog(currentUser?.name || 'พนักงานองค์กร', 'Download', 'DASH-EXPORT-CSV', `Export Backup to CSV`);
                      } catch (err) { console.error(err); }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>CSV (.csv)</span>
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      try {
                        const bRequests = getDbRequests();
                        const bUsers = getDbUsers();
                        const bDepts = getDbDepartments();
                        const bLogs = getDbEnterpriseAuditLogs();
                        const bJournals = getDbJournalEntries();
                        const { exportCompleteERPBackupToPDF } = await import('../utils/backupExports');
                        await exportCompleteERPBackupToPDF({
                          requests: bRequests,
                          users: bUsers,
                          departments: bDepts,
                          auditLogs: bLogs,
                          journalEntries: bJournals,
                          budgets: budgets
                        }, currentUser?.name || 'พนักงานองค์กร');
                        addEnterpriseAuditLog(currentUser?.name || 'พนักงานองค์กร', 'Download', 'DASH-EXPORT-PDF', `Export Backup to PDF`);
                      } catch (err) { console.error(err); }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span>PDF Report (.pdf)</span>
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      try {
                        const bRequests = getDbRequests();
                        const bUsers = getDbUsers();
                        const bDepts = getDbDepartments();
                        const bLogs = getDbEnterpriseAuditLogs();
                        const bJournals = getDbJournalEntries();
                        const { exportCompleteERPBackupToJSON } = await import('../utils/backupExports');
                        await exportCompleteERPBackupToJSON({
                          requests: bRequests,
                          users: bUsers,
                          departments: bDepts,
                          auditLogs: bLogs,
                          journalEntries: bJournals,
                          budgets: budgets
                        }, currentUser?.name || 'พนักงานองค์กร');
                        addEnterpriseAuditLog(currentUser?.name || 'พนักงานองค์กร', 'Download', 'DASH-EXPORT-JSON', `Export Backup to JSON`);
                      } catch (err) { console.error(err); }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Database className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>JSON Backup (.json)</span>
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      try {
                        const bRequests = getDbRequests();
                        const bUsers = getDbUsers();
                        const bDepts = getDbDepartments();
                        const bLogs = getDbEnterpriseAuditLogs();
                        const bJournals = getDbJournalEntries();
                        const { exportCompleteERPBackupToZIP } = await import('../utils/backupExports');
                        await exportCompleteERPBackupToZIP({
                          requests: bRequests,
                          users: bUsers,
                          departments: bDepts,
                          auditLogs: bLogs,
                          journalEntries: bJournals,
                          budgets: budgets
                        }, currentUser?.name || 'พนักงานองค์กร');
                        addEnterpriseAuditLog(currentUser?.name || 'พนักงานองค์กร', 'Download', 'DASH-EXPORT-ZIP', `Export Backup to ZIP`);
                      } catch (err) { console.error(err); }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>ZIP Full System Backup (.zip)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button 
            id="dash-create-btn"
            onClick={onCreateNewRequest}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4 text-black stroke-[3]" />
            <span>เบิกค่าใช้จ่ายใหม่</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROLE VIEW 1: EMPLOYEE DASHBOARD (Own data only, Available Petty Cash, Timeline)
          ========================================================================= */}
      {role === 'Employee' && (
        <div className="space-y-6" id="employee-dashboard">
          
          {/* Own KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Wallet: Spent */}
            {(() => {
              const ownReqs = requests.filter(r => r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id);
              const ownApproved = ownReqs.filter(r => r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'cleared');
              const spentAmount = ownApproved.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('spent')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ยอดเงินอนุมัติของฉัน</span>
                    <span className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl"><Wallet size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{spentAmount.toLocaleString()}</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">จากรายการใบเบิกชดเชยที่เคลียร์แล้ว</span>
                </div>
              );
            })()}

            {/* Pending Requests */}
            {(() => {
              const ownReqs = requests.filter(r => r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id);
              const ownPending = ownReqs.filter(r => r.status?.toLowerCase() === 'pending');
              const pendingAmount = ownPending.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('pending')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">อยู่ระหว่างพิจารณา</span>
                    <span className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl"><Clock size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{pendingAmount.toLocaleString()}</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">จำนวน {ownPending.length} รายการรอบิลอนุมัติ</span>
                </div>
              );
            })()}

            {/* Rejected Requests */}
            {(() => {
              const ownReqs = requests.filter(r => r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id);
              const ownRejected = ownReqs.filter(r => r.status?.toLowerCase() === 'rejected');
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('rejected')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">คำขอที่ถูกปฏิเสธ/ต้องแก้</span>
                    <span className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl"><AlertTriangle size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{ownRejected.length} รายการ</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">กรุณากดเข้าไปแก้ไขหรือแนบใบเสร็จใหม่</span>
                </div>
              );
            })()}

            {/* Petty Cash Personal Allowance */}
            {(() => {
              const ownReqs = requests.filter(r => r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id);
              const ownApproved = ownReqs.filter(r => r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'cleared');
              const spentThisMonth = ownApproved.reduce((sum, r) => sum + r.amount, 0);
              const allowance = 25000;
              const remaining = Math.max(0, allowance - spentThisMonth);
              const percent = Math.min(100, Math.round((spentThisMonth / allowance) * 100));
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('allowance')}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วงเงินย่อยส่วนบุคคลคงเหลือ</span>
                    <span className="p-2 bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400 rounded-xl"><DollarSign size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{remaining.toLocaleString()}</h3>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full" style={{ width: `${percent}%` }}></div>
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1">ใช้ไปแล้ว {percent}% ของสิทธิ์วงเงินรายเดือน ฿{allowance.toLocaleString()}</span>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Own Requests History List */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">ประวัติเอกสารบิลขอเบิกจ่ายของฉัน (Own Data Only)</h3>
                  <p className="text-[10px] text-slate-400">ระบบรักษาความปลอดภัยจำกัดการแสดงผลเฉพาะข้อมูลส่วนบุคคลของท่าน</p>
                </div>
                <button onClick={() => setActiveTab('my-requests')} className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                  <span>จัดการใบสำคัญทั้งหมด</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(() => {
                  const ownList = requests.filter(r => r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id);
                  if (ownList.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400">
                        <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs">ไม่พบประวัติการส่งใบเบิกในระบบของคุณ</p>
                        <button onClick={onCreateNewRequest} className="text-xs text-primary-500 font-bold hover:underline mt-1">เริ่มทำใบเบิกชิ้นแรก</button>
                      </div>
                    );
                  }
                  return ownList.slice(0, 5).map(req => {
                    const config = CATEGORIES_CONFIG[req.category] || CATEGORIES_CONFIG.other;
                    return (
                      <div 
                        key={req.id} 
                        onClick={() => onSelectRequest(req)}
                        className="py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${config.color}`}>
                            {config.name}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block line-clamp-1">{req.title}</span>
                            <span className="text-[9px] text-slate-400">{req.date} • {req.type || 'Reimbursement'}</span>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-4">
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white block">฿{req.amount.toLocaleString()}</span>
                            {(() => {
                              const statusInfo = getClearingStatusInfo(req);
                              return (
                                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5 border ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              );
                            })()}
                          </div>
                          <ArrowRight size={14} className="text-slate-300" />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Col: Timeline Request Tracking of the latest request */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">สืบย้อนสถานะอนุมัติเรียลไทม์ (Live Tracking Timeline)</h3>
              
              {(() => {
                const ownReqs = requests.filter(r => r.user_id === currentUser?.user_id || r.created_by === currentUser?.user_id);
                if (ownReqs.length === 0) {
                  return (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-500">
                      ไม่มีรายการเอกสารเพื่อสืบย้อนความคืบหน้า
                    </div>
                  );
                }
                const latestReq = ownReqs[0];
                return (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">เอกสารล่าสุด</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{latestReq.title}</span>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span>ยอดเบิก: ฿{latestReq.amount.toLocaleString()}</span>
                        <span>{latestReq.id}</span>
                      </div>
                    </div>

                    <div className="space-y-4 relative pl-4 border-l border-slate-200 dark:border-slate-800">
                      {/* Step 1: Submission */}
                      <div className="relative">
                        <div className="absolute -left-[21px] top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-white block">ส่งใบเบิกสมบูรณ์</span>
                          <span className="text-[9px] text-slate-400 block">{latestReq.date} • เข้าระบบและแนบรูปภาพใบเสร็จจริง</span>
                        </div>
                      </div>

                      {/* Step 2: Policy Validation */}
                      <div className="relative">
                        <div className={`absolute -left-[21px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          latestReq.policyStatus === 'compliant' ? 'bg-emerald-500' :
                          latestReq.policyStatus === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-1">
                            การวิเคราะห์กฎนโยบายองค์กร (OCR Auditing)
                            {latestReq.policyStatus === 'compliant' ? '✓' : '⚠'}
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            {latestReq.policyStatus === 'compliant' && 'ผ่านเกณฑ์ตรวจสอบงบประมาณปกติ'}
                            {latestReq.policyStatus === 'warning' && 'มีประเด็นต้องเฝ้าระวังเรื่องยอดเกินกำหนด'}
                            {latestReq.policyStatus === 'violation' && 'ตรวจพบนโยบายต้องห้ามในการเบิกจ่าย'}
                          </span>
                        </div>
                      </div>

                      {/* Step 3: Approver Step */}
                      <div className="relative">
                        <div className={`absolute -left-[21px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          latestReq.status === 'approved' || latestReq.status === 'cleared' ? 'bg-emerald-500' :
                          latestReq.status === 'rejected' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`} />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-white block">ผู้อนุมัติพิจารณาสายงาน</span>
                          <span className="text-[9px] text-slate-400 block">
                            สถานะ: {latestReq.status === 'approved' || latestReq.status === 'cleared' ? 'อนุมัติเรียบร้อย' :
                                    latestReq.status === 'rejected' ? 'ปฏิเสธใบสำคัญ' : 'รอคิวพิจารณาลงลายมือชื่อ'}
                          </span>
                        </div>
                      </div>

                      {/* Step 4: Finance Settlement */}
                      <div className="relative">
                        <div className={`absolute -left-[21px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          latestReq.status === 'cleared' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`} />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-white block">ฝ่ายการเงินจ่ายเงินชดเชย</span>
                          <span className="text-[9px] text-slate-400 block">
                            {latestReq.status === 'cleared' ? 'ชำระเงินโอนบัญชี และ บันทึกสมุดรายวันเรียบร้อย' : 'รอดำเนินการตัดจ่าย'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          ROLE VIEW 2: MANAGER DASHBOARD (Team pending queue, Approval tools, budget)
          ========================================================================= */}
      {role === 'Manager' && (
        <div className="space-y-6" id="manager-dashboard">
          
          {/* Manager Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Team Bills */}
            {(() => {
              const teamReqs = requests.filter(r => r.department === currentUser?.department);
              const totalSum = teamReqs.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('team_bills')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ยอดขอเบิกสะสมในทีม</span>
                    <span className="p-2 bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400 rounded-xl"><Layers size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{totalSum.toLocaleString()}</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">ทั้งหมด {teamReqs.length} คำขอใน {currentUser?.department}</span>
                </div>
              );
            })()}

            {/* Awaiting My Approval */}
            {(() => {
              const pendingMySign = requests.filter(r => r.status?.toLowerCase() === 'pending' && r.department === currentUser?.department);
              const pendingSum = pendingMySign.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden ring-2 ring-amber-500/50 cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('team_pending')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">รอฉันพิจารณาลงนาม</span>
                    <span className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl"><Clock size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{pendingSum.toLocaleString()}</h3>
                  <span className="text-[10px] text-amber-600 font-extrabold block mt-1">จำนวน {pendingMySign.length} คำขอด่วนรอกลั่นกรอง</span>
                </div>
              );
            })()}

            {/* Department Budget */}
            {(() => {
              const deptBudget = budgets.find(b => b.department === currentUser?.department);
              const allocated = deptBudget?.allocated || 0;
              const spent = deptBudget?.spent || 0;
              const remaining = Math.max(0, allocated - spent);
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('team_budget')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">งบประมาณรายปีที่ได้รับ</span>
                    <span className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl"><Building size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{allocated.toLocaleString()}</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">คงเหลือเบิกได้ ฿{remaining.toLocaleString()}</span>
                </div>
              );
            })()}

                        {/* Uncleared Advances */}
            {(() => {
              const unclearedAdvances = requests.filter(req => 
                req.expense_type === 'advance' && 
                (req.status?.toLowerCase() === 'cleared' || req.status?.toLowerCase() === 'paid' || req.status?.toLowerCase() === 'approved') && 
                !requests.some(c => (c.expense_type === 'clearing' || c.type === 'Clearing') && c.advance_id === req.id && c.status?.toLowerCase() !== 'rejected') &&
                (currentUser?.department ? req.department === currentUser?.department : true)
              );
              return (
                <div 
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-rose-500 transition-all group"
                  onClick={() => setDrillDownType('uncleared_advances')}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">เงินทดรองค้างเคลียร์</span>
                    <span className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform"><AlertTriangle size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{unclearedAdvances.length} รายการ</h3>
                  <span className="text-[10px] text-rose-500 font-extrabold block mt-1">
                    พนักงาน {new Set(unclearedAdvances.map(r => r.employeeName)).size} คน ที่ยังไม่เคลียร์
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Main Action Workspace for Manager */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Pending Queue with quick action panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-4">คิวพิจารณาลงนามใบสำคัญรับเงินพนักงาน (Team Approvals Queue)</h3>
                
                {(() => {
                  const myQueue = requests.filter(r => r.status?.toLowerCase() === 'pending' && r.department === currentUser?.department);
                  if (myQueue.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400">
                        <CheckSquare size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs">ยอดเยี่ยม! ไม่มีงานค้างในคิวพิจารณาอนุมัติของคุณในขณะนี้</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {myQueue.map(req => {
                        const isExpanded = activeQueueId === req.id;
                        return (
                          <div key={req.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/20">
                            
                            {/* Summary Header */}
                            <div 
                              onClick={() => setActiveQueueId(isExpanded ? null : req.id)}
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                  {req.receiptUrl ? (
                                    <img src={req.receiptUrl} alt="Thumbnail" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <FileText size={16} className="text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{req.title}</span>
                                  <span className="text-[10px] text-slate-400">{req.employeeName} • {req.date}</span>
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-4">
                                <div>
                                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">฿{req.amount.toLocaleString()}</span>
                                  <span className={`inline-block text-[9px] font-bold px-2 py-0.2 rounded ${
                                    req.policyStatus === 'compliant' ? 'bg-emerald-50 text-emerald-700' :
                                    req.policyStatus === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {req.policyStatus === 'compliant' ? 'เกณฑ์ปกติ' :
                                     req.policyStatus === 'warning' ? 'เตือนงบเกิน' : 'ผิดกฎนโยบาย'}
                                  </span>
                                </div>
                                <ArrowRight size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>
                            </div>

                            {/* Detailed Action Panel on Expand */}
                            {isExpanded && (
                              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                                
                                {/* 1. Attached Receipts Preview (Multiple Thumbnails support) */}
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 block">เอกสารใบเสร็จแนบ (Attachment Preview)</span>
                                  <div className="flex flex-wrap gap-2">
                                    {/* Real thumbnails (not placeholders, mock, nor text url) */}
                                    {req.attachment_list && req.attachment_list.length > 0 ? (
                                      req.attachment_list.map((att, idx) => (
                                        <div 
                                          key={idx} 
                                          onClick={() => setFullImageModal(att.dataUrl)}
                                          className="h-16 w-16 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden cursor-zoom-in relative group"
                                        >
                                          <img src={att.dataUrl} alt={att.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">ขยายรูป</div>
                                        </div>
                                      ))
                                    ) : req.receiptUrl ? (
                                      <div 
                                        onClick={() => setFullImageModal(req.receiptUrl || null)}
                                        className="h-16 w-16 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden cursor-zoom-in relative group"
                                      >
                                        <img src={req.receiptUrl} alt="Receipt" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">ขยายรูป</div>
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] w-full text-center">
                                        ไม่มีเอกสารรูปภาพแนบสำหรับรายการนี้
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Policy alert notes */}
                                {req.policyNotes && req.policyNotes.length > 0 && (
                                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1">
                                    <span className="font-bold text-[10px] block flex items-center gap-1">⚠ ผลการตรวจสอบนโยบายองค์กร (Policy Audits):</span>
                                    {req.policyNotes.map((note, idx) => (
                                      <p key={idx} className="text-[10px]">{note}</p>
                                    ))}
                                  </div>
                                )}

                                {/* Comment field & buttons */}
                                <div className="space-y-2 pt-2">
                                  <label className="text-[10px] font-bold text-slate-400 block">ระบุความเห็นผู้อนุมัติ (Optional)</label>
                                  <input 
                                    type="text"
                                    placeholder="เช่น ตรวจสอบความถูกต้องและเอกสารใบเสร็จแนบเรียบร้อย อนุมัติผ่านระบบ"
                                    value={managerComment}
                                    onChange={e => setManagerComment(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                </div>

                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleManagerAction(req, 'reject')}
                                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                  >
                                    <X size={14} />
                                    <span>ปฏิเสธการอนุมัติ (Reject)</span>
                                  </button>
                                  <button
                                    onClick={() => handleManagerAction(req, 'approve')}
                                    className="px-4 py-2 bg-green-700 hover:bg-green-600 active:bg-green-800 text-white rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 shadow-md shadow-green-700/20 hover:scale-[1.02] active:scale-[0.98]"
                                  >
                                    <Check size={14} />
                                    <span>เซ็นอนุมัติผ่านระบบ (Approve)</span>
                                  </button>
                                </div>

                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Right: Team statistics & Budgets */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4 h-fit">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">งบประมาณสัดส่วนที่ดูแล (Budget Guardrail)</h3>
              {(() => {
                const deptBudget = budgets.find(b => b.department === currentUser?.department);
                if (!deptBudget) return <p className="text-xs text-slate-400">ไม่พบงบประมาณแผนกของคุณ</p>;
                const percent = Math.round((deptBudget.spent / deptBudget.allocated) * 100);
                return (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{deptBudget.department}</span>
                        <span className="text-slate-500">
                          {percent}% ({Math.round(deptBudget.spent / 1000)}k / {Math.round(deptBudget.allocated / 1000)}k ฿)
                        </span>
                      </div>
                      
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 bg-primary-600"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 rounded-xl text-xs text-primary-700 dark:text-primary-400">
                      <strong>เกณฑ์นโยบายและวงเงิน:</strong> งบประมาณแผนกถูกควบคุมด้วยเกณฑ์ระบบเบิกจ่ายสากล เมื่อเบิกใช้ไปเกิน 90% ระบบจะล็อกคำขอที่ไม่สมบูรณ์อัตโนมัติ
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          ROLE VIEW 3: FINANCE DASHBOARD (Payment clearances, Corporate cash, Entries)
          ========================================================================= */}
      {role === 'Finance' && (
        <div className="space-y-6" id="finance-dashboard">
          
          {/* Finance KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Pending Payments */}
            {(() => {
              const pendingPayouts = requests.filter(r => r.status?.toLowerCase() === 'approved');
              const totalSum = pendingPayouts.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative ring-2 ring-primary-500 cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('finance_pending')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">รอชำระเงินชดเชยโอนจ่าย</span>
                    <span className="p-2 bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400 rounded-xl"><DollarSign size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{totalSum.toLocaleString()}</h3>
                  <span className="text-[10px] text-primary-500 font-extrabold block mt-1">จำนวน {pendingPayouts.length} คำขอที่ผ่านอนุมัติแล้ว</span>
                </div>
              );
            })()}

            {/* Advance Pending Clearings */}
            {(() => {
              const clearings = requests.filter(r => r.type === 'Clearing' || r.expense_type === 'clearing');
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('finance_clearing')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ใบเบิกเงินทดรองที่รอคอยเคลียร์</span>
                    <span className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl"><Layers size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{clearings.length} คำขอ</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">รายการสะสางสัญญายืมเงิน</span>
                </div>
              );
            })()}

            {/* Corporate Petty Cash pool */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('finance_petty')}>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เงินสดย่อยองค์กรคงเหลือ (Company Petty Cash)</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl"><Wallet size={16} /></span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿150,000.00</h3>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">หมุนเวียนสมบูรณ์สำหรับสาขาหลัก</span>
            </div>

                        {/* Uncleared Advances */}
            {(() => {
              const unclearedAdvances = requests.filter(req => 
                req.expense_type === 'advance' && 
                (req.status?.toLowerCase() === 'cleared' || req.status?.toLowerCase() === 'paid' || req.status?.toLowerCase() === 'approved') && 
                !requests.some(c => (c.expense_type === 'clearing' || c.type === 'Clearing') && c.advance_id === req.id && c.status?.toLowerCase() !== 'rejected')
              );
              return (
                <div 
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-rose-500 transition-all group"
                  onClick={() => setDrillDownType('uncleared_advances')}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">เงินทดรองค้างเคลียร์</span>
                    <span className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform"><AlertTriangle size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{unclearedAdvances.length} รายการ</h3>
                  <span className="text-[10px] text-rose-500 font-extrabold block mt-1">
                    พนักงาน {new Set(unclearedAdvances.map(r => r.employeeName)).size} คน ที่ยังไม่เคลียร์
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Finance Queue for payouts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Disbursements Queue */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">คิวอนุมัติการสั่งจ่ายเงินชดเชย / ล้างบัญชีรายวัน (Disbursements Queue)</h3>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(() => {
                  const payouts = requests.filter(r => {
                    const statusLower = r.status?.toLowerCase();
                    return statusLower === 'approved' || statusLower === 'pending_refund';
                  });
                  if (payouts.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400">
                        <CheckCircle size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs">ไม่มีรายการค้างรอจัดการหรือตัดบัญชีในระบบ</p>
                      </div>
                    );
                  }
                  return payouts.map(req => {
                    const isPendingRefund = req.status === 'pending_refund';
                    
                    let statusLabel = "ผ่านอนุมัติ - รอชำระ";
                    let statusClass = "text-amber-600";
                    let btnText = "เซ็นโอนเงิน & ปิดสมุดรายวัน";
                    let btnClass = "bg-emerald-600 hover:bg-emerald-700";

                    if (isPendingRefund) {
                      statusLabel = "🟡 พนักงานโอนเงินคืนแล้ว - รอตรวจรับ";
                      statusClass = "text-amber-600 font-extrabold";
                      btnText = "ตรวจ & ยืนยันยอดเงินคืน";
                      btnClass = "bg-amber-600 hover:bg-amber-700";
                    } else if (req.expense_type === 'advance') {
                      statusLabel = "🔵 อนุมัติแล้ว - รอจ่ายเงินทดรอง";
                      statusClass = "text-primary-600 dark:text-primary-400 font-extrabold";
                      btnText = "บันทึกโอนเงินทดรอง";
                      btnClass = "bg-primary-600 hover:bg-primary-700";
                    } else if (req.expense_type === 'clearing') {
                      if (req.settlement_type === 'reimbursement') {
                        statusLabel = "🔵 เคลียร์ยอด - บริษัทจ่ายเพิ่ม";
                        statusClass = "text-primary-600 dark:text-primary-400 font-extrabold";
                        btnText = "โอนจ่ายเพิ่ม & แนบหลักฐาน";
                        btnClass = "bg-primary-600 hover:bg-primary-700";
                      } else if (req.settlement_type === 'payroll_deduction') {
                        statusLabel = "🟣 เคลียร์ยอด - รอหักเงินเดือน";
                        statusClass = "text-purple-600 font-extrabold";
                        btnText = "บันทึกรอบหักเงินเดือน";
                        btnClass = "bg-purple-600 hover:bg-purple-700";
                      } else if (req.settlement_type === 'refund') {
                        statusLabel = "🟠 เคลียร์ยอด - รอพนักงานโอนคืน";
                        statusClass = "text-amber-500 font-extrabold";
                        btnText = "บันทึกรับเงิน (แทนพนักงาน)";
                        btnClass = "bg-amber-500 hover:bg-amber-600";
                      } else {
                        statusLabel = "🟢 ยอดตรงดุล - รอปิดบัญชี";
                        statusClass = "text-emerald-600 font-extrabold";
                        btnText = "ปิดสมุดบัญชีเคลียร์";
                        btnClass = "bg-emerald-600 hover:bg-emerald-700";
                      }
                    }

                    return (
                      <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 rounded-xl mt-0.5">
                            <FileText size={18} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">{req.title}</span>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className="font-semibold text-slate-600">{req.id}</span>
                              <span>•</span>
                              <span>พนักงาน: {req.employeeName}</span>
                              <span>•</span>
                              <span>แผนก: {req.department}</span>
                              <span>•</span>
                              <span>{req.date}</span>
                            </div>
                            {req.expense_type === 'clearing' && (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md">
                                  ผลต่างดุลเคลียร์: ฿{req.settlement_amount?.toLocaleString()} ({
                                    req.settlement_type === 'refund' ? 'คืนเงิน' :
                                    req.settlement_type === 'reimbursement' ? 'บริษัทจ่ายชดเชยเพิ่ม' :
                                    req.settlement_type === 'payroll_deduction' ? 'หักเงินเดือน' : 'ดุลพอดี'
                                  })
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
                          <div className="sm:text-right">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white block">฿{req.amount.toLocaleString()}</span>
                            <span className={`text-[9px] block ${statusClass}`}>{statusLabel}</span>
                          </div>

                          <button
                            id={`finance-pay-${req.id}`}
                            onClick={() => handleFinancePayment(req)}
                            className={`px-3 py-1.5 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-slate-600/5 ${btnClass}`}
                          >
                            {btnText}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Quick Accounting Ledger Audit info */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4 h-fit">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">ข้อกำหนดการควบคุมบัญชี</h3>
              <div className="space-y-3 text-xs text-slate-500">
                <p>การกด "เซ็นโอนเงิน & ปิดสมุดรายวัน" จะทำการ:</p>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                  <li>สร้างบันทึกผูกระบบบัญชีสมุดคู่ (Double-Entry Journal)</li>
                  <li>ตัดยอดงบประมาณสะสมจริงรายปีของแผนก</li>
                  <li>ปรับปรุงวงเงินในระบบให้สะท้อนความจริงทันที</li>
                </ul>
                <div className="p-3 bg-emerald-950/10 border border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] leading-relaxed">
                  <strong>✓ มาตรฐานความมั่นคงสูง:</strong> ลายเซ็นดิจิทัลของผู้เบิกพนักงานและผู้อนุมัติร่วมจะถูกฝังลงเอกสารสำคัญอย่างถาวร
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          ROLE VIEW 4: EXECUTIVE DASHBOARD (Enterprise Budgets, Heatmaps, stats)
          ========================================================================= */}
      {role === 'Executive' && (
        <div className="space-y-6" id="executive-dashboard">
          
          {/* Executive KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Corporate Budget Sum */}
            {(() => {
              const totalBudgetAlloc = budgets.reduce((sum, b) => sum + b.allocated, 0);
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('exec_budget')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">งบประมาณรวมองค์กรประจำปี</span>
                    <span className="p-2 bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400 rounded-xl"><Building size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{totalBudgetAlloc.toLocaleString()}</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">งบประมาณรวมทุกส่วนงาน</span>
                </div>
              );
            })()}

            {/* Spent Total */}
            {(() => {
              const totalSpentAlloc = budgets.reduce((sum, b) => sum + b.spent, 0);
              const totalBudgetAlloc = budgets.reduce((sum, b) => sum + b.allocated, 0);
              const usePercent = Math.round((totalSpentAlloc / totalBudgetAlloc) * 100) || 0;
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('exec_spent')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เบิกจ่ายไปแล้วจริง</span>
                    <span className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl"><TrendingUp size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{totalSpentAlloc.toLocaleString()}</h3>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-1">ใช้ไปแล้ว {usePercent}% ของงบปี</span>
                </div>
              );
            })()}

            {/* Pending Approvals Organization total */}
            {(() => {
              const pendingReqs = requests.filter(r => r.status?.toLowerCase() === 'pending');
              const pendingSum = pendingReqs.reduce((sum, r) => sum + r.amount, 0);
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('exec_pending')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">งบเบิกระหว่างรออนุมัติค้าง</span>
                    <span className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl"><Clock size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">฿{pendingSum.toLocaleString()}</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">จำนวนค้าง {pendingReqs.length} คำขอในระบบ</span>
                </div>
              );
            })()}

            {/* Total organization violations */}
            {(() => {
              const totalViolations = requests.filter(r => r.policyStatus === 'warning' || r.policyStatus === 'violation').length;
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('exec_violations')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ประเด็นเตือนกฎนโยบายองค์กร</span>
                    <span className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl"><AlertCircle size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{totalViolations} ประเด็น</h3>
                  <span className="text-[10px] text-rose-500 font-bold block mt-1">รวมบิลสุ่มเสี่ยงความถูกต้อง</span>
                </div>
              );
            })()}
          </div>

          {/* Department Budgets Comparison Charts & Progress List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">การกระจายงบประมาณรายแผนก (Organizational Overview)</h3>
                  <p className="text-[10px] text-slate-400">เปรียบเทียบสัดส่วนระหว่างงบเป้าหมายการเงินและอัตราเบิกใช้งานจริง</p>
                </div>
              </div>

              <div className="space-y-4">
                {budgets.map(b => {
                  const percent = Math.round((b.spent / b.allocated) * 100) || 0;
                  return (
                    <div key={b.department} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{b.department}</span>
                        <span className="text-slate-500">
                          {percent}% (฿{b.spent.toLocaleString()} / ฿{b.allocated.toLocaleString()})
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-600 rounded-full" style={{ width: `${Math.min(percent, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spending Categories Breakdown */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-fit space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">สัดส่วนค่าใช้จ่ายจำแนกตามประเภท</h3>
              <div className="space-y-3">
                {Object.keys(CATEGORIES_CONFIG).map(catKey => {
                  const config = CATEGORIES_CONFIG[catKey];
                  const catReqs = requests.filter(r => r.category === catKey);
                  const total = catReqs.reduce((sum, r) => sum + r.amount, 0);
                  return (
                    <div key={catKey} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">{config.name}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">฿{total.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          ROLE VIEW 5: ADMINISTRATOR DASHBOARD (Telemetry health, users management, audit trail)
          ========================================================================= */}
      {role === 'Administrator' && (
        <div className="space-y-6" id="admin-dashboard">
          
          {/* Admin KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Employee Accounts */}
            {(() => {
              const uCount = getDbUsers().length;
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('admin_users')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">บัญชีพนักงานรวมในระบบ</span>
                    <span className="p-2 bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400 rounded-xl"><Users size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{uCount} บัญชีพนักงาน</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">ได้รับการตรวจสอบตัวตน</span>
                </div>
              );
            })()}

            {/* System Node Telemetry */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-emerald-500 transition-all" onClick={() => setDrillDownType('admin_telemetry')}>
              <div className="absolute right-0 bottom-0 opacity-10 translate-y-3 translate-x-3">
                <Cpu size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Node Uptime Telemetry</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <h3 className="text-xl font-black text-emerald-400">99.98%</h3>
                <span className="text-[9px] text-slate-400 block mt-1">Latency: 12ms • API Server Online</span>
              </div>
            </div>

            {/* Rules workflows map count */}
            {(() => {
              const ruleCount = JSON.parse(localStorage.getItem('okey_db_rules') || '[]').length;
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('admin_workflows')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">กฎสายการอนุมัติ (Workflows)</span>
                    <span className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl"><Layers size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{ruleCount} กฎที่ประกาศใช้</h3>
                  <span className="text-[10px] text-slate-400 block mt-1">ประมวลผลตามลำดับเงื่อนไข</span>
                </div>
              );
            })()}

            {/* Audit Logs count */}
            {(() => {
              const logCount = JSON.parse(localStorage.getItem('okey_db_logs') || '[]').length;
              return (
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all group" onClick={() => setDrillDownType('admin_logs')}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">บันทึกประวัติเหตุการณ์</span>
                    <span className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl"><Activity size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{logCount} เหตุการณ์</h3>
                  <span className="text-[10px] text-rose-500 font-bold block mt-1">บันทึกถาวรในระบบสากล</span>
                </div>
              );
            })()}
          </div>

          {/* Audit Trail list */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">ประวัติการปฏิบัติงานความปลอดภัยองค์กร (Enterprise Audit Trail Logs)</h3>
                <p className="text-[10px] text-slate-400">บันทึกเหตุการณ์การปรับปรุงสิทธิ์ สายการอนุมัติ และบันทึกสมุดบัญชีองค์กร</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="ค้นหาตามรหัสพนักงาน..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[10px] max-h-80 overflow-y-auto pr-2">
              {(() => {
                const logs = JSON.parse(localStorage.getItem('okey_db_logs') || '[]');
                const filtered = logs.filter((l: any) => {
                  const s = (auditSearch || '').toLowerCase();
                  return !s || 
                    String(l.action_by || '').toLowerCase().includes(s) || 
                    String(l.comment || '').toLowerCase().includes(s);
                });
                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-slate-400">
                      ไม่พบประวัติความปลอดภัยที่ตรวจค้น
                    </div>
                  );
                }
                return filtered.reverse().map((log: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex justify-between items-start gap-4">
                    <div>
                      <span className="text-slate-500">[{log.timestamp}]</span>
                      <strong className="text-primary-600 dark:text-primary-400 ml-2">{log.action_by}</strong>
                      <span className="text-slate-700 dark:text-slate-300 ml-2">{log.comment}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${log.action === 'approve' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {log.action.toUpperCase()}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          FINANCE SETTLEMENT CONTROL PANEL MODAL (Financial Settlement)
          ========================================================================= */}
      {settlementModalRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 animate-scale-up my-8">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">⚖️ บันทึกสรุปดุลบัญชีและการเงิน (Financial Settlement)</h3>
                <p className="text-xs text-slate-400">รหัสคำขอ: {settlementModalRequest.id} | โดย: {settlementModalRequest.employeeName}</p>
              </div>
              <button 
                onClick={() => setSettlementModalRequest(null)}
                className="text-rose-500 hover:text-white hover:bg-rose-500 dark:text-rose-400 dark:hover:text-white p-1.5 rounded-xl transition-all duration-150 bg-rose-50 dark:bg-rose-950/20 shadow-sm font-bold cursor-pointer h-8 w-8 flex items-center justify-center"
                title="ปิด"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">📌 รายละเอียดบัญชีการเบิก:</p>
              <div className="grid grid-cols-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                <p>หัวข้อคำขอ: <span className="font-semibold text-slate-800 dark:text-slate-200">{settlementModalRequest.title}</span></p>
                <p>แผนก: <span className="font-semibold text-slate-800 dark:text-slate-200">{settlementModalRequest.department}</span></p>
                <p>จำนวนเงินเบิกสุทธิ: <span className="font-bold font-mono text-slate-900 dark:text-white">฿{settlementModalRequest.amount.toLocaleString()}</span></p>
                <p>ประเภทการเบิก: <span className="font-bold text-primary-600 dark:text-primary-400 uppercase">{settlementModalRequest.expense_type}</span></p>
                
                {settlementModalRequest.expense_type === 'clearing' && (
                  <>
                    <p className="col-span-2 border-t border-slate-200 dark:border-slate-800 my-1"></p>
                    <p>สิทธิ์การหักลดหย่อน:</p>
                    <p>เงินทดรองเดิม: ฿{requests.find(r => r.id === settlementModalRequest.advance_id)?.amount?.toLocaleString() || '0'}</p>
                    <p>สถานะดุลเคลียร์:</p>
                    <p className="font-bold text-amber-600">
                      {settlementModalRequest.settlement_type === 'refund' ? `🔴 พนักงานต้องคืนเงิน: ฿${settlementModalRequest.settlement_amount?.toLocaleString()}` :
                       settlementModalRequest.settlement_type === 'reimbursement' ? `🔵 บริษัทต้องชดเชยเพิ่ม: ฿${settlementModalRequest.settlement_amount?.toLocaleString()}` :
                       settlementModalRequest.settlement_type === 'payroll_deduction' ? `🟣 ดำเนินการหักเงินเดือน: ฿${settlementModalRequest.settlement_amount?.toLocaleString()}` :
                       '🟢 ยอดดุลพอดีสะสม'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Settlement Form Content */}
            <div className="space-y-4 text-xs font-sans">
              {settlementModalRequest.expense_type === 'advance' && (
                <div className="space-y-3">
                  <span className="font-extrabold text-primary-700 dark:text-primary-400 block border-l-2 border-primary-600 pl-2">
                    บันทึกการจ่ายเงินทดรอง (Advance Payout)
                  </span>
                  
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">วันที่โอนจ่ายเงินทดรอง <span className="text-rose-500">*</span></label>
                    <input 
                      type="date"
                      value={settlementDate}
                      onChange={e => setSettlementDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {settlementModalRequest.expense_type === 'clearing' && settlementModalRequest.settlement_type === 'refund' && (
                <div className="space-y-3">
                  <span className="font-extrabold text-amber-600 block border-l-2 border-amber-500 pl-2">
                    ตรวจสอบและตรวจรับยอดโอนคืน (Refund Confirmation)
                  </span>

                  {settlementModalRequest.refund_proof_url ? (
                    <div className="p-3 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-850 rounded-xl space-y-2">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">📄 ตรวจพบเอกสารนำส่งคืนโดยพนักงาน:</p>
                      <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                        <p>วันที่โอนจริง: <span className="font-bold">{settlementModalRequest.refund_transferred_date || '-'}</span></p>
                        <p>คำชี้แจง: <span>{settlementModalRequest.refund_comment || 'ไม่มีการระบุข้อความ'}</span></p>
                        <p>ชื่อหลักฐาน: <span className="underline font-mono text-[10px]">{settlementModalRequest.refund_proof_name || 'สลิปหลักฐาน'}</span></p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettlementPreviewUrl(settlementModalRequest.refund_proof_url || null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-primary-600 dark:text-primary-400 rounded-lg shadow-sm hover:underline"
                      >
                        <Eye size={12} />
                        <span>คลิกเพื่อดูสลิปโอนเงินแนบเต็มรูปแบบ</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-850 rounded-xl space-y-2">
                      <p className="font-bold text-amber-800 dark:text-amber-400">⚠️ พนักงานยังไม่ได้ส่งแนบสลิปคืนเงิน:</p>
                      <p className="text-[10px] text-slate-500">คุณสามารถบันทึกรับสลิปเงินคืนและแนบสลิปโอนคืนแทนพนักงานตรงนี้ได้ทันที:</p>
                      
                      <div className="space-y-1.5 mt-2">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">วันที่รับคืนเงิน</label>
                        <input 
                          type="date"
                          value={settlementDate}
                          onChange={e => setSettlementDate(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5 mt-2">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">แนบสลิปตรวจรับ (รูป/PDF)</label>
                        <input 
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            const input = e.target;
                            if (file) {
                              uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then((dataUrl) => {
      
                                setSettlementProofUrl(dataUrl);
                                setSettlementProofName(file.name);
                                input.value = '';
                              
    });
                            }
                          }}
                          className="w-full text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 mt-3">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">วันที่ตรวจนับยอดเงินเสร็จสิ้น <span className="text-rose-500">*</span></label>
                    <input 
                      type="date"
                      value={settlementDate}
                      onChange={e => setSettlementDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl"
                    />
                  </div>

                  <p className="text-[11px] text-slate-505 font-medium">
                    * การกดยืนยันการรับเงินคืนเป็นการเปลี่ยนสถานะทางการเงินเป็น <span className="text-emerald-600 font-extrabold">🟢 Cleared (ปิดยอดเรียบร้อย)</span>
                  </p>
                </div>
              )}

              {settlementModalRequest.expense_type === 'clearing' && settlementModalRequest.settlement_type === 'reimbursement' && (
                <div className="space-y-3">
                  <span className="font-extrabold text-primary-700 dark:text-primary-400 block border-l-2 border-primary-600 pl-2">
                    จ่ายคืนเพิ่มชดเชยดุลเคลียร์ (Reimbursement Settlement)
                  </span>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">วันที่โอนจ่ายชดเชยเพิ่มเติม <span className="text-rose-500">*</span></label>
                    <input 
                      type="date"
                      value={settlementDate}
                      onChange={e => setSettlementDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">อัปโหลดสลิปหลักฐานการโอนจ่าย <span className="text-rose-500">*</span></label>
                    <input 
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={e => {
                        const file = e.target.files?.[0];
                            const input = e.target;
                        if (file) {
                          uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then((dataUrl) => {
      
                            setSettlementProofUrl(dataUrl);
                            setSettlementProofName(file.name);
                                input.value = '';
                          
    });
                        }
                      }}
                      className="w-full text-xs"
                    />
                    {settlementProofName && (
                      <span className="text-[10px] text-slate-500 block mt-1 font-mono">✔️ อัปโหลดแล้ว: {settlementProofName}</span>
                    )}
                  </div>
                </div>
              )}

              {settlementModalRequest.expense_type === 'clearing' && settlementModalRequest.settlement_type === 'payroll_deduction' && (
                <div className="space-y-3">
                  <span className="font-extrabold text-purple-700 dark:text-purple-400 block border-l-2 border-purple-600 pl-2">
                    ดำเนินการหักยอดคงค้างเงินเดือน (Payroll Deduction)
                  </span>

                  <div className="grid grid-cols-2 gap-3 font-sans">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">รอบเดือนการจ่ายเงินเดือน <span className="text-rose-500">*</span></label>
                      <input 
                        type="month"
                        value={payrollPeriodInput}
                        onChange={e => setPayrollPeriodInput(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">วันที่ทำรายการหักบัญชี <span className="text-rose-500">*</span></label>
                      <input 
                        type="date"
                        value={settlementDate}
                        onChange={e => setSettlementDate(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {settlementModalRequest.expense_type === 'clearing' && settlementModalRequest.settlement_type === 'perfect' && (
                <div className="space-y-2 p-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 rounded-xl">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">✔️ ปิดดุลรายวันอย่างรวดเร็ว:</p>
                  <p className="text-[11px] text-slate-505">
                    รายการเบิกและเงินทดรองเก่ามีดุลตรงกันพอดี ฿0.00 บาท ไม่ต้องการหลักฐานโอนจ่าย สามารถกดยืนยันบันทึกเพื่อเคลียร์สัญญารายวันได้ทันที
                  </p>
                </div>
              )}

              {settlementModalRequest.expense_type !== 'advance' && settlementModalRequest.expense_type !== 'clearing' && (
                <div className="space-y-3">
                  <span className="font-extrabold text-primary-700 dark:text-primary-400 block border-l-2 border-primary-600 pl-2">
                    บันทึกการโอนเงินชดเชย (Reimbursement Settlement)
                  </span>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">วันที่โอนชำระเงิน <span className="text-rose-500">*</span></label>
                    <input 
                      type="date"
                      value={settlementDate}
                      onChange={e => setSettlementDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">อัปโหลดสลิปการจ่ายเงินชดเชย <span className="text-rose-500">*</span></label>
                    <input 
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={e => {
                        const file = e.target.files?.[0];
                            const input = e.target;
                        if (file) {
                          uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then((dataUrl) => {
      
                            setSettlementProofUrl(dataUrl);
                            setSettlementProofName(file.name);
                                input.value = '';
                          
    });
                        }
                      }}
                      className="w-full text-xs"
                    />
                    {settlementProofName && (
                      <span className="text-[10px] text-slate-500 block mt-1 font-mono">✔️ อัปโหลดแล้ว: {settlementProofName}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100 dark:border-slate-800 font-sans">
              <button 
                onClick={() => setSettlementModalRequest(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold transition-all text-xs shadow-xs"
              >
                ยกเลิก
              </button>
              <button 
                id="submit-settlement-btn"
                onClick={() => {
                  if (settlementModalRequest.expense_type === 'clearing') {
                    if (settlementModalRequest.settlement_type === 'reimbursement' && !settlementProofUrl) {
                      alert('กรุณาอัปโหลดหลักฐานสลิปการโอนจ่ายชดเชยเพิ่มเติม');
                      return;
                    }
                    if (settlementModalRequest.settlement_type === 'payroll_deduction' && !payrollPeriodInput) {
                      alert('กรุณาระบุรอบบัญชีการหักเงินเดือนพนักงาน');
                      return;
                    }
                  } else if (settlementModalRequest.expense_type !== 'advance') {
                    
                  }
                  
                  // Submit
                  submitSettlement(settlementModalRequest);
                }}
                className="px-5 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl font-extrabold shadow-md shadow-green-500/20 transition-all text-xs hover:scale-[1.02] active:scale-[0.98]"
              >
                บันทึกปิดบัญชี
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          GLOBAL LIGHTBOX MODAL FOR RECEIPTS PREVIEW (Task 1 attachment viewing)
          ========================================================================= */}
      {fullImageModal && (
        <div 
          onClick={() => setFullImageModal(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center">
            <button 
              onClick={() => setFullImageModal(null)}
              className="absolute -top-12 right-0 text-white hover:text-white font-bold flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-full text-xs shadow-lg transition-all cursor-pointer"
            >
              <X size={14} /> Close
            </button>
            <img 
              src={fullImageModal} 
              alt="Receipt Attachment View" 
              className="max-h-[80vh] max-w-full object-contain rounded-xl border border-slate-800 shadow-2xl" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Global Image/PDF Zoom Viewer Modal */}
      {settlementPreviewUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSettlementPreviewUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setSettlementPreviewUrl(null)}
              className="absolute -top-14 right-0 bg-rose-600 hover:bg-rose-700 text-white p-2.5 rounded-full transition-all cursor-pointer shadow-lg hover:scale-105 z-10 flex items-center justify-center h-10 w-10"
              title="ปิด"
            >
              <X className="h-6 w-6 font-bold" />
            </button>
            {settlementPreviewUrl.startsWith('data:application/pdf') || settlementPreviewUrl.endsWith('.pdf') || settlementPreviewUrl.includes('application/pdf') ? (
              <iframe
                src={settlementPreviewUrl}
                className="w-[85vw] max-w-5xl h-[85vh] rounded-2xl border border-white/10 shadow-2xl bg-white dark:bg-slate-900"
                title="PDF Viewer"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img 
                src={settlementPreviewUrl} 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl" 
                alt="Zoomed evidence" 
                referrerPolicy="no-referrer"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
