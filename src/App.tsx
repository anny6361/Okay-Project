import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Search, 
  HelpCircle, 
  Sun, 
  Moon, 
  AlertTriangle,
  Settings,
  X,
  PlusCircle,
  LogOut,
  Key,
  Palette,
  User,
  Check,
  Printer,
  Loader2
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import RequestDetailModal from './components/RequestDetailModal';
import LoginView from './components/LoginView';

const DashboardView = React.lazy(() => import('./components/DashboardView'));
const MyRequestsView = React.lazy(() => import('./components/MyRequestsView'));
const ApprovalInboxView = React.lazy(() => import('./components/ApprovalInboxView'));
const HistoryAndReportsView = React.lazy(() => import('./components/HistoryAndReportsView'));
const BudgetAnalyticsView = React.lazy(() => import('./components/BudgetAnalyticsView'));
const PolicyConfigView = React.lazy(() => import('./components/PolicyConfigView'));
const OnboardingView = React.lazy(() => import('./components/OnboardingView'));
const AccountingLedgerView = React.lazy(() => import('./components/AccountingLedgerView'));
const DocumentPdfManagerView = React.lazy(() => import('./components/DocumentPdfManagerView'));
const DocumentGalleryView = React.lazy(() => import('./components/DocumentGalleryView'));
const EnterpriseAuditLogView = React.lazy(() => import('./components/EnterpriseAuditLogView'));
const MyProfileView = React.lazy(() => import('./components/MyProfileView'));
const BackupRestoreView = React.lazy(() => import('./components/BackupRestoreView'));

import { NotificationMessage, ExpenseRequest, DepartmentBudget, Comment, ApprovalStep, UserProfile } from './types';

import { 
  getDbNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  addDbNotification,
  syncRealNotifications,
  getDbUsers, 
  getDbRules, 
  addApprovalLog, 
  getWorkflowChain,
  addRefundRecord,
  addDeductionRecord,
  addJournalEntry,
  addAccountingDocument,
  addEnterpriseAuditLog,
  getDbEnterpriseAuditLogs,
  generateDocumentId,
  getDbDepartments
} from './data/db';
const AdminConfigView = React.lazy(() => import('./components/AdminConfigView'));

import { setupClientFirestoreSync } from './lib/firebase-client';





