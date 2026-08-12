import React, { useState, useMemo } from 'react';
import { openPdfPreview } from '../lib/pdf-preview';
import { 
  Check, 
  X, 
  AlertTriangle, 
  FileText, 
  User, 
  Calendar, 
  DollarSign,
  MessageSquare,
  ShieldCheck,
  Eye,
  GitBranch,
  FileSpreadsheet,
  Printer,
  Download,
  ExternalLink
} from 'lucide-react';
import { ExpenseRequest, UserProfile } from '../types';
import { CATEGORIES_CONFIG } from '../data/masterData';
import { getDbUsers, getRealReceiptImages, getClearingStatusInfo, addEnterpriseAuditLog, getSafePreviewUrl } from '../data/db';

interface ApprovalInboxViewProps {
  requests: ExpenseRequest[];
  onApprove: (id: string, comment?: string) => void;
  onReject: (id: string, comment: string) => void;
  onSelectRequest: (request: ExpenseRequest) => void;
  currentUser: UserProfile;
  onUpdateRequest?: (updatedRequests: ExpenseRequest[]) => void;
}

export default function ApprovalInboxView({ 
  requests, 
  onApprove, 
  onReject,
  onSelectRequest,
  currentUser,
  onUpdateRequest
}: ApprovalInboxViewProps) {
  
  const dbUsers = getDbUsers();
  
  const getUsernameById = (id?: string) => {
    if (!id) return 'สิ้นสุด';
    return dbUsers.find(u => u.user_id === id)?.name || id;
  };

  // Security check: normal user sees requests where they are current_approver
  // Admin & Super Admin are shown all pending requests for convenience
  const isAdmin = currentUser.user_id === 'user-admin' || 
                  currentUser.user_id === 'user-superadmin' || 
                  currentUser.role === 'Administrator' || 
                  currentUser.approval_level === 'Administrator' || 
                  currentUser.username === 'Okay9999';

  const [inboxTab, setInboxTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const pendingRequests = requests.filter(r => {
    if (r.status !== 'pending') return false;
    if (isAdmin) return true; // Admin gets full system inbox view
    if (!r.current_approver) return true; // Unassigned pending requests land in approver inbox
    return r.current_approver === currentUser.user_id;
  });

  const approvedRequests = requests.filter(r => {
    const s = (r.status || '').toLowerCase();
    return s === 'approved' || s === 'cleared' || s === 'paid';
  });

  const rejectedRequests = requests.filter(r => {
    const s = (r.status || '').toLowerCase();
    return s === 'rejected';
  });

  const displayRequests = useMemo(() => {
    if (inboxTab === 'pending') return pendingRequests;
    if (inboxTab === 'approved') return approvedRequests;
    if (inboxTab === 'rejected') return rejectedRequests;
    return requests.filter(r => r.status !== 'draft');
  }, [inboxTab, pendingRequests, approvedRequests, rejectedRequests, requests]);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Pre-Approval Edit States
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');

  const handleApproveSubmit = (id: string) => {
    onApprove(id, approveComment || 'ตรวจสอบเอกสารแล้ว ข้อมูลถูกต้องและผ่านการอนุมัติ');
    setApprovingId(null);
    setApproveComment('');
  };

  const handleRejectSubmit = (id: string) => {
    if (!rejectComment.trim()) {
      alert('กรุณากรอกเหตุผลที่ปฏิเสธเพื่อแจ้งแก่ผู้ส่งคำขอ');
      return;
    }
    onReject(id, rejectComment);
    setRejectingId(null);
    setRejectComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">กล่องจดหมายงานรออนุมัติ</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">ตรวจสอบและพิจารณาคำขอเบิกเงินจากสมาชิกในแผนกที่มีสิทธิ์การประเมินผล</p>
        </div>
        {displayRequests.length > 0 && (
          <button
            id="inbox-export-btn"
            onClick={async () => {
              try {
                const { exportExpenseRequestsToExcel } = await import('../utils/excelExport');
                await exportExpenseRequestsToExcel(
                  displayRequests,
                  `รายงานสรุปคิวรออนุมัติ: คุณ${currentUser.name}`,
                  currentUser.name,
                  true
                );
              } catch (err) {
                console.error('Error exporting pending queue:', err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 self-start sm:self-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Queue (.xlsx)</span>
          </button>
        )}
      </div>

      {/* Inbox Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setInboxTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            inboxTab === 'pending'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <span>⏳ งานรออนุมัติ</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full font-mono">{pendingRequests.length}</span>
        </button>

        <button
          onClick={() => setInboxTab('approved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            inboxTab === 'approved'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <span>🟢 อนุมัติแล้ว</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full font-mono">{approvedRequests.length}</span>
        </button>

        <button
          onClick={() => setInboxTab('rejected')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            inboxTab === 'rejected'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <span>🔴 ปฏิเสธแล้ว</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full font-mono">{rejectedRequests.length}</span>
        </button>

        <button
          onClick={() => setInboxTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            inboxTab === 'all'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <span>📋 คำขอทั้งหมด</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full font-mono">{requests.filter(r => r.status !== 'draft').length}</span>
        </button>
      </div>

      {displayRequests.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white">
            {inboxTab === 'pending' ? 'เยี่ยมมาก! ไม่มีงานค้างสะสม' : 'ไม่พบข้อมูลคำขอในหมวดหมู่นี้'}
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {inboxTab === 'pending' ? 'คำขอเบิกเงินทั้งหมดของพนักงานได้รับการดำเนินการครบถ้วนเรียบร้อยแล้ว' : 'ยังไม่มีคำขอที่ตรงตามเงื่อนไขตัวกรองนี้'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayRequests.map((req) => {
            const catConfig = CATEGORIES_CONFIG[req.category] || CATEGORIES_CONFIG.other;
            const isRejecting = rejectingId === req.id;
            const isApproving = approvingId === req.id;

            return (
              <div 
                key={req.id} 
                id={`approve-card-${req.id}`}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Visual Accent bar on the side depending on policy */}
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                  req.policyStatus === 'violation' ? 'bg-rose-500' :
                  req.policyStatus === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />

                {/* Card Top: Details and badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{req.id}</span>
                      <span className="text-slate-300">•</span>
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${catConfig.color}`}>
                        {catConfig.name}
                      </span>
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                        req.expense_type === 'clearing' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' :
                        req.expense_type === 'advance' ? 'bg-primary-50 text-primary-800 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800' :
                        'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                      }`}>
                        {req.expense_type === 'clearing' ? 'ใบเคลียร์เงินทดรอง (Clearing)' :
                         req.expense_type === 'advance' ? 'ใบขอเบิกล่วงหน้า (Advance)' :
                         'ใบเบิกเงินชดเชย (Reimbursement)'}
                      </span>
                      {req.expense_type === 'clearing' && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-md border border-amber-300">
                          {getClearingStatusInfo(req).label}
                        </span>
                      )}
                      {req.policyStatus === 'warning' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 rounded-md border border-amber-200">
                          <AlertTriangle className="h-3 w-3" /> เฝ้าระวังนโยบาย
                        </span>
                      )}
                      {req.policyStatus === 'violation' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 rounded-md border border-rose-200">
                          <AlertTriangle className="h-3 w-3 animate-pulse" /> ผิดนโยบายด่วน
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{req.title}</h3>
                  </div>

                  <div className="text-right sm:text-right">
                    <p className="text-xs text-slate-400">จำนวนเงินเบิกจ่าย</p>
                    <p className="text-xl font-black text-slate-950 dark:text-white">฿{(req.amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Card Middle: Subtitle meta and Policy Warnings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-3 py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-300">{req.employeeName}</p>
                      <p className="text-[10px] text-slate-400">{req.employeeRole}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-300">ส่งคำขอเมื่อ {req.date}</p>
                      <p className="text-[10px] text-slate-400">หน่วยงาน: {req.department}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-300">
                          {req.receiptName || req.receiptUrls?.length ? 'มีหลักฐานใบเสร็จครบ' : 'ไม่มีหลักฐานแนบ'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {req.receiptName || (req.receiptUrls?.length ? 'หลักฐานแนบจริงในระบบ' : 'รอนำเข้ารายละเอียดเพิ่มเติม')}
                        </p>
                      </div>
                    </div>
                    {/* Real thumbnails */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {getRealReceiptImages(req).map((imgUrl, i) => {
                        const urlStr = (imgUrl || '').toLowerCase();
                        const isPdf = urlStr.startsWith('data:application/pdf') || urlStr.includes('.pdf') || urlStr.startsWith('blob:application/pdf');
                        const isDoc = urlStr.includes('word') || urlStr.includes('msword') || urlStr.includes('.doc');
                        const isXls = urlStr.includes('excel') || urlStr.includes('spreadsheet') || urlStr.includes('.xls') || urlStr.includes('.csv');

                        if (isPdf) {
                          return (
                            <div 
                              key={i} 
                              className="relative h-10 w-10 rounded-lg overflow-hidden border border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-rose-500 hover:ring-offset-1 dark:hover:ring-offset-slate-900 transition-all text-rose-600 dark:text-rose-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(imgUrl);
                              }}
                              title="คลิกเพื่อพรีวิวไฟล์ PDF แนบ"
                            >
                              <FileText className="h-5 w-5" />
                              <span className="text-[7px] font-black uppercase tracking-wider mt-0.5">PDF</span>
                            </div>
                          );
                        } else if (isDoc) {
                          return (
                            <div 
                              key={i} 
                              className="relative h-10 w-10 rounded-lg overflow-hidden border border-blue-200 dark:border-blue-950 bg-blue-50 dark:bg-blue-950/20 flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 dark:hover:ring-offset-slate-900 transition-all text-blue-600 dark:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(imgUrl);
                              }}
                              title="คลิกเพื่อพรีวิวเอกสาร Word"
                            >
                              <FileText className="h-5 w-5" />
                              <span className="text-[7px] font-black uppercase tracking-wider mt-0.5">DOCX</span>
                            </div>
                          );
                        } else if (isXls) {
                          return (
                            <div 
                              key={i} 
                              className="relative h-10 w-10 rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-950 bg-emerald-50 dark:bg-emerald-950/20 flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-emerald-500 hover:ring-offset-1 dark:hover:ring-offset-slate-900 transition-all text-emerald-600 dark:text-emerald-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(imgUrl);
                              }}
                              title="คลิกเพื่อพรีวิวตาราง Excel/CSV"
                            >
                              <FileSpreadsheet className="h-5 w-5" />
                              <span className="text-[7px] font-black uppercase tracking-wider mt-0.5">EXCEL</span>
                            </div>
                          );
                        } else {
                          return (
                            <div 
                              key={i} 
                              className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer hover:ring-2 hover:ring-primary-500 hover:ring-offset-1 dark:hover:ring-offset-slate-900 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(imgUrl);
                              }}
                              title="คลิกเพื่อพรีวิวเอกสาร/รูปภาพ"
                            >
                              <img 
                                src={imgUrl || ''} 
                                className="h-full w-full object-cover" 
                                alt="Receipt thumbnail" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80';
                                }}
                              />
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                </div>

                {/* Detailed description and live policy report */}
                <div className="pl-3 space-y-2 text-xs">
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {req.description}
                  </p>
                  
                  {/* Dynamic Workflow Chain Status */}
                  <div className="bg-primary-50/25 dark:bg-slate-800/30 p-3 rounded-xl border border-primary-100/30 text-xs">
                    <p className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                      <GitBranch className="h-3.5 w-3.5 text-primary-500" />
                      <span>สถานะสายอนุมัติจริง (Approval Workflow Chain)</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-600 dark:text-slate-400">
                        {req.employeeName}
                      </span>
                      <span className="text-slate-300">→</span>
                      
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold rounded ring-1 ring-amber-300 dark:ring-amber-800 flex items-center gap-1">
                        ⏱️ กำลังรออนุมัติ: {getUsernameById(req.current_approver)}
                      </span>
                      
                      {req.next_approver && (
                        <>
                          <span className="text-slate-300">→</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                            คนถัดไป: {getUsernameById(req.next_approver)}
                          </span>
                        </>
                      )}
                      
                      <span className="text-slate-300">→</span>
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded font-semibold">
                        ผ่านสมบูรณ์ 💸
                      </span>
                    </div>
                  </div>
                  
                  {/* Policy rules auditing check list */}
                  <div className="bg-slate-100/40 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/40">
                    <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">ผลการตรวจสอบสิทธิ์และนโยบาย:</p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                      {req.policyNotes.map((note, idx) => (
                        <li key={idx} className={
                          req.policyStatus === 'violation' ? 'text-rose-600 dark:text-rose-400 font-medium' :
                          req.policyStatus === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }>{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Actions (Approve / Reject) */}
                <div className="pl-3 pt-2 flex flex-wrap items-center justify-between gap-4">
                  <button 
                    onClick={() => onSelectRequest(req)}
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>ตรวจสอบเอกสารแนบเต็มรูปแบบ ({req.comments.length} ความเห็น)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' ? (
                      !isRejecting && !isApproving && editingAmountId !== req.id && (
                        <>
                          <button 
                            id={`edit-trigger-${req.id}`}
                            onClick={() => {
                              setEditingAmountId(req.id);
                              setEditAmount(req.amount.toString());
                              setEditReason('');
                              setRejectingId(null);
                              setApprovingId(null);
                            }}
                            className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-amber-200 rounded-xl transition-all"
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                            <span>แก้ไขยอดเงิน</span>
                          </button>
                          <button 
                            id={`reject-trigger-${req.id}`}
                            onClick={() => {
                              setRejectingId(req.id);
                              setApprovingId(null);
                            }}
                            className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 rounded-xl transition-all"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>ปฏิเสธคำขอ</span>
                          </button>
                          <button 
                            id={`approve-trigger-${req.id}`}
                            onClick={() => {
                              setApprovingId(req.id);
                              setRejectingId(null);
                            }}
                            className="flex items-center gap-1 px-4 py-2 text-xs font-extrabold bg-green-700 hover:bg-green-600 active:bg-green-800 text-white rounded-xl shadow-md shadow-green-700/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>อนุมัติคำขอ</span>
                          </button>
                        </>
                      )
                    ) : req.status === 'approved' || req.status === 'cleared' || req.status === 'paid' ? (
                      <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>ผ่านการอนุมัติแล้ว (Approved)</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                        <X className="h-4 w-4 text-rose-600" />
                        <span>ปฏิเสธคำขอแล้ว (Rejected)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline editing interface */}
                {editingAmountId === req.id && (
                  <div className="pl-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-primary-50/10 dark:bg-primary-950/10 p-3 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary-700 dark:text-primary-400">แก้ไขยอดเงินก่อนอนุมัติ (Pre-Approval Edit Control)</span>
                      <span className="text-[10px] text-slate-400 font-semibold">เวอร์ชันปัจจุบัน: v{req.version || 1}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">ระบุจำนวนเงินใหม่ (฿) <span className="text-rose-500">*</span></label>
                        <input 
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="เช่น 1200"
                          className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-primary-600 dark:text-primary-400 font-bold"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block font-bold text-rose-700 dark:text-rose-400">เหตุผลประกอบการแก้ไข <span className="text-rose-500">*</span></label>
                        <input 
                          type="text"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="ระบุเหตุผลในการแก้ไขยอดเงิน..."
                          className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Recalculation Preview */}
                    {(() => {
                      const val = parseFloat(editAmount) || 0;
                      const diff = val - req.amount;
                      const vat = val * 0.07;
                      
                      const matchedAdvance = req.advance_id ? requests.find(r => r.id === req.advance_id) : undefined;
                      const advAmt = matchedAdvance ? (matchedAdvance.amount || 0) : 0;
                      
                      return (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                          <p className="font-bold text-slate-700 dark:text-slate-300">📊 ผลการคำนวณสิทธิ์ใหม่อัตโนมัติ (Recalculations Preview):</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                            <p>ยอดเดิม: <span className="font-mono font-bold">฿{req.amount.toLocaleString()}</span></p>
                            <p>ยอดใหม่: <span className="font-mono font-bold text-primary-600 dark:text-primary-400">฿{val.toLocaleString()}</span></p>
                            <p>ผลต่าง: <span className={`font-mono font-bold ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {diff > 0 ? `+฿${diff.toLocaleString()}` : diff < 0 ? `-฿${Math.abs(diff).toLocaleString()}` : 'คงเดิม'}
                            </span></p>
                            <p>VAT (7%): <span className="font-mono font-bold">฿{vat.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></p>
                            {req.expense_type === 'clearing' && (
                              <>
                                <p>ยอดเงินทดรอง (Advance): <span className="font-mono font-bold">฿{advAmt.toLocaleString()}</span></p>
                                <p className="col-span-2">สรุปดุลบัญชีเคลียร์: <span className={`font-bold ${val < advAmt ? 'text-amber-600' : val > advAmt ? 'text-primary-600 dark:text-primary-400' : 'text-emerald-600'}`}>
                                  {val < advAmt ? `🟠 ต้องโอนคืนบริษัท: ฿${(advAmt - val).toLocaleString()}` :
                                   val > advAmt ? `🔵 บริษัทต้องจ่ายเพิ่ม: ฿${(val - advAmt).toLocaleString()}` :
                                   '🟢 ดุลพอดีกัน'}
                                </span></p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Action buttons */}
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => {
                          const val = parseFloat(editAmount);
                          if (isNaN(val) || val <= 0) {
                            alert('กรุณากรอกจำนวนเงินใหม่ที่ถูกต้องและมากกว่าศูนย์');
                            return;
                          }
                          if (!editReason.trim()) {
                            alert('กรุณากรอกเหตุผลประกอบการแก้ไขยอดเงินคำขอ');
                            return;
                          }

                          // Recalculations and audit
                          const matchedAdvance = req.advance_id ? requests.find(r => r.id === req.advance_id) : undefined;
                          const advAmt = matchedAdvance ? (matchedAdvance.amount || 0) : 0;

                          const currentVersion = req.version || 1;
                          const beforeAmt = req.amount;
                          const afterAmt = val;

                          const revision = {
                            version: `v${currentVersion + 1}`,
                            date: new Date().toISOString().split('T')[0],
                            time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                            author: currentUser.name,
                            action: `แก้ไขยอดเงินจาก ฿${beforeAmt.toLocaleString()} เป็น ฿${afterAmt.toLocaleString()}`,
                            notes: editReason,
                            before: beforeAmt,
                            after: afterAmt
                          };

                          const updatedRevisions = [...(req.revisions || []), revision];

                          const newComment = {
                            id: `comment-edit-${Date.now()}`,
                            author: currentUser.name,
                            date: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
                            text: `[แก้ไขข้อมูลก่อนอนุมัติ] ปรับแก้จำนวนเงินจาก ฿${beforeAmt.toLocaleString()} เป็น ฿${afterAmt.toLocaleString()} เนื่องจาก: ${editReason}`
                          };

                          const updatedRequests = requests.map(r => {
                            if (r.id === req.id) {
                              const isClearing = r.expense_type === 'clearing';
                              const setType = isClearing ? (val < advAmt ? 'refund' : val > advAmt ? 'reimbursement' : 'perfect') : undefined;
                              const setAmt = isClearing ? Math.abs(val - advAmt) : undefined;
                              
                              return {
                                ...r,
                                amount: val,
                                cleared_amount: isClearing ? val : r.cleared_amount,
                                settlement_type: setType,
                                settlement_amount: setAmt,
                                version: currentVersion + 1,
                                revisions: updatedRevisions,
                                comments: [...(r.comments || []), newComment]
                              } as ExpenseRequest;
                            }
                            return r;
                          });

                          if (onUpdateRequest) {
                            onUpdateRequest(updatedRequests);
                          }

                          addEnterpriseAuditLog(
                            currentUser.user_id,
                            currentUser.name,
                            currentUser.role,
                            'EDIT',
                            `แก้ไขจำนวนเงินใบคำขอ ${req.id} (v${currentVersion} -> v${currentVersion + 1}) จาก ฿${beforeAmt.toLocaleString()} เป็น ฿${afterAmt.toLocaleString()} เหตุผล: ${editReason}`
                          );

                          setEditingAmountId(null);
                          setEditAmount('');
                          setEditReason('');
                        }}
                        className="px-4 py-2 text-xs font-extrabold bg-green-700 hover:bg-green-600 active:bg-green-800 text-white rounded-xl shadow-md shadow-green-700/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        บันทึกและคำนวณใหม่
                      </button>
                      <button 
                        onClick={() => {
                          setEditingAmountId(null);
                          setEditAmount('');
                          setEditReason('');
                        }}
                        className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl transition-all shadow-xs"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline approving interface */}
                {isApproving && (
                  <div className="pl-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">ระบุข้อความประกอบการอนุมัติ (ตัวเลือก)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={approveComment}
                        onChange={(e) => setApproveComment(e.target.value)}
                        placeholder="เช่น ข้อมูลถูกต้อง อนุมัติผ่านการจ่ายบิล"
                        className="flex-1 text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                      <button 
                        id={`approve-confirm-${req.id}`}
                        onClick={() => handleApproveSubmit(req.id)}
                        className="px-4 py-2 text-xs font-extrabold bg-green-700 hover:bg-green-600 active:bg-green-800 text-white rounded-xl shadow-md shadow-green-700/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        ยืนยันอนุมัติ
                      </button>
                      <button 
                        onClick={() => setApprovingId(null)}
                        className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl transition-all shadow-xs"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline rejecting interface */}
                {isRejecting && (
                  <div className="pl-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <label className="block text-xs font-bold text-rose-700">ชี้แจงเหตุผลการปฏิเสธคำขอเบิกเงินนี้ <span className="text-rose-500">*</span></label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        placeholder="ระบุข้อผิดพลาด เช่น บิลซ้ำซ้อน, กรุณาแนบรายงานรายชื่อพนักงานที่ร่วมรับประทานอาหาร..."
                        className="flex-1 text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-rose-500"
                      />
                      <button 
                        id={`reject-confirm-${req.id}`}
                        onClick={() => handleRejectSubmit(req.id)}
                        className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                      >
                        ส่งคืนคำขอ (ปฏิเสธ)
                      </button>
                      <button 
                        onClick={() => setRejectingId(null)}
                        className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl transition-all shadow-xs"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Full screen Lightbox Preview / Interactive PDF Viewer (No forced downloads) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative w-full max-w-4xl h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                {String(selectedImage || '').startsWith('data:application/pdf') || String(selectedImage || '').toLowerCase().includes('.pdf') || String(selectedImage || '').startsWith('blob:application/pdf') ? (
                  <FileText className="h-4 w-4 text-rose-500" />
                ) : (
                  <Eye className="h-4 w-4 text-primary-500" />
                )}
                <span>
                  {String(selectedImage || '').startsWith('data:application/pdf') || String(selectedImage || '').toLowerCase().includes('.pdf') || String(selectedImage || '').startsWith('blob:application/pdf') 
                    ? 'พรีวิวเอกสารแนบ PDF (Interactive Viewer)' 
                    : 'พรีวิวภาพถ่ายหลักฐานแนบ'}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const imgUrl = selectedImage || '';
                    const safeUrl = getSafePreviewUrl(imgUrl);
                    if (imgUrl.startsWith('data:application/pdf') || imgUrl.toLowerCase().includes('.pdf')) {
                      openPdfPreview(`
                        <html>
                          <head><title>พิมพ์เอกสารแนบ PDF</title></head>
                          <body style="margin:0;padding:0;background:#fff;">
                            <iframe src="${safeUrl}" style="width:100vw;height:100vh;border:none;"></iframe>
                          </body>
                        </html>
                      `, 'พิมพ์หลักฐานแนบ (PDF)');
                    } else {
                      openPdfPreview(`
                        <html>
                          <head>
                            <title>พิมพ์หลักฐานแนบ</title>
                            <style>
                              body { margin: 0; padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; background: #fff; }
                              img { max-width: 100%; max-height: 85vh; border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
                              .header { margin-bottom: 15px; text-align: center; }
                              h3 { margin: 0; font-size: 18px; color: #1e293b; }
                              p { margin: 4px 0 0 0; font-size: 12px; color: #64748b; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h3>หลักฐานประกอบการพิจารณาอนุมัติ</h3>
                              <p>วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}</p>
                            </div>
                            <img src="${safeUrl}" alt="หลักฐานแนบ" />
                          </body>
                        </html>
                      `, 'หลักฐานแนบ-พิจารณาอนุมัติ');
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="พิมพ์หลักฐานแนบ"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>พิมพ์หลักฐาน</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const safeUrl = getSafePreviewUrl(selectedImage || '');
                    let win: Window | null = null;
                    try {
                      win = window.open(safeUrl, '_blank');
                    } catch (e) {
                      console.warn('window.open blocked:', e);
                    }
                    if (!win) {
                      openPdfPreview(`
                        <html>
                          <head><title>หลักฐานแนบ</title></head>
                          <body style="margin:0;padding:0;background:#0f172a;display:flex;justify-content:center;align-items:center;">
                            <iframe src="${safeUrl}" style="width:100vw;height:100vh;border:none;"></iframe>
                          </body>
                        </html>
                      `, 'เอกสารหลักฐานแนบ');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="เปิดในแท็บใหม่"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>เปิดหน้าใหม่</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="text-rose-500 hover:text-white hover:bg-rose-500 dark:text-rose-400 dark:hover:text-white p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 shadow-sm font-extrabold transition-all duration-150 cursor-pointer h-9 w-9 flex items-center justify-center ml-1"
                  title="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Content pane */}
            <div className="flex-1 p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden min-h-[450px]">
              {(() => {
                const imgUrl = selectedImage || '';
                const urlLower = imgUrl.toLowerCase();
                const safeUrl = getSafePreviewUrl(imgUrl);

                const isPdf = urlLower.startsWith('data:application/pdf') || urlLower.includes('.pdf') || urlLower.startsWith('blob:application/pdf');
                const isDoc = urlLower.includes('word') || urlLower.includes('msword') || urlLower.includes('.doc');
                const isXls = urlLower.includes('excel') || urlLower.includes('spreadsheet') || urlLower.includes('.xls') || urlLower.includes('.csv');
                const isImage = urlLower.startsWith('data:image/') || urlLower.startsWith('http') || urlLower.includes('unsplash') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/.test(urlLower);

                if (isPdf) {
                  return (
                    <iframe
                      src={safeUrl}
                      className="w-full h-full min-h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      title="PDF attachment preview"
                    />
                  );
                } else if (isDoc || isXls || (!isImage && imgUrl.startsWith('data:'))) {
                  return (
                    <div className="max-w-xl w-full p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
                      <div className="mx-auto w-20 h-20 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center border border-primary-200/50">
                        {isXls ? <FileSpreadsheet className="h-10 w-10 text-emerald-600" /> : <FileText className="h-10 w-10 text-blue-600" />}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {isXls ? 'เอกสารตารางคำนวณ (Excel / CSV)' : isDoc ? 'เอกสารข้อความ (Word Document)' : 'เอกสารหลักฐานแนบ (Document File)'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          เอกสารไฟล์ต้นฉบับถูกแนบมาในระบบอย่างสมบูรณ์ ผู้อนุมัติสามารถกดเปิดอ่าน ดาวน์โหลด หรือพิมพ์ใบสรุปเอกสารได้ทันที
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <a 
                          href={safeUrl} 
                          download="attached_evidence_document"
                          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                          <span>ดาวน์โหลดเอกสาร</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            let win: Window | null = null;
                            try {
                              win = window.open(safeUrl, '_blank');
                            } catch (e) {
                              console.warn('window.open blocked:', e);
                            }
                            if (!win) {
                              openPdfPreview(`
                                <html>
                                  <head><title>เอกสารแนบ</title></head>
                                  <body style="margin:0;padding:0;background:#0f172a;display:flex;justify-content:center;align-items:center;">
                                    <iframe src="${safeUrl}" style="width:100vw;height:100vh;border:none;"></iframe>
                                  </body>
                                </html>
                              `, 'เอกสารแนบ');
                            }
                          }}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>เปิดในหน้าต่างใหม่</span>
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="max-w-full max-h-full overflow-auto flex items-center justify-center">
                      <img
                        src={safeUrl || ''}
                        className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md"
                        alt="Full size evidence"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