export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [budgets, setBudgets] = useState<DepartmentBudget[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState(localStorage.getItem('okey_accent') || 'blue');
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  
  // Simulated Logged-In User States (Users Table simulation)
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Directly open claim modal trigger from dashboard
  const [isCreateModalOpenDirectly, setIsCreateModalOpenDirectly] = useState(false);
  const [preselectedAdvanceId, setPreselectedAdvanceId] = useState<string>('');

  // Find all uncleared advances for current user
  const unclearedAdvances = useMemo(() => {
    if (!currentUser) return [];
    return requests.filter(r => {
      if (r.created_by !== currentUser.user_id) return false;
      if (r.expense_type !== 'advance') return false;
      
      // Check if there is an active (pending/approved) clearing request for this advance
      const hasClearing = requests.some(c => 
        c.expense_type === 'clearing' && 
        c.advance_id === r.id && 
        c.status !== 'rejected'
      );
      if (hasClearing) return false;

      return (
        (r.status === 'approved' || r.status === 'Approved' || r.status === 'Paid' || r.status === 'cleared') &&
        (r.remaining_balance === undefined ? r.amount : r.remaining_balance) > 0 &&
        r.advance_status !== 'Fully Cleared'
      );
    });
  }, [requests, currentUser]);

  // Automatically trigger audit logging & notifications for overdue items
  useEffect(() => {
    if (!currentUser || unclearedAdvances.length === 0) return;
    
    unclearedAdvances.forEach(adv => {
      const diffTime = new Date().getTime() - new Date(adv.date).getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const daysOutstanding = diffDays < 0 ? 0 : diffDays;
      const isOverdue = daysOutstanding > 15;
      
      if (isOverdue) {
        // Log notification to enterprise audit logs if not already logged recently
        const logs = getDbEnterpriseAuditLogs();
        const alreadyLogged = logs.some(l => 
          l.ref_id === adv.id && 
          l.action_type === 'ALERT' &&
          l.details.includes('เกินกำหนด')
        );
        
        if (!alreadyLogged) {
          addEnterpriseAuditLog(
            currentUser.user_id,
            currentUser.name,
            currentUser.approval_level || 'Employee',
            'ALERT',
            `ระบบส่งแจ้งเตือนการค้างชำระ เกินกำหนด 15 วัน ของใบขอรับเงินทดรองจ่าย เลขที่ ${adv.id} (ค้างมาแล้ว ${daysOutstanding} วัน) ไปยังผู้เกี่ยวข้อง: พนักงาน, ผู้อนุมัติพิจารณา และฝ่ายบัญชีการเงินเรียบร้อยแล้ว`
          );
        }
      }
    });
  }, [unclearedAdvances, currentUser]);

  // Sync real-time notifications when currentUser or requests change
  useEffect(() => {
    if (currentUser) {
      syncRealNotifications(currentUser, requests);
      setNotifications(getDbNotifications(currentUser.user_id));
    }
  }, [currentUser, requests]);

  // Load and synchronize data from localStorage database
  const loadDatabase = () => {
    const dbUsers = getDbUsers();
    setUsersList(dbUsers);
    
    // Auto-sync current user if they are logged in
    const savedUserId = localStorage.getItem('okey_simulated_user_id') || sessionStorage.getItem('okey_session_user_id');
    if (savedUserId) {
      const matchedUser = dbUsers.find(u => u.user_id === savedUserId);
      if (matchedUser && matchedUser.is_active) {
        setCurrentUser(matchedUser);
      }
    }

    const savedRequests = localStorage.getItem('okey_requests');
    const savedBudgets = localStorage.getItem('okey_budgets');

    let loadedRequests: ExpenseRequest[] = [];
    if (savedRequests) {
      loadedRequests = JSON.parse(savedRequests);
    } else {
      // Pre-seed and enrich initial requests with dynamic user and approver IDs
      const enriched = [].map(req => {
        let created_by = 'user-1'; // Default สมชาย
        let current_approver: string | undefined = undefined;
        let next_approver: string | null = null;

        if (req.id === 'EXP-2026-001') {
          created_by = 'user-1';       // สมชาย
          current_approver = 'user-3'; // รุ่งโรจน์ (after Level 1 ณภัทร approved)
          next_approver = 'user-4';    // มนัญญา
        } else if (req.id === 'EXP-2026-002') {
          created_by = 'user-2';       // ณภัทร
          current_approver = 'user-3'; // รุ่งโรจน์
          next_approver = 'user-4';    // มนัญญา
        } else if (req.id === 'EXP-2026-003') {
          created_by = 'user-1';
        } else if (req.id === 'EXP-2026-004') {
          created_by = 'user-5';       // วิลาสินี
        } else if (req.id === 'EXP-2026-005') {
          created_by = 'user-1';
        } else if (req.id === 'EXP-2026-006') {
          created_by = 'user-2';
        }
        
        return {
          ...req,
          created_by,
          current_approver,
          next_approver
        };
      });
      loadedRequests = enriched;
      localStorage.setItem('okey_requests', JSON.stringify(enriched));
    }
    setRequests(loadedRequests);

    let loadedBudgets: DepartmentBudget[] = [];
    if (savedBudgets) {
      loadedBudgets = JSON.parse(savedBudgets);
    } else {
      loadedBudgets = [];
    }

    const depts = getDbDepartments();
    const computedBudgets = loadedBudgets.map(b => {
      let spent = 0;
      let pending = 0;
      loadedRequests.forEach(r => {
        const rDept = r.department ? r.department.toLowerCase() : '';
        const bDept = b.department ? b.department.toLowerCase() : '';
        if (rDept === bDept || rDept.includes(bDept) || bDept.includes(rDept)) {
          const statusLower = r.status ? r.status.toLowerCase() : '';
          if (statusLower === 'approved' || statusLower === 'paid' || statusLower === 'cleared') {
            spent += r.amount;
          } else if (statusLower === 'pending') {
            pending += r.amount;
          }
        }
      });

      // Match department name from getDbDepartments()
      const matchedDept = depts.find(d => {
        const dName = d.department_name ? d.department_name.toLowerCase() : '';
        const bName = b.department ? b.department.toLowerCase() : '';
        return dName === bName || dName.includes(bName) || bName.includes(dName);
      });
      const allocated = matchedDept ? matchedDept.budget : b.allocated;

      return { ...b, allocated: allocated || 100000, spent, pending };
    });

    setBudgets(computedBudgets);
    localStorage.setItem('okey_budgets', JSON.stringify(computedBudgets));
  };

  // Initialize & Auto Login Session Checking
  useEffect(() => {
    const initializeApp = async () => {
      // Setup direct real-time Firestore synchronization using the client-side Firebase SDK
      const unsubscribeSync = setupClientFirestoreSync(() => {
        loadLocalState();
        window.dispatchEvent(new Event('okey-sync')); // Trigger react sub-views re-renders
      });

      // Setup state reload function
      const loadLocalState = () => {
        // 1. Load users list, requests and budgets
        const dbUsers = getDbUsers();
        setUsersList(dbUsers);

        const savedRequests = localStorage.getItem('okey_requests');
        let loadedRequests: ExpenseRequest[] = [];
        if (savedRequests) {
          loadedRequests = JSON.parse(savedRequests);
        }
        setRequests(loadedRequests);

        const savedBudgets = localStorage.getItem('okey_budgets');
        let loadedBudgets: DepartmentBudget[] = [];
        if (savedBudgets) {
          loadedBudgets = JSON.parse(savedBudgets);
        }

        const depts = getDbDepartments();
        const computedBudgets = loadedBudgets.map(b => {
          let spent = 0;
          let pending = 0;
          loadedRequests.forEach(r => {
            const rDept = r.department ? r.department.toLowerCase() : '';
            const bDept = b.department ? b.department.toLowerCase() : '';
            if (rDept === bDept || rDept.includes(bDept) || bDept.includes(rDept)) {
              const statusLower = r.status ? r.status.toLowerCase() : '';
              if (statusLower === 'approved' || statusLower === 'paid' || statusLower === 'cleared') {
                spent += r.amount;
              } else if (statusLower === 'pending') {
                pending += r.amount;
              }
            }
          });
          const matchedDept = depts.find(d => {
            const dName = d.department_name ? d.department_name.toLowerCase() : '';
            const bName = b.department ? b.department.toLowerCase() : '';
            return dName === bName || dName.includes(bName) || bName.includes(dName);
          });
          const allocated = matchedDept ? matchedDept.budget : b.allocated;
          return { ...b, allocated: allocated || 100000, spent, pending };
        });
        setBudgets(computedBudgets);

        // 2. Authenticate Session / Auto Login
        const token = localStorage.getItem('okey_session_token');
        let authenticatedUser: UserProfile | null = null;

        if (token) {
          try {
            // Safe decoding (obfuscated JSON base64 token storage)
            const decrypted = JSON.parse(atob(token));
            const now = Date.now();
            
            if (decrypted && decrypted.userId && decrypted.expiry > now) {
              const matched = dbUsers.find(u => u.user_id === decrypted.userId);
              if (matched && matched.is_active) {
                authenticatedUser = matched;
              }
            }
          } catch (err) {
            console.error("Session verification failed", err);
            localStorage.removeItem('okey_session_token');
          }
        }

        // Check fallback in sessionStorage if Remember Me was off but tab is active
        if (!authenticatedUser) {
          const sessionUserId = sessionStorage.getItem('okey_session_user_id');
          if (sessionUserId) {
            const matched = dbUsers.find(u => u.user_id === sessionUserId);
            if (matched && matched.is_active) {
              authenticatedUser = matched;
            }
          }
        }
        
        return authenticatedUser;
      };

      const authUser = loadLocalState();
      
      // Listen for okey-sync updates to refresh UI immediately
      const handleSync = () => loadLocalState();
      window.addEventListener('okey-sync', handleSync);

      // 3. Splash Screen display (1.5 seconds minimum for nice UX)
      setTimeout(() => {
        if (authUser) {
          setCurrentUser(authUser);
          setActiveTab('dashboard');
        } else {
          setCurrentUser(null);
        }
        setIsSessionChecking(false);
      }, 1500);

      return () => {
        unsubscribeSync();
        window.removeEventListener('okey-sync', handleSync);
      };
    };

    initializeApp();
  }, []);

  // Save state to localStorage
  const saveState = (updatedRequests: ExpenseRequest[], updatedBudgets?: DepartmentBudget[]) => {
    setRequests(updatedRequests);
    localStorage.setItem('okey_requests', JSON.stringify(updatedRequests));

    const dbDepts = getDbDepartments();
    const baseBudgets = updatedBudgets || budgets;
    const computedBudgets = baseBudgets.map(b => {
      let spent = 0;
      let pending = 0;
      updatedRequests.forEach(r => {
        const rDept = r.department ? r.department.toLowerCase() : '';
        const bDept = b.department ? b.department.toLowerCase() : '';
        if (rDept === bDept || rDept.includes(bDept) || bDept.includes(rDept)) {
          const statusLower = r.status ? r.status.toLowerCase() : '';
          if (statusLower === 'approved' || statusLower === 'paid' || statusLower === 'cleared') {
            spent += r.amount;
          } else if (statusLower === 'pending') {
            pending += r.amount;
          }
        }
      });

      const matchedDept = dbDepts.find(d => {
        const dName = d.department_name ? d.department_name.toLowerCase() : '';
        const bName = b.department ? b.department.toLowerCase() : '';
        return dName === bName || dName.includes(bName) || bName.includes(dName);
      });
      const allocated = matchedDept ? matchedDept.budget : b.allocated;

      return { ...b, allocated: allocated || 100000, spent, pending };
    });

    setBudgets(computedBudgets);
    localStorage.setItem('okey_budgets', JSON.stringify(computedBudgets));
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // CREATE claim handler (calculates dynamic approval rule chain on submission)
  const handleCreateRequest = (newReq: Omit<ExpenseRequest, 'id' | 'status' | 'approvalHistory' | 'comments'> & { isDraft: boolean }) => {
    const nextId = generateDocumentId(newReq.expense_type || 'reimbursement', newReq.date, requests);
    const creatorId = currentUser?.user_id || 'user-1';
    
    // Look up creator's workflow chain from approval rules database table
    const chain = getWorkflowChain(creatorId);
    
    const initialSteps: ApprovalStep[] = [];
    let current_approver: string | undefined = undefined;
    let next_approver: string | null = null;
    let finalStatus: ExpenseRequest['status'] = newReq.isDraft ? 'draft' : 'pending';

    if (!newReq.isDraft) {
      if (chain.length > 0) {
        current_approver = chain[0].approverId;
        next_approver = chain[1]?.approverId || null;
        
        // Lookup approver details to populate visual tracking
        const dbUsers = getDbUsers();
        const firstApproverUser = dbUsers.find(u => u.user_id === current_approver);
        
        initialSteps.push({
          id: `step-${nextId}-1`,
          approverName: firstApproverUser?.name || 'ผู้อนุมัติขั้นแรก',
          approverRole: firstApproverUser?.approval_level || 'Level 1 Approver',
          status: 'pending',
          date: new Date().toISOString().split('T')[0]
        });
      } else {
        // No chain configured - direct auto-approval
        finalStatus = 'approved';
      }
    }

    const fullRequest: ExpenseRequest = {
      ...newReq,
      id: nextId,
      status: finalStatus,
      approvalHistory: initialSteps,
      comments: [],
      
      // Relational fields matching DB schema
      created_by: creatorId,
      current_approver,
      next_approver
    };

    const nextRequests = [fullRequest, ...requests];

    // Adjust budgets accordingly
    let nextBudgets = [...budgets];
    if (!newReq.isDraft) {
      if (finalStatus === 'pending') {
        nextBudgets = budgets.map(b => {
          if (b.department === newReq.department) {
            return { ...b, pending: b.pending + newReq.amount };
          }
          return b;
        });
      } else if (finalStatus === 'approved') {
        nextBudgets = budgets.map(b => {
          if (b.department === newReq.department) {
            return { ...b, spent: b.spent + newReq.amount };
          }
          return b;
        });
      }
    }

    saveState(nextRequests, nextBudgets);
  };

  // DELETE claim handler
  const handleDeleteRequest = (id: string) => {
    const nextRequests = requests.filter(r => r.id !== id);
    saveState(nextRequests);
  };

  // UPDATE claim handler
  const handleUpdateRequest = (id: string, updatedFields: Partial<ExpenseRequest>) => {
    addEnterpriseAuditLog(
      currentUser?.name || 'ผู้ใช้ระบบ',
      'EDIT',
      id,
      `แก้ไขเอกสาร: ${updatedFields.title || ''}`
    );

    const nextRequests = requests.map(req => {
      if (req.id === id) {
        return {
          ...req,
          ...updatedFields,
        };
      }
      return req;
    });

    saveState(nextRequests);
  };

  // APPROVE claim handler (iterates dynamically along configured chain rules)
  const handleApproveRequest = (id: string, comment?: string, approvedAmount?: number, partialReason?: string) => {
    let targetDept = '';
    let targetAmount = 0;
    let creatorId = '';
    let newlyApprovedRequest: ExpenseRequest | null = null;

    const nextRequests = requests.map(req => {
      if (req.id === id) {
        targetDept = req.department;
        creatorId = req.created_by || 'user-1';

        // Check if this is a partial approval (approvedAmount specified and less than req.amount)
        let finalAmount = req.amount;
        let origAmount = req.original_amount;
        let partReason = req.partial_approval_reason;
        
        if (approvedAmount !== undefined && approvedAmount < req.amount) {
          origAmount = req.amount;
          finalAmount = approvedAmount;
          partReason = partialReason;
        }
        
        targetAmount = finalAmount;

        // Recalculate settlement details for clearing if partial approval changes final amount
        let finalClearedAmount = req.cleared_amount;
        let finalSettlementType = req.settlement_type;
        let finalSettlementAmount = req.settlement_amount;

        if (req.expense_type === 'clearing') {
          finalClearedAmount = finalAmount;
          const matchedAdvance = requests.find(r => r.id === req.advance_id);
          const advAmt = matchedAdvance ? (matchedAdvance.amount || 0) : 0;
          finalSettlementType = finalAmount < advAmt ? 'refund' : finalAmount > advAmt ? 'reimbursement' : 'perfect';
          finalSettlementAmount = Math.abs(finalAmount - advAmt);
        }

        // 1. Log to Approval History Table
        const approvalActionText = (approvedAmount !== undefined && approvedAmount < req.amount) 
          ? `อนุมัติบางส่วนเป็นจำนวนเงิน ฿${approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (เหตุผล: ${partialReason})` 
          : 'ผ่านอนุมัติ';
        
        addApprovalLog(id, currentUser?.user_id || 'user-unknown', 'approve', comment || approvalActionText);

        // 2. Mark current pending step in visual history as approved
        const updatedSteps = req.approvalHistory.map(step => {
          if (step.status === 'pending') {
            return {
              ...step,
              status: 'approved' as const,
              comment: comment || approvalActionText,
              date: new Date().toISOString().split('T')[0]
            };
          }
          return step;
        });

        // 3. Query workflow rules to fetch next approver in sequence
        const chain = getWorkflowChain(creatorId);
        const currentStepIdx = chain.findIndex(c => c.approverId === currentUser?.user_id);
        
        let next_approver_id: string | null = null;
        let isFinal = true;

        if (currentStepIdx !== -1 && currentStepIdx < chain.length - 1) {
          next_approver_id = chain[currentStepIdx + 1].approverId;
          isFinal = false;
        }

        const dateToday = new Date().toISOString().split('T')[0];

        if (!isFinal && next_approver_id) {
          // Progress to the next step
          const dbUsers = getDbUsers();
          const nextApproverUser = dbUsers.find(u => u.user_id === next_approver_id);
          const outerNextApproverId = chain[currentStepIdx + 2]?.approverId || null;

          updatedSteps.push({
            id: `step-${id}-${Date.now()}`,
            approverName: nextApproverUser?.name || 'ผู้อนุมัติลำดับถัดไป',
            approverRole: nextApproverUser?.approval_level || `Level ${currentStepIdx + 2}`,
            status: 'pending',
            date: dateToday
          });

          return {
            ...req,
            amount: finalAmount,
            original_amount: origAmount,
            partial_approval_reason: partReason,
            cleared_amount: finalClearedAmount,
            settlement_type: finalSettlementType,
            settlement_amount: finalSettlementAmount,
            status: 'pending' as const,
            current_approver: next_approver_id,
            next_approver: outerNextApproverId,
            approvalHistory: updatedSteps
          };
        } else {
          // No more steps -> Fully approved (Paid status)
          const approvedReq = {
            ...req,
            amount: finalAmount,
            original_amount: origAmount,
            partial_approval_reason: partReason,
            cleared_amount: finalClearedAmount,
            settlement_type: finalSettlementType,
            settlement_amount: finalSettlementAmount,
            status: 'approved' as const,
            current_approver: undefined,
            next_approver: null,
            approved_date: dateToday,
            company_reimbursed_date: (req.expense_type === 'clearing' && finalSettlementType === 'reimbursement') ? dateToday : req.company_reimbursed_date,
            finance_processed_date: dateToday,
            approvalHistory: updatedSteps
          };
          newlyApprovedRequest = approvedReq;
          return approvedReq;
        }
      }
      return req;
    });

    // Handle budget transfers on final approval
    const isNowApproved = nextRequests.find(r => r.id === id)?.status === 'approved';
    const nextBudgets = budgets.map(b => {
      if (b.department === targetDept) {
        if (isNowApproved) {
          return {
            ...b,
            pending: Math.max(0, b.pending - targetAmount),
            spent: b.spent + targetAmount
          };
        }
      }
      return b;
    });

    let finalRequests = [...nextRequests];
    if (newlyApprovedRequest && (newlyApprovedRequest as ExpenseRequest).expense_type === 'clearing') {
      const clearingReq = newlyApprovedRequest as ExpenseRequest;
      const advanceId = clearingReq.advance_id;
      if (advanceId) {
        finalRequests = finalRequests.map(r => {
          if (r.id === advanceId) {
            const currentBalance = r.remaining_balance !== undefined ? r.remaining_balance : r.amount;
            const newBalance = Math.max(0, currentBalance - clearingReq.amount);
            const isFullyCleared = newBalance <= 0;
            return {
              ...r,
              remaining_balance: newBalance,
              advance_status: isFullyCleared ? ('Fully Cleared' as const) : ('Partially Cleared' as const)
            };
          }
          return r;
        });
      }
    } else if (newlyApprovedRequest && (newlyApprovedRequest as ExpenseRequest).expense_type === 'advance') {
      const advReq = newlyApprovedRequest as ExpenseRequest;
      finalRequests = finalRequests.map(r => {
        if (r.id === advReq.id) {
          return {
            ...r,
            remaining_balance: advReq.amount,
            advance_status: 'Open' as const
          };
        }
        return r;
      });
    }

    saveState(finalRequests, nextBudgets);

    // Dynamic automatic accounting entries triggered on full approval
    if (newlyApprovedRequest) {
      const req: ExpenseRequest = newlyApprovedRequest;
      const approvedBy = currentUser?.name || 'ผู้อนุมัติ';
      
      if (req.expense_type === 'clearing') {
        const advanceId = req.advance_id || '';
        const spentAmount = req.amount || 0;
        
        const matchedAdvance = requests.find(r => r.id === advanceId);
        const advAmount = matchedAdvance ? (matchedAdvance.amount || 0) : 0;
        const diff = spentAmount - advAmount;
        
        if (diff < 0) {
          const refundAmt = Math.abs(diff);
          addRefundRecord(advanceId, refundAmt, 'pending', approvedBy);
          
          addAccountingDocument(
            'refund_receipt',
            req.id,
            req.employeeName,
            req.department,
            `สัญญายืมเงินล่วงหน้าอ้างอิง: ${advanceId}\nยอดเบิกไป: ฿${(advAmount || 0).toLocaleString()}\nยอดใช้จ่ายจริง: ฿${(spentAmount || 0).toLocaleString()}\nเงินคงเหลือส่งคืนคลัง: ฿${(refundAmt || 0).toLocaleString()}`,
            refundAmt,
            approvedBy
          );
          
          addJournalEntry(
            'refund',
            req.id,
            '111100 - เงินสดรับคืน (Refund Receivable)',
            '115200 - ลูกหนี้เงินทดรองจ่าย (Advance Outlay)',
            refundAmt,
            `เงินสดคืนจากเคลียร์เงินยืมทดรองจ่าย ${req.id} (สัญญา ${advanceId})`
          );
          addJournalEntry(
            'expense',
            req.id,
            `510000 - ค่าใช้จ่ายหมวด ${req.category.toUpperCase()}`,
            '115200 - ลูกหนี้เงินทดรองจ่าย (Advance Outlay)',
            spentAmount,
            `ลงบันทึกค่าใช้จ่ายจริงจากการเคลียร์เงินยืมทดรองจ่าย ${req.id}`
          );
        } else if (diff > 0) {
          const reimburseAmt = diff;
          
          addAccountingDocument(
            'reimbursement_voucher',
            req.id,
            req.employeeName,
            req.department,
            `สัญญายืมเงินล่วงหน้าอ้างอิง: ${advanceId}\nยอดเบิกไป: ฿${(advAmount || 0).toLocaleString()}\nยอดใช้จ่ายจริง: ฿${(spentAmount || 0).toLocaleString()}\nบริษัทต้องจ่ายเงินเพิ่มให้พนักงาน (Additional Reimbursement): ฿${(reimburseAmt || 0).toLocaleString()}`,
            reimburseAmt,
            approvedBy
          );
          
          addJournalEntry(
            'expense',
            req.id,
            `510000 - ค่าใช้จ่ายหมวด ${req.category.toUpperCase()}`,
            '111100 - เงินสดและรายการเทียบเท่าเงินสด (Cash/Bank)',
            reimburseAmt,
            `จ่ายชดเชยส่วนต่างเงินสำรองจ่ายเกินวงเงิน ${req.id} (สัญญา ${advanceId})`
          );
          addJournalEntry(
            'expense',
            req.id,
            `510000 - ค่าใช้จ่ายหมวด ${req.category.toUpperCase()}`,
            '115200 - ลูกหนี้เงินทดรองจ่าย (Advance Outlay)',
            advAmount,
            `สลายบัญชีเงินยืมทดรองจ่ายเดิมตามจำนวนสัญญายืมเดิม ${advanceId}`
          );
        } else {
          addAccountingDocument(
            'expense_voucher',
            req.id,
            req.employeeName,
            req.department,
            `เคลียร์เงินทดรองจ่ายพอดีถ้วน\nสัญญายืมเงินล่วงหน้าอ้างอิง: ${advanceId}\nยอดเบิกไป: ฿${(advAmount || 0).toLocaleString()}\nยอดใช้จ่ายจริง: ฿${(spentAmount || 0).toLocaleString()}`,
            spentAmount,
            approvedBy
          );
          
          addJournalEntry(
            'expense',
            req.id,
            `510000 - ค่าใช้จ่ายหมวด ${req.category.toUpperCase()}`,
            '115200 - ลูกหนี้เงินทดรองจ่าย (Advance Outlay)',
            spentAmount,
            `ลงบันทึกค่าใช้จ่ายเคลียร์เงินยืมทดรองจ่ายสมบูรณ์ ${req.id}`
          );
        }
      } else if (req.expense_type === 'advance') {
        addAccountingDocument(
          'advance_payment_voucher',
          req.id,
          req.employeeName,
          req.department,
          `ขออนุมัติยืมเงินสำรองจ่ายล่วงหน้า สำหรับหมวด ${req.category.toUpperCase()}`,
          req.amount,
          approvedBy
        );
        
        addJournalEntry(
          'advance',
          req.id,
          '115200 - ลูกหนี้เงินทดรองจ่าย (Advance Outlay)',
          '111200 - เงินฝากธนาคาร/กระแสรายวัน (Cash & Bank)',
          req.amount,
          `จ่ายเงินยืมทดรองราชการล่วงหน้าตามคำขอ ${req.id}`
        );
      } else {
        addAccountingDocument(
          'expense_voucher',
          req.id,
          req.employeeName,
          req.department,
          `ขออนุมัติเบิกจ่ายคืนพนักงาน สำหรับหมวด ${req.category.toUpperCase()}`,
          req.amount,
          approvedBy
        );
        
        addJournalEntry(
          'expense',
          req.id,
          `510000 - ค่าใช้จ่ายหมวด ${req.category.toUpperCase()}`,
          '111200 - เงินฝากธนาคาร/กระแสรายวัน (Cash & Bank)',
          req.amount,
          `จ่ายเงินเบิกคืนพนักงานรอบคำขอเลขที่ ${req.id}`
        );
      }
    }

    // Sync selectedRequest modal
    const updatedSelected = nextRequests.find(r => r.id === id);
    if (updatedSelected) {
      setSelectedRequest(updatedSelected);
    }
  };

  // REJECT claim handler
  const handleRejectRequest = (id: string, comment: string) => {
    let targetDept = '';
    let targetAmount = 0;

    const nextRequests = requests.map(req => {
      if (req.id === id) {
        targetDept = req.department;
        targetAmount = req.amount;

        // Log transaction to Approval History Table
        addApprovalLog(id, currentUser?.user_id || 'user-unknown', 'reject', comment);

        const updatedSteps = req.approvalHistory.map(step => {
          if (step.status === 'pending') {
            return {
              ...step,
              status: 'rejected' as const,
              comment,
              date: new Date().toISOString().split('T')[0]
            };
          }
          return step;
        });

        return {
          ...req,
          status: 'rejected' as const,
          current_approver: undefined,
          next_approver: null,
          approvalHistory: updatedSteps
        };
      }
      return req;
    });

    // Refund department budgets
    const nextBudgets = budgets.map(b => {
      if (b.department === targetDept) {
        return {
          ...b,
          pending: Math.max(0, b.pending - targetAmount)
        };
      }
      return b;
    });

    saveState(nextRequests, nextBudgets);

    const updatedSelected = nextRequests.find(r => r.id === id);
    if (updatedSelected) {
      setSelectedRequest(updatedSelected);
    }
  };

  // ADD comments
  const handleAddComment = (requestId: string, text: string) => {
    const nextRequests = requests.map(req => {
      if (req.id === requestId) {
        const newComment: Comment = {
          id: `c-new-${Date.now()}`,
          author: currentUser?.name || 'ผู้ใช้ระบบ',
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          text
        };
        return {
          ...req,
          comments: [...req.comments, newComment]
        };
      }
      return req;
    });

    saveState(nextRequests);

    const updatedSelected = nextRequests.find(r => r.id === requestId);
    if (updatedSelected) {
      setSelectedRequest(updatedSelected);
    }
  };

  // CANCEL claim handler
  const handleCancelRequest = (id: string, reason: string) => {
    const nextRequests = requests.map(req => {
      if (req.id === id) {
        addEnterpriseAuditLog(
          currentUser?.name || 'ผู้ใช้ระบบ',
          'CANCEL',
          id,
          `ยกเลิกเอกสารด้วยเหตุผล: ${reason}`
        );
        return {
          ...req,
          status: 'cancelled' as const,
          cancelledBy: currentUser?.name || 'ผู้ใช้ระบบ',
          cancelledAt: new Date().toISOString(),
          cancelReason: reason
        };
      }
      return req;
    });

    const target = requests.find(r => r.id === id);
    let nextBudgets = [...budgets];
    if (target && target.status === 'pending') {
      nextBudgets = budgets.map(b => {
        if (b.department === target.department) {
          return {
            ...b,
            pending: Math.max(0, b.pending - target.amount)
          };
        }
        return b;
      });
    }

    saveState(nextRequests, nextBudgets);

    const updatedSelected = nextRequests.find(r => r.id === id);
    if (updatedSelected) {
      setSelectedRequest(updatedSelected);
    }
  };

  // UPDATE budgets
  const handleUpdateBudgetLimit = (department: string, newAllocated: number) => {
    const nextBudgets = budgets.map(b => {
      if (b.department === department) {
        return { ...b, allocated: newAllocated };
      }
      return b;
    });
    setBudgets(nextBudgets);
    localStorage.setItem('okey_budgets', JSON.stringify(nextBudgets));
  };

  // Count pending approvals for the simulated active user
  const pendingApprovalsCount = requests.filter(r => {
    if (r.status !== 'pending') return false;
    if (currentUser?.user_id === 'user-admin') return true; // Admin views all
    return r.current_approver === currentUser?.user_id;
  }).length;

  // Count pending payouts for Finance/Admin
  const isFinance = currentUser?.approval_level === 'Administrator' || currentUser?.approval_level === 'Finance' || currentUser?.approval_level === 'Level 4';
  const pendingPayoutsCount = isFinance ? requests.filter(r => {
    const statusLower = r.status?.toLowerCase();
    return statusLower === 'approved' || statusLower === 'pending_refund';
  }).length : 0;

  // Handle Logout
  const handleLogout = () => {
    if (currentUser) {
      addEnterpriseAuditLog(
        currentUser.user_id,
        currentUser.name,
        currentUser.approval_level || 'Employee',
        'Auth_Logout',
        'ผู้ใช้งานลงชื่อออกจากระบบ ERP สำเร็จ'
      );
    }
    setCurrentUser(null);
    localStorage.removeItem('okey_simulated_user_id');
    localStorage.removeItem('okey_session_token');
    sessionStorage.removeItem('okey_session_user_id');
  };

  if (isSessionChecking) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center px-4">
          {/* Logo O-Key ERP */}
          <div className="relative">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-12 hover:rotate-0 transition-transform duration-500">
              <span className="text-4xl font-black text-slate-950 font-sans tracking-tighter">O-K</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-slate-950">
              <span className="text-[10px] font-black text-slate-950">★</span>
            </div>
          </div>
          
          <div className="space-y-2 mt-4">
            <h1 className="text-2xl font-black tracking-tight text-slate-100">O-Key ERP Suite</h1>
            <p className="text-xs font-mono text-emerald-400 font-bold tracking-wider uppercase">Enterprise Expense Management</p>
          </div>

          <div className="flex flex-col items-center gap-2 mt-4">
            {/* Elegant Spinner */}
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            </div>
            <p className="text-xs font-bold text-slate-400 animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
          </div>

          <div className="text-[10px] text-slate-600 font-mono mt-8">
            © 2026 O-Key Co., Ltd. All Rights Reserved.
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={(u, rememberMe) => {
          setCurrentUser(u);
          
          if (rememberMe) {
            // Secure Session Token Storage via Base64 obfuscation of expiry and identifier
            const sessionData = {
              userId: u.user_id,
              expiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days duration
              created: Date.now()
            };
            const token = btoa(JSON.stringify(sessionData));
            localStorage.setItem('okey_session_token', token);
            localStorage.setItem('okey_simulated_user_id', u.user_id);
          } else {
            sessionStorage.setItem('okey_session_user_id', u.user_id);
            localStorage.removeItem('okey_session_token');
            localStorage.removeItem('okey_simulated_user_id');
          }
          
          // Set to dashboard after login
          setActiveTab('dashboard');
        }} 
      />
    );
  }

  
  const getThemeVariables = (color: string) => {
    switch(color) {
      case 'indigo': return { '--color-primary-50': 'var(--color-indigo-50)', '--color-primary-100': 'var(--color-indigo-100)', '--color-primary-200': 'var(--color-indigo-200)', '--color-primary-300': 'var(--color-indigo-300)', '--color-primary-400': 'var(--color-indigo-400)', '--color-primary-500': 'var(--color-indigo-500)', '--color-primary-600': 'var(--color-indigo-600)', '--color-primary-700': 'var(--color-indigo-700)', '--color-primary-800': 'var(--color-indigo-800)', '--color-primary-900': 'var(--color-indigo-900)' };
      case 'emerald': return { '--color-primary-50': 'var(--color-emerald-50)', '--color-primary-100': 'var(--color-emerald-100)', '--color-primary-200': 'var(--color-emerald-200)', '--color-primary-300': 'var(--color-emerald-300)', '--color-primary-400': 'var(--color-emerald-400)', '--color-primary-500': 'var(--color-emerald-500)', '--color-primary-600': 'var(--color-emerald-600)', '--color-primary-700': 'var(--color-emerald-700)', '--color-primary-800': 'var(--color-emerald-800)', '--color-primary-900': 'var(--color-emerald-900)' };
      case 'rose': return { '--color-primary-50': 'var(--color-rose-50)', '--color-primary-100': 'var(--color-rose-100)', '--color-primary-200': 'var(--color-rose-200)', '--color-primary-300': 'var(--color-rose-300)', '--color-primary-400': 'var(--color-rose-400)', '--color-primary-500': 'var(--color-rose-500)', '--color-primary-600': 'var(--color-rose-600)', '--color-primary-700': 'var(--color-rose-700)', '--color-primary-800': 'var(--color-rose-800)', '--color-primary-900': 'var(--color-rose-900)' };
      case 'amber': return { '--color-primary-50': 'var(--color-amber-50)', '--color-primary-100': 'var(--color-amber-100)', '--color-primary-200': 'var(--color-amber-200)', '--color-primary-300': 'var(--color-amber-300)', '--color-primary-400': 'var(--color-amber-400)', '--color-primary-500': 'var(--color-amber-500)', '--color-primary-600': 'var(--color-amber-600)', '--color-primary-700': 'var(--color-amber-700)', '--color-primary-800': 'var(--color-amber-800)', '--color-primary-900': 'var(--color-amber-900)' };
      case 'violet': return { '--color-primary-50': 'var(--color-violet-50)', '--color-primary-100': 'var(--color-violet-100)', '--color-primary-200': 'var(--color-violet-200)', '--color-primary-300': 'var(--color-violet-300)', '--color-primary-400': 'var(--color-violet-400)', '--color-primary-500': 'var(--color-violet-500)', '--color-primary-600': 'var(--color-violet-600)', '--color-primary-700': 'var(--color-violet-700)', '--color-primary-800': 'var(--color-violet-800)', '--color-primary-900': 'var(--color-violet-900)' };
      case 'blue':
      default:
        return { '--color-primary-50': 'var(--color-blue-50)', '--color-primary-100': 'var(--color-blue-100)', '--color-primary-200': 'var(--color-blue-200)', '--color-primary-300': 'var(--color-blue-300)', '--color-primary-400': 'var(--color-blue-400)', '--color-primary-500': 'var(--color-blue-500)', '--color-primary-600': 'var(--color-blue-600)', '--color-primary-700': 'var(--color-blue-700)', '--color-primary-800': 'var(--color-blue-800)', '--color-primary-900': 'var(--color-blue-900)' };
    }
  }

  return (
    <div 
      className={`min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 print:block print:bg-white ${isDarkMode ? 'dark text-white' : 'text-slate-900'}`}>
      
      {/* Side navigation */}
      <div className="print:hidden shrink-0">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          pendingApprovalsCount={pendingApprovalsCount}
          pendingPayoutsCount={pendingPayoutsCount}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 print:p-0">
        
        {/* Top Header navbar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs print:hidden">
          
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs font-semibold px-2 py-1 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 rounded-md">
              Enterprise Suite 2026
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Policy Violation Indicator banner if any violations exist */}
            {requests.some(r => r.status === 'pending' && r.policyStatus === 'violation') && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 rounded-xl border border-rose-200 text-xs font-semibold animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                <span>มีรายการผิดนโยบายเฝ้าระวัง</span>
              </div>
            )}

            {/* Simulated User Role Switcher Dropdown */}
            {!(import.meta as any).env?.PROD && currentUser && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="hidden md:inline text-[10px] uppercase font-bold text-slate-400 pl-1">สิทธิ์ปัจจุบัน:</span>
                <select
                  value={currentUser.user_id}
                  onChange={(e) => {
                    const targetUser = usersList.find(u => u.user_id === e.target.value);
                    if (targetUser) {
                      setCurrentUser(targetUser);
                      localStorage.setItem('okey_simulated_user_id', targetUser.user_id);
                    }
                  }}
                  className="text-xs font-bold bg-transparent border-none text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1 py-0.5"
                >
                  {usersList.map(u => (
                    <option key={u.user_id} value={u.user_id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                      👤 {u.name} ({u.approval_level || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dark Mode toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="สลับธีมสี"
              id="theme-toggle-btn"
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => { if (!showNotifications && currentUser) setNotifications(getDbNotifications(currentUser.user_id)); setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative"
                id="noti-btn"
              >
                <Bell className="h-4.5 w-4.5" />
                {(notifications.filter(n => !n.isRead).length > 0 || pendingApprovalsCount > 0 || pendingPayoutsCount > 0) && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[9px] font-bold text-white border-2 border-white dark:border-slate-900">
                    {notifications.filter(n => !n.isRead).length + (pendingApprovalsCount > 0 ? 1 : 0) + (pendingPayoutsCount > 0 ? 1 : 0)}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary-500" />
                      การแจ้งเตือน
                    </h3>
                    <button 
                      onClick={() => {
                        if (currentUser) markAllNotificationsAsRead(currentUser.user_id);
                        if (currentUser) setNotifications(getDbNotifications(currentUser.user_id));
                      }}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" /> อ่านทั้งหมด
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {pendingApprovalsCount > 0 && (
                      <div 
                        onClick={() => { setActiveTab('approvals'); setShowNotifications(false); }}
                        className="p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors bg-primary-50/30 dark:bg-primary-900/10"
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">มีคำขอรอการอนุมัติ</p>
                            <p className="text-xs text-slate-500 mt-1">คุณมี {pendingApprovalsCount} รายการที่รอการอนุมัติ</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {pendingPayoutsCount > 0 && (
                      <div 
                        onClick={() => { setActiveTab('dashboard'); setShowNotifications(false); }}
                        className="p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors bg-emerald-50/50 dark:bg-emerald-900/10"
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">มีรายการรอสั่งจ่าย/รับคืนเงิน</p>
                            <p className="text-xs text-slate-500 mt-1">คิวอนุมัติการสั่งจ่ายเงินชดเชย {pendingPayoutsCount} รายการ</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {notifications.map(noti => (
                      <div 
                        key={noti.id}
                        onClick={() => {
                          markNotificationAsRead(noti.id);
                          if (currentUser) setNotifications(getDbNotifications(currentUser.user_id));
                          if (noti.linkToTab) setActiveTab(noti.linkToTab);
                          if (noti.requestId) {
                            const matched = requests.find(r => r.id === noti.requestId);
                            if (matched) {
                              setSelectedRequest(matched);
                            }
                          }
                          setShowNotifications(false);
                        }}
                        className={`p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${!noti.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 p-2 rounded-lg ${noti.type === 'approval' ? 'bg-emerald-100 text-emerald-600' : noti.type === 'advance' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'} dark:bg-opacity-20`}>
                            <Bell className="h-4 w-4" />
                          </div>
                          <div>
                            <p className={`text-sm ${!noti.isRead ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>{noti.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{noti.message}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{new Date(noti.createdAt).toLocaleString('th-TH')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && pendingApprovalsCount === 0 && pendingPayoutsCount === 0 && (
                      <div className="p-8 text-center text-slate-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">ไม่มีการแจ้งเตือน</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Display */}
            <div className="relative">
              <div 
                className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4 cursor-pointer hover:opacity-80 transition-all duration-200"
                onClick={() => { setActiveTab('profile'); setShowNotifications(false); }}
                id="header-profile-btn"
                title="ข้อมูลส่วนตัว (My Profile)"
              >
                <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold border-2 border-primary-200 dark:border-primary-800 shadow-sm overflow-hidden shrink-0">
                  {currentUser?.profilePictureUrl ? (
                    <img src={currentUser.profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : currentUser?.signatureUrl && currentUser.signatureUrl.startsWith('http') && currentUser.signatureUrl.includes('avatar') ? (
                    <img src={currentUser.signatureUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm tracking-wide">{currentUser?.name ? currentUser.name.substring(0, 2) : 'OK'}</span>
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{currentUser?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                    {currentUser?.approval_level || 'Level 1'} | {currentUser?.department ? currentUser.department.split(' (')[0] : 'บัญชีและการเงิน'}
                  </p>
                </div>
              </div>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 md:hidden">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser?.role || currentUser?.position}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <User className="h-4 w-4 text-primary-500" />
                      ข้อมูลส่วนตัว (My Profile)
                    </button>
                    <button
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <Key className="h-4 w-4 text-amber-500" />
                      เปลี่ยนรหัสผ่าน
                    </button>
                    <button
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <Palette className="h-4 w-4 text-indigo-500" />
                      ตั้งค่าธีม (Theme Settings)
                    </button>
                  </div>
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setCurrentUser(null);
                        setActiveTab('dashboard');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      ออกจากระบบ (Logout)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic active Tab content section with responsive padding */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-0">
          
          {/* Advance Reminders Section */}
          {currentUser && unclearedAdvances.length > 0 && (
            <div id="advance-reminder-panel" className="p-5 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 rounded-2xl shadow-md space-y-4 print:hidden">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5 shrink-0 animate-bounce" />
                <h3 className="font-extrabold text-sm md:text-base tracking-tight">
                  ⚠️ แจ้งเตือนเงินยืมทดรองจ่ายค้างชำระ (Uncleared Advance Alert)
                </h3>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                คุณมีรายการขอเบิกเงินล่วงหน้า (Advance) ที่ยังไม่ได้เคลียร์กรุณาส่งใบ Clearing จนกว่าจะเคลียร์ครบถ้วน
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unclearedAdvances.map(adv => {
                  // Calculate days outstanding
                  const diffTime = new Date().getTime() - new Date(adv.date).getTime();
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  const daysOutstanding = diffDays < 0 ? 0 : diffDays;
                  const isOverdue = daysOutstanding > 15;
                  const remBal = adv.remaining_balance !== undefined ? adv.remaining_balance : adv.amount;

                  return (
                    <div 
                      key={adv.id} 
                      id={`reminder-card-${adv.id}`}
                      className={`p-4 rounded-xl border ${
                        isOverdue 
                          ? 'bg-rose-50/55 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/50' 
                          : 'bg-white dark:bg-slate-900 border-amber-150 dark:border-amber-900/30'
                      } space-y-3 flex flex-col justify-between`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono font-black text-slate-850 dark:text-slate-200">
                            เลขที่เอกสาร: {adv.id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOverdue 
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>
                            {isOverdue ? '⚠️ เกินกำหนดส่งมอบเคลียร์' : '⏳ รอเคลียร์'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <p className="text-slate-400 text-[10px]">วันที่รับเงิน:</p>
                            <p className="font-bold text-slate-700 dark:text-slate-300">{adv.date}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[10px]">จำนวนวันค้าง:</p>
                            <p className="font-bold text-slate-700 dark:text-slate-300">{daysOutstanding} วัน</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[10px]">ยอดเบิกเดิม:</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">฿{(adv.amount || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[10px]">ยอดคงเหลือค้างเคลียร์:</p>
                            <p className="font-black text-primary-600 dark:text-primary-400">฿{(remBal || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {isOverdue && (
                          <div className="mt-2 p-2 bg-rose-100/55 dark:bg-rose-950/30 rounded-lg text-[10px] text-rose-800 dark:text-rose-400 leading-normal font-semibold">
                            🚨 รายการเกินกำหนด 15 วัน! มีการส่งข้อความแจ้งเตือนผู้ใช้งาน ({currentUser.name}), ผู้อนุมัติพิจารณา และฝ่ายบัญชีการเงินเรียบร้อยแล้ว
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button
                          id={`create-clearing-btn-${adv.id}`}
                          onClick={() => {
                            setPreselectedAdvanceId(adv.id);
                            setActiveTab('my-requests');
                            setIsCreateModalOpenDirectly(true);
                          }}
                          className="flex items-center gap-1.5 text-xs font-extrabold px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl shadow-md shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <PlusCircle size={14} className="text-black stroke-[3]" />
                          <span>สร้างใบ Clearing</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(() => {
            const isAdmin = currentUser?.approval_level === 'Administrator';
            const isLevel2Plus = isAdmin || currentUser?.approval_level === 'Level 4' || currentUser?.approval_level === 'Level 3' || currentUser?.approval_level === 'Level 2';
            
            const adminTabs = ['onboarding', 'analytics', 'policy', 'admin-panel'];
            const level2PlusTabs = ['accounting'];
            const isExecutive = currentUser?.role === 'Executive' || currentUser?.approval_level === 'Executive';
            const hasBackupAccess = isAdmin || isExecutive;
            
            let activeTabGuarded = activeTab;
            if (adminTabs.includes(activeTab) && !isAdmin) activeTabGuarded = 'dashboard';
            if (level2PlusTabs.includes(activeTab) && !isLevel2Plus) activeTabGuarded = 'dashboard';
            if (activeTab === 'backup-restore' && !hasBackupAccess) activeTabGuarded = 'dashboard';

            return (
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[400px] py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-3" />
                  <p className="text-xs text-slate-500 font-medium tracking-wide">กำลังดาวน์โหลดโมดูลและประมวลผลข้อมูลระบบ...</p>
                </div>
              }>
                {activeTabGuarded === 'dashboard' && (
                  <DashboardView 
                    requests={requests}
                    budgets={budgets}
                    setActiveTab={setActiveTab}
                    onSelectRequest={setSelectedRequest}
                    onCreateNewRequest={() => {
                      setActiveTab('my-requests');
                      setIsCreateModalOpenDirectly(true);
                    }}
                    currentUser={currentUser}
                    onUpdateRequest={saveState}
                  />
                )}

                {activeTabGuarded === 'profile' && currentUser && (
                  <MyProfileView 
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                    onRefreshData={() => {
                      loadDatabase();
                    }}
                  />
                )}

                {activeTabGuarded === 'my-requests' && currentUser && (
                  <MyRequestsView 
                    requests={requests}
                    onCreateRequest={handleCreateRequest}
                    onDeleteRequest={handleDeleteRequest}
                    onUpdateRequest={handleUpdateRequest}
                    onSelectRequest={setSelectedRequest}
                    isCreateModalOpenDirectly={isCreateModalOpenDirectly}
                    setIsCreateModalOpenDirectly={setIsCreateModalOpenDirectly}
                    currentUser={currentUser}
                    defaultAdvanceId={preselectedAdvanceId}
                  />
                )}

                {activeTabGuarded === 'approval' && currentUser && (
                  <ApprovalInboxView 
                    requests={requests}
                    onApprove={handleApproveRequest}
                    onReject={handleRejectRequest}
                    onSelectRequest={setSelectedRequest}
                    currentUser={currentUser}
                    onUpdateRequest={saveState}
                  />
                )}

                {activeTabGuarded === 'history' && currentUser && (
                  <HistoryAndReportsView 
                    requests={requests}
                    onSelectRequest={setSelectedRequest}
                    currentUser={currentUser}
                  />
                )}

                {activeTabGuarded === 'audit' && currentUser && (
                  <EnterpriseAuditLogView currentUser={currentUser} />
                )}

                {activeTabGuarded === 'analytics' && (
                  <BudgetAnalyticsView 
                    budgets={budgets}
                    requests={requests}
                    onUpdateBudgetLimit={handleUpdateBudgetLimit}
                  />
                )}

                {activeTabGuarded === 'policy' && (
                  <PolicyConfigView />
                )}

                {activeTabGuarded === 'onboarding' && currentUser && (
                  <OnboardingView 
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                    onRefreshData={() => {
                      loadDatabase();
                    }} 
                  />
                )}

                {activeTabGuarded === 'accounting' && currentUser && (
                  <AccountingLedgerView 
                    currentUser={currentUser}
                    onRefreshData={() => {
                      loadDatabase();
                    }}
                  />
                )}

                {activeTabGuarded === 'pdf-hub' && (
                  <DocumentPdfManagerView />
                )}

                {activeTabGuarded === 'gallery' && currentUser && (
                  <DocumentGalleryView currentUser={currentUser} />
                )}

                {activeTabGuarded === 'admin-panel' && (
                  <AdminConfigView 
                    currentUser={currentUser}
                    onRefreshData={() => {
                      loadDatabase();
                    }} 
                  />
                )}

                {activeTabGuarded === 'backup-restore' && currentUser && (
                  <BackupRestoreView 
                    currentUser={currentUser}
                    onRefreshData={() => {
                      loadDatabase();
                    }}
                    themeColor={themeColor}
                  />
                )}
              </React.Suspense>
            );
          })()}
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 mt-auto">
          <p>© 2026 OKAY Expense Management. สิทธิ์ระบบวิสาหกิจแบบไดนามิก.</p>
        </footer>
      </div>

      {/* Global detailed view modal */}
      {selectedRequest && (
        <RequestDetailModal 
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAddComment={handleAddComment}
          currentUser={currentUser?.name || "ผู้ใช้ระบบ"}
          onCancelRequest={handleCancelRequest}
        />
      )}

    </div>
  );
}
