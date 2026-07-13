import React, { useState, useEffect, useMemo } from 'react';
import { openPdfPreview } from '../lib/pdf-preview';
import { 
  BookOpen, 
  Receipt, 
  FileText, 
  ArrowLeftRight, 
  TrendingDown, 
  TrendingUp, 
  Check, 
  User, 
  Calendar, 
  ShieldCheck, 
  DollarSign,
  Printer,
  FileDown,
  ChevronRight,
  Info,
  Layers,
  FileCheck2,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Download
} from 'lucide-react';
import { 
  RefundRecord, 
  DeductionRecord, 
  JournalEntry, 
  AccountingDocument, 
  UserProfile 
} from '../types';
import { 
  getDbRefunds, 
  saveDbRefunds, 
  getDbDeductions, 
  saveDbDeductions, 
  getDbJournalEntries, 
  addJournalEntry, 
  getDbAccountingDocuments, 
  addAccountingDocument,
  getDbUsers,
  getDbCompanyData,
  getDbRequests,
  getRealReceiptImages
} from '../data/db';
import { CompanyLetterhead } from './CompanyLetterhead';
import { getLetterheadHtml } from '../utils/letterheadHtml';

interface AccountingLedgerViewProps {
  currentUser: UserProfile;
  onRefreshData: () => void;
}

export default function AccountingLedgerView({ currentUser, onRefreshData }: AccountingLedgerViewProps) {
  // Database tables
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [deductions, setDeductions] = useState<DeductionRecord[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [accountingDocs, setAccountingDocs] = useState<AccountingDocument[]>([]);
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);

  // Selected document for modal review (Corporate printing format)
  const [selectedDoc, setSelectedDoc] = useState<AccountingDocument | null>(null);
  const [activeAttachmentIdx, setActiveAttachmentIdx] = useState(0);
  const [zoomScale, setZoomScale] = useState(100);

  useEffect(() => {
    setActiveAttachmentIdx(0);
    setZoomScale(100);
  }, [selectedDoc]);

  const associatedRequest = useMemo(() => {
    if (!selectedDoc) return null;
    const allRequests = getDbRequests();
    let req = allRequests.find(r => r.id === selectedDoc.ref_id);
    if (!req && selectedDoc.ref_id) {
      req = allRequests.find(r => r.id.includes(selectedDoc.ref_id) || selectedDoc.ref_id.includes(r.id));
    }
    return req;
  }, [selectedDoc]);

  const getRealUploadedAttachments = (req: any): { url: string; name: string }[] => {
    if (!req) return [];
    const list: { url: string; name: string }[] = [];

    // 1. Check attachment_list
    if (req.attachment_list && req.attachment_list.length > 0) {
      req.attachment_list.forEach((file: any, idx: number) => {
        if (file.dataUrl) {
          list.push({
            url: file.dataUrl,
            name: file.name || `เอกสารแนบ_${idx + 1}.${file.type?.includes('pdf') ? 'pdf' : 'jpg'}`
          });
        }
      });
    }

    // 2. Check receiptUrls (filter out default string paths or unsplash links if they are considered mock, only keep real uploads)
    if (req.receiptUrls && req.receiptUrls.length > 0) {
      req.receiptUrls.forEach((url: string, idx: number) => {
        if (url && (url.startsWith('data:') || url.startsWith('http') || url.startsWith('/'))) {
          // If it is unsplash, it might be legacy seeded, but we can keep it if we want,
          // though the user preferred no fake placeholder URLs. Let's make sure it's kept if there are no other uploads.
          const docName = (req.receiptNames && req.receiptNames[idx]) || `ใบเสร็จ_${idx + 1}`;
          list.push({ url, name: docName });
        }
      });
    }

    // 3. Check legacy receiptUrl
    if (req.receiptUrl && (req.receiptUrl.startsWith('data:') || req.receiptUrl.startsWith('http') || req.receiptUrl.startsWith('/'))) {
      list.push({
        url: req.receiptUrl,
        name: req.receiptName || 'ใบเสร็จหลัก'
      });
    }

    // 4. Check refund proof
    if (req.refund_proof_url && (req.refund_proof_url.startsWith('data:') || req.refund_proof_url.startsWith('http') || req.refund_proof_url.startsWith('/'))) {
      list.push({
        url: req.refund_proof_url,
        name: req.refund_proof_name || 'หลักฐานโอนเงินคืน (Refund Slip)'
      });
    }

    // 5. Check reimbursement proof
    if (req.reimbursement_proof_url && (req.reimbursement_proof_url.startsWith('data:') || req.reimbursement_proof_url.startsWith('http') || req.reimbursement_proof_url.startsWith('/'))) {
      list.push({
        url: req.reimbursement_proof_url,
        name: req.reimbursement_proof_name || 'หลักฐานโอนเงินชดเชย (Reimbursement Slip)'
      });
    }

    // 6. Check company reimbursement proof
    if (req.company_reimbursement_proof_url && (req.company_reimbursement_proof_url.startsWith('data:') || req.company_reimbursement_proof_url.startsWith('http') || req.company_reimbursement_proof_url.startsWith('/'))) {
      list.push({
        url: req.company_reimbursement_proof_url,
        name: req.company_reimbursement_proof_name || 'หลักฐานโอนเงินจากบริษัท'
      });
    }

    return list;
  };

  const attachments = useMemo(() => {
    return getRealUploadedAttachments(associatedRequest);
  }, [associatedRequest]);

  // Stats
  const [debitTotal, setDebitTotal] = useState(0);
  const [creditTotal, setCreditTotal] = useState(0);

  // Tab state within accounting
  const [activeSubTab, setActiveSubTab] = useState<'clearing' | 'vouchers' | 'journal'>('clearing');

  // Handle Esc key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDoc(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Load from local DB
  const loadFinancials = () => {
    const listRefunds = getDbRefunds();
    const listDeductions = getDbDeductions();
    const listJournals = getDbJournalEntries();
    const listDocs = getDbAccountingDocuments();
    const users = getDbUsers();
    const comp = getDbCompanyData();

    setRefunds(listRefunds);
    setDeductions(listDeductions);
    setJournalEntries(listJournals);
    setAccountingDocs(listDocs);
    setDbUsers(users);
    setCompanyData(comp);

    // Calculate totals
    const totDebit = listJournals.reduce((acc, curr) => acc + curr.amount, 0);
    setDebitTotal(totDebit);
    setCreditTotal(totDebit); // Double entry is always balanced
  };

  useEffect(() => {
    loadFinancials();
  }, []);

  const getUserNameById = (id?: string) => {
    if (!id) return 'ไม่ระบุ';
    return dbUsers.find(u => u.user_id === id)?.name || id;
  };

  const handlePrintTable = () => {
    window.print();
  };

  const handlePrintVoucher = (doc: AccountingDocument, action: 'print' | 'pdf' = 'print') => {
    if (!doc) return;
    const printWindow: any = {
      document: {
        write: (html: string) => { printWindow._html = (printWindow._html || '') + html; },
        close: () => { openPdfPreview(printWindow._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
    

    // Resolve associated request if any
    let req = associatedRequest;
    if (!req) {
      const allRequests = getDbRequests();
      req = allRequests.find(r => r.id === doc.ref_id) || null;
      if (!req && doc.ref_id) {
        req = allRequests.find(r => r.id.includes(doc.ref_id) || doc.ref_id.includes(r.id)) || null;
      }
    }

    const companyLogo = companyData?.logoUrl || '/src/assets/images/corporate_logo_minimalist_1783570910802.jpg';
    const companyName = companyData?.companyName || 'O-KEY EXPENSE MANAGEMENT CO., LTD.';
    const companyAddress = companyData?.address || '99/9 Rama IX Road, Huai Khwang, Bangkok 10310';
    const companyTaxId = companyData?.taxId || '0-1055-66000-11-2';
    const companyPhone = companyData?.phone || '02-123-4567';
    const companyEmail = companyData?.email || 'finance@okay.com';

    const typeLabelTh = {
      expense_voucher: 'ใบสำคัญค่าใช้จ่าย (Payment Voucher)',
      advance_payment_voucher: 'ใบสำคัญจ่ายเงินทดรองล่วงหน้า (Advance Payment Voucher)',
      refund_receipt: 'ใบเสร็จรับคืนเงินสด (Cash Refund Receipt)',
      deduction_notice: 'ใบแจ้งหักบัญชีเงินเดือน (Salary Deduction Notice)',
      reimbursement_voucher: 'ใบสำคัญจ่ายชดใช้เงินส่วนต่าง (Reimbursement Voucher)'
    }[doc.doc_type] || 'ใบสำคัญทางบัญชี (Accounting Document)';

    // Dynamic Signatures mapping
    const requesterName = req?.employeeName || doc.requester_name;
    const requesterUser = dbUsers.find(u => u.name === requesterName || u.name.includes(requesterName));
    const requesterSig = requesterUser?.signatureUrl;

    const requesterRole = requesterUser?.role || req?.employeeRole || 'พนักงาน';
    const department = requesterUser?.department || req?.department || doc.department || 'สำนักงานส่วนกลาง';

    const auditorUser = dbUsers.find(u => u.name.includes('สิรินธร') || u.name === doc.approved_by);
    const auditorSig = auditorUser?.signatureUrl;
    const auditorName = auditorUser?.name || doc.approved_by || 'สิรินธร รัตนสกุล (CFO)';

    const approvedSteps = req?.approvalHistory?.filter((step: any) => step.status === 'approved' || step.status === 'Approved') || [];
    const finalApproverStep = approvedSteps[approvedSteps.length - 1] || null;
    const approverName = finalApproverStep ? finalApproverStep.approverName : (doc.approved_by || 'สิรินธร รัตนสกุล (CFO)');
    const approverUser = dbUsers.find(u => u.name === approverName || u.name.includes(approverName));
    const approverSig = approverUser?.signatureUrl;

    const receiverSig = ['expense_voucher', 'reimbursement_voucher', 'advance_payment_voucher'].includes(doc.doc_type) ? requesterSig : auditorSig;
    const receiverName = ['expense_voucher', 'reimbursement_voucher', 'advance_payment_voucher'].includes(doc.doc_type) ? requesterName : auditorName;

    const receiverUser = dbUsers.find(u => u.name === receiverName || u.name.includes(receiverName));
    const receiverRole = receiverUser?.role || (['expense_voucher', 'reimbursement_voucher', 'advance_payment_voucher'].includes(doc.doc_type) ? requesterRole : 'CFO / Financial Controller');
    const auditorRole = auditorUser?.role || 'CFO / Financial Controller';
    const approverRole = approverUser?.role || 'CEO / Board Director';

    // Helper to render HTML signatures safely
    const renderHtmlSig = (sigUrl?: string) => {
      if (sigUrl && (sigUrl.startsWith('data:') || sigUrl.startsWith('http') || sigUrl.startsWith('/'))) {
        return `<img src="${sigUrl}" style="height: 35px; max-width: 90%; object-fit: contain; margin: 4px auto; display: block;" alt="Signature" />`;
      }
      return `<div style="height: 35px; border-bottom: 1px dotted #cbd5e1; margin: 10px auto 4px auto; width: 80%;"></div>`;
    };

    // Attachments
    let allAttachments: { url: string; name: string }[] = [];
    if (req) {
      allAttachments = getRealUploadedAttachments(req);
    }

    const pdfAttachmentsHtml = allAttachments.length > 0 ? allAttachments.map((attach, idx) => `
      <div style="break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #ffffff; text-align: center; margin-top: 15px;">
        <p style="font-weight: bold; font-size: 11px; color: #475569; margin: 0 0 8px 0;">
          ${attach.name}
        </p>
        <img src="${attach.url}" style="max-height: 500px; max-width: 100%; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0;" alt="evidence attachment" />
      </div>
    `).join('') : `
      <div style="border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px; text-align: center; color: #94a3b8; font-weight: bold; font-size: 14px; margin-top: 15px;">
        ไม่พบเอกสารแนบ
      </div>
    `;

    // Approval history if any
    let approvalStepsHtml = '';
    if (req && req.approvalHistory && req.approvalHistory.length > 0) {
      approvalStepsHtml = req.approvalHistory.map((step: any, idx: number) => {
        const matchingUser = dbUsers.find(u => u.name === step.approverName || u.name.includes(step.approverName));
        const userSig = matchingUser?.signatureUrl;
        const isApproved = step.status === 'approved' || step.status === 'Approved';
        
        if (isApproved) {
          const sigBlock = userSig && (userSig.startsWith('data:') || userSig.startsWith('http') || userSig.startsWith('/'))
            ? `<img src="${userSig}" style="height: 35px; max-width: 90%; object-fit: contain; margin: 4px auto; display: block;" alt="Signature" />`
            : `<div style="height: 35px; border-bottom: 1px dotted #cbd5e1; margin: 4px auto; width: 80%;"></div>`;
          return `
            <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px; box-sizing: border-box; min-width: 120px; max-width: 180px;">
              <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 9px; text-transform: uppercase;">${step.approverRole || `ผู้อนุมัติระดับที่ ${idx + 1}`}</p>
              ${sigBlock}
              <div>
                <p style="font-weight: 600; margin: 4px 0 2px 0; font-size: 10px; color: #1e293b;">${step.approverName}</p>
                <p style="color: #10b981; font-weight: bold; margin: 0; font-size: 8px;">✓ APPROVED</p>
                <p style="color: #94a3b8; font-size: 8px; margin: 2px 0 0 0;">${step.date || doc.date}</p>
              </div>
            </div>
          `;
        }
        return '';
      }).filter(Boolean).join('<div style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: 0 5px;">➔</div>');
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${doc.doc_id} - ${typeLabelTh}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
            body {
              font-family: 'Sarabun', sans-serif;
              margin: 0;
              padding: 30px;
              color: #1e293b;
              background: #ffffff;
              font-size: 12px;
              line-height: 1.5;
            }
            .container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 30px;
              box-sizing: border-box;
              background: #ffffff;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #0f172a;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .company-info {
              display: flex;
              gap: 15px;
              align-items: center;
            }
            .company-logo {
              height: 60px;
              width: 60px;
              border-radius: 8px;
              object-fit: cover;
              border: 1px solid #e2e8f0;
            }
            .company-details h1 {
              font-size: 16px;
              font-weight: 700;
              margin: 0;
              color: #0f172a;
              text-transform: uppercase;
            }
            .company-details p {
              font-size: 10px;
              color: #475569;
              margin: 2px 0;
            }
            .doc-meta {
              text-align: right;
            }
            .doc-badge {
              background-color: #0f172a;
              color: #ffffff;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              display: inline-block;
            }
            .doc-meta-item {
              margin-top: 8px;
              font-size: 10px;
            }
            .doc-meta-item span {
              font-weight: 700;
              color: #0f172a;
            }
            .doc-title-container {
              text-align: center;
              background-color: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 10px;
              border-radius: 6px;
              margin-bottom: 20px;
            }
            .doc-title-container h2 {
              font-size: 14px;
              font-weight: 700;
              margin: 0;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 12px;
              background: #fafafa;
              border: 1px solid #e2e8f0;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .info-item {
              font-size: 11px;
            }
            .info-item .label {
              color: #64748b;
              font-weight: 600;
              margin-bottom: 2px;
            }
            .info-item .val {
              font-weight: 700;
              color: #0f172a;
            }
            .table-container {
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th {
              background-color: #0f172a;
              color: #ffffff;
              font-weight: 600;
              text-align: left;
              padding: 10px;
              font-size: 11px;
            }
            td {
              padding: 12px 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .total-row {
              background-color: #f8fafc;
              font-weight: 700;
            }
            .total-row td {
              border-top: 2px solid #0f172a;
              border-bottom: 2px double #0f172a;
              font-size: 12px;
              color: #0f172a;
            }
            .signatures-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-top: 30px;
              border-top: 2px solid #0f172a;
              padding-top: 20px;
            }
            .signature-box {
              border: 1.5px solid #cbd5e1;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              font-size: 10px;
              background: #f8fafc;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              min-height: 145px;
              box-sizing: border-box;
            }
            .signature-box .title {
              font-weight: 700;
              color: #334155;
              font-size: 11px;
              margin: 0 0 6px 0;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 6px;
              text-transform: uppercase;
            }
            .signature-box img {
              height: 40px;
              max-width: 90%;
              object-fit: contain;
              margin: 4px auto;
              display: block;
            }
            .signature-box .signer {
              font-weight: 700;
              color: #0f172a;
              margin: 4px 0 2px 0;
              font-size: 10px;
            }
            .signature-box .role {
              color: #475569;
              font-weight: 500;
              font-size: 9px;
              margin: 2px 0;
            }
            .signature-box .date {
              color: #64748b;
              font-size: 8.5px;
              margin: 2px 0;
            }
            .signature-box .status {
              font-size: 8px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 4px;
              display: inline-block;
              margin-top: 4px;
              text-transform: uppercase;
            }
            .signature-box .status.success {
              background-color: #d1fae5;
              color: #065f46;
              border: 1px solid #a7f3d0;
            }
            .signature-box .status.info {
              background-color: #e0f2fe;
              color: #0369a1;
              border: 1px solid #bae6fd;
            }
            @media print {
              .signatures-grid {
                display: grid !important;
                grid-template-columns: repeat(4, 1fr) !important;
                gap: 10px !important;
                border-top: 2px solid #0f172a !important;
                break-inside: avoid;
              }
              .signature-box {
                min-height: 145px !important;
                border: 1.5px solid #cbd5e1 !important;
                background-color: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                break-inside: avoid;
              }
            }
            .attachments-header {
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
              margin: 30px 0 10px 0;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 5px;
              break-before: page;
            }
            @media print {
              body {
                padding: 0;
                background: none;
              }
              .container {
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
              }
              .no-print {
                display: none !important;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            ${getLetterheadHtml(companyData, '#1e3a8a', `
              <span class="doc-badge" style="background-color: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">Official Copy</span>
              <div style="margin-top: 5px; font-size: 10px; font-weight: bold; font-family: monospace;">เลขที่เอกสาร / Doc No: <br/><span style="color: #1e3a8a;">${doc.doc_id}</span></div>
              <div style="margin-top: 3px; font-size: 9px; color: #475569;">วันที่ / Date: <br/><span>${doc.date}</span></div>
            `)}

            <!-- Document Title -->
            <div class="doc-title-container">
              <h2>${typeLabelTh}</h2>
            </div>

            <!-- Info Grid -->
            <div class="info-grid">
              <div class="info-item">
                <div class="label">ผู้ขอเบิก / ผู้รับเงิน / ผู้คืนเงิน (Requester/Receiver):</div>
                <div class="val">${requesterName} (${requesterRole})</div>
              </div>
              <div class="info-item">
                <div class="label">แผนกงาน (Department):</div>
                <div class="val">${department}</div>
              </div>
              <div class="info-item" style="grid-column: span 2; margin-top: 5px;">
                <div class="label">เลขอ้างอิงระบบขอเบิกต้นทาง (System Reference ID):</div>
                <div class="val" style="font-family: monospace; font-size: 11px;">${doc.ref_id}</div>
              </div>
            </div>

            <!-- Particulars table -->
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th style="width: 10%;">ลำดับ (No.)</th>
                    <th style="width: 65%;">คำอธิบายรายการ (Description / Particulars)</th>
                    <th style="width: 25%; text-align: right;">จำนวนเงิน (Amount Thb)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-center">1</td>
                    <td>
                      <strong>${doc.details}</strong>
                      <div style="font-size: 10px; color: #64748b; margin-top: 4px;">อ้างอิงธุรกรรมการเงินและงบประมาณสะสมตามสารบบจัดซื้อและเบิกจ่าย</div>
                      ${req?.description ? `<div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${req.description}</div>` : ''}
                    </td>
                    <td class="text-right" style="font-weight: 600;">
                      ฿${((req?.amount || doc.amount) - (req?.vat_amount || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  ${req?.has_vat && req?.vat_amount ? `
                  <tr style="background-color: #fafafa;">
                    <td></td>
                    <td class="text-right" style="color: #64748b; font-size: 10px;">จำนวนเงินก่อนภาษี (Net Amount):</td>
                    <td class="text-right" style="font-family: monospace; color: #64748b; font-size: 10px;">
                      ฿${(req.amount - req.vat_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style="background-color: #fafafa;">
                    <td></td>
                    <td class="text-right" style="color: #4f46e5; font-size: 10px; font-weight: 600;">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
                    <td class="text-right" style="font-family: monospace; color: #4f46e5; font-size: 10px; font-weight: 600;">
                      ฿${req.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  ` : ''}

                  <!-- Spacer rows to give a realistic voucher look -->
                  <tr>
                    <td class="text-center" style="color: #cbd5e1;">-</td>
                    <td style="color: #cbd5e1; font-style: italic;">*** ไม่มีรายการเพิ่มเติม ***</td>
                    <td class="text-right" style="color: #cbd5e1;">-</td>
                  </tr>
                  <tr class="total-row">
                    <td></td>
                    <td class="text-right">จำนวนเงินสุทธิทั้งสิ้น (Net Approved Amount):</td>
                    <td class="text-right">
                      ฿${(doc.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Real Approval Chain Signatures (if available) -->
            ${approvalStepsHtml ? `
              <div style="margin-top: 25px;">
                <span style="font-size: 10px; font-weight: bold; color: #475569; text-transform: uppercase; tracking-wider; display: block; margin-bottom: 8px;">สายการอนุมัติจริงตามระบบนิเวศการเงิน (Corporate Approval Chain):</span>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                  ${approvalStepsHtml}
                </div>
              </div>
            ` : ''}

            <!-- Standard Accounting Signature Box -->
            <div class="signatures-grid">
              <div class="signature-box">
                <span class="title">ผู้จัดทำ (Preparer)</span>
                ${renderHtmlSig(requesterSig)}
                <div>
                  <p class="signer">${requesterName}</p>
                  <p class="role">ตำแหน่ง: ${requesterRole}</p>
                  <p class="date">วันที่: ${doc.date}</p>
                  <div><span class="status info">Prepared (ออนไลน์)</span></div>
                </div>
              </div>
              <div class="signature-box">
                <span class="title">ผู้ตรวจสอบ (Auditor)</span>
                ${renderHtmlSig(auditorSig)}
                <div>
                  <p class="signer">${auditorName}</p>
                  <p class="role">ตำแหน่ง: ${auditorRole}</p>
                  <p class="date">วันที่: ${doc.date}</p>
                  <div><span class="status info">Verified (ตรวจสอบแล้ว)</span></div>
                </div>
              </div>
              <div class="signature-box">
                <span class="title">ผู้อนุมัติจ่าย (Approver)</span>
                ${renderHtmlSig(approverSig)}
                <div>
                  <p class="signer">${approverName}</p>
                  <p class="role">ตำแหน่ง: ${approverRole}</p>
                  <p class="date">วันที่: ${finalApproverStep?.date || doc.date}</p>
                  <div><span class="status success">✓ Electronic Signed</span></div>
                </div>
              </div>
              <div class="signature-box">
                <span class="title">ผู้รับเงิน (Receiver)</span>
                ${renderHtmlSig(receiverSig)}
                <div>
                  <p class="signer">${receiverName}</p>
                  <p class="role">ตำแหน่ง: ${receiverRole}</p>
                  <p class="date">วันที่: ${doc.date}</p>
                  <div><span class="status success">Paid (รับเงินเสร็จสิ้น)</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Evidence attachments block -->
          ${pdfAttachmentsHtml ? `
            <div class="container" style="margin-top: 30px; page-break-before: always;">
              <div class="attachments-header">
                ภาพเอกสารหลักฐานจริงประกอบใบสำคัญ (Attached Receipts & Evidence)
              </div>
              <div style="display: grid; grid-template-cols: 1fr; gap: 15px;">
                ${pdfAttachmentsHtml}
              </div>
            </div>
          ` : ''}

          ${action === 'pdf' ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>' : ''}
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                ${action === 'print' ? 'window.print();' : `
                  if (typeof html2pdf !== 'undefined') {
                    try {
                      const element = document.body;
                      const opt = {
                        margin:       0.2,
                        filename:     '${doc.doc_id}.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { 
                          scale: 2, 
                          useCORS: true,
                          onclone: (clonedDoc) => {
                            const oklchToRgb = (l, c, h, a = 1) => {
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

                              const f = (x) => {
                                return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
                              };

                              const r = Math.max(0, Math.min(255, Math.round(f(r_l) * 255)));
                              const g = Math.max(0, Math.min(255, Math.round(f(g_l) * 255)));
                              const b = Math.max(0, Math.min(255, Math.round(f(b_l) * 255)));

                              return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
                            };

                            const parseAndConvertOklch = (colorStr) => {
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

                            const findOklchSubstring = (str) => {
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

                            const convertColor = (colorStr) => {
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

                            const replaceColorFunctions = (cssText) => {
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

                            // Sanitize elements
                            const sanitizeElement = (el) => {
                              const style = window.getComputedStyle(el);
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
                            };

                            sanitizeElement(clonedDoc.body);
                            const allEl = clonedDoc.querySelectorAll('*');
                            for (let i = 0; i < allEl.length; i++) {
                              sanitizeElement(allEl[i]);
                            }

                            // Sanitize stylesheets
                            try {
                              const newStyle = clonedDoc.createElement('style');
                              let combinedCss = '';
                              for (let i = 0; i < clonedDoc.styleSheets.length; i++) {
                                const sheet = clonedDoc.styleSheets[i];
                                try {
                                  if (sheet.href && !sheet.href.startsWith(window.location.origin)) continue;
                                  const rules = sheet.cssRules || sheet.rules;
                                  if (!rules) continue;
                                  for (let j = 0; j < rules.length; j++) {
                                    combinedCss += rules[j].cssText + '\\n';
                                  }
                                } catch (e) {}
                              }
                              if (combinedCss) {
                                newStyle.innerHTML = replaceColorFunctions(combinedCss);
                                for (let i = clonedDoc.styleSheets.length - 1; i >= 0; i--) {
                                  const sheet = clonedDoc.styleSheets[i];
                                  if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
                                    sheet.disabled = true;
                                    if (sheet.ownerNode && sheet.ownerNode.parentNode) {
                                      sheet.ownerNode.parentNode.removeChild(sheet.ownerNode);
                                    }
                                  }
                                }
                                clonedDoc.head.appendChild(newStyle);
                              }
                            } catch (err) {}
                          }
                        },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                      };
                      html2pdf().set(opt).from(element).save().then(() => {
                        setTimeout(() => window.close(), 1000);
                      }).catch(err => {
                        alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + err.message);
                      });
                    } catch (err) {
                      alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + err.message);
                    }
                  } else {
                    alert('ไม่สามารถโหลดไลบรารีสร้าง PDF ได้ กรุณาลองใหม่อีกครั้ง');
                  }
                `}
              }, 800);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- ACTIONS ---

  // Finance approves an Auto-Refund (unused advance returned)
  const handleApproveRefund = (refundId: string) => {
    const dbRefunds = getDbRefunds();
    const targetIdx = dbRefunds.findIndex(r => r.refund_id === refundId);
    if (targetIdx === -1) return;

    dbRefunds[targetIdx].status = 'refunded';
    dbRefunds[targetIdx].approved_by = currentUser.user_id;
    saveDbRefunds(dbRefunds);

    const ref = dbRefunds[targetIdx];

    // 1. Generate Accounting Document (Refund Receipt)
    const refundDoc = addAccountingDocument(
      'refund_receipt',
      ref.refund_id,
      'ระบบคืนเงินอัตโนมัติ (ERP Auto-Refund)',
      'การเงินส่วนกลาง (Finance)',
      `รับคืนเงินเหลือจ่ายจากการเคลียร์เงินล่วงหน้า (Reference Advance ID: ${ref.advance_id})`,
      ref.amount,
      currentUser.name
    );

    // 2. Generate Journal Entry
    // Debit: Cash/Bank (111100) - Receive cash back
    // Credit: Employee Advance Receivable (115200) - Clear receivable asset
    addJournalEntry(
      'refund',
      ref.refund_id,
      '111100 - เงินสดและรายการเทียบเท่าเงินสด (Cash/Bank)',
      '115200 - ลูกหนี้เงินทดรองพนักงาน (Employee Advance Receivable)',
      ref.amount,
      `รับคืนเงินสดย่อยคงเหลืออ้างอิงใบเบิกทดรอง ${ref.advance_id} (คืนเงินสดเข้ากองกลาง)`
    );

    // 3. Update parent ExpenseRequest status to 'refunded'
    const requests = JSON.parse(localStorage.getItem('okey_requests') || '[]');
    const matchedIdx = requests.findIndex((r: any) => r.id === ref.advance_id || (r.expense_type === 'clearing' && r.advance_id === ref.advance_id));
    if (matchedIdx !== -1) {
      requests[matchedIdx].status = 'refunded';
      localStorage.setItem('okey_requests', JSON.stringify(requests));
    }

    loadFinancials();
    onRefreshData();
  };

  // Finance converts an overdue refund to a Payroll Deduction (employee owes company)
  const handleConvertRefundToDeduction = (refundId: string) => {
    const dbRefunds = getDbRefunds();
    const targetIdx = dbRefunds.findIndex(r => r.refund_id === refundId);
    if (targetIdx === -1) return;

    dbRefunds[targetIdx].status = 'payroll_deduction';
    dbRefunds[targetIdx].approved_by = currentUser.user_id;
    saveDbRefunds(dbRefunds);

    const ref = dbRefunds[targetIdx];

    // Get parent request information
    const requests = JSON.parse(localStorage.getItem('okey_requests') || '[]');
    const matchedReq = requests.find((r: any) => r.id === ref.advance_id || (r.expense_type === 'clearing' && r.advance_id === ref.advance_id));
    const requesterName = matchedReq ? matchedReq.employeeName : 'พนักงาน';

    // 1. Generate Accounting Document (Deduction Notice)
    addAccountingDocument(
      'deduction_notice',
      ref.refund_id,
      requesterName,
      'บุคคลและเงินเดือน (Payroll & HR)',
      `แจ้งหักเงินเดือนเนื่องจากไม่ได้คืนยอดคงเหลือเงินทดรองจ่าย (Reference Advance ID: ${ref.advance_id})`,
      ref.amount,
      currentUser.name
    );

    // 2. Generate Journal Entry
    // Debit: Accrued Payroll (212100)
    // Credit: Employee Advance Receivable (115200)
    addJournalEntry(
      'deduction',
      ref.refund_id,
      '212100 - ค่าแรงและเงินเดือนค้างจ่าย (Accrued Payroll)',
      '115200 - ลูกหนี้เงินทดรองพนักงาน (Employee Advance Receivable)',
      ref.amount,
      `หักยอดหนี้ค้างคืนเงินยืมทดรอง ผ่านระบบหักเงินเดือนพนักงาน ${requesterName}`
    );

    // 3. Update parent ExpenseRequest status to 'payroll_deduction'
    if (matchedReq) {
      const reqIdx = requests.findIndex((r: any) => r.id === matchedReq.id);
      if (reqIdx !== -1) {
        requests[reqIdx].status = 'payroll_deduction';
        requests[reqIdx].settlement_type = 'payroll_deduction';
        localStorage.setItem('okey_requests', JSON.stringify(requests));
      }
    }

    loadFinancials();
    onRefreshData();
  };

  // Finance approves Salary Deduction / Invoice Payment
  const handleApproveDeduction = (deductionId: string) => {
    const dbDeds = getDbDeductions();
    const targetIdx = dbDeds.findIndex(d => d.deduction_id === deductionId);
    if (targetIdx === -1) return;

    dbDeds[targetIdx].status = 'deducted';
    dbDeds[targetIdx].approved_by = currentUser.user_id;
    saveDbDeductions(dbDeds);

    const ded = dbDeds[targetIdx];
    const requesterName = getUserNameById(ded.user_id);

    // 1. Generate Accounting Document (Deduction Notice)
    addAccountingDocument(
      'deduction_notice',
      ded.deduction_id,
      requesterName,
      'บุคคลและเงินเดือน (Payroll & HR)',
      `แจ้งสลิปหักเงินเดือนเนื่องจากใช้ค่าใช้จ่ายเกินวงเงินเบิกทดรอง (Settlement Over-spent)`,
      ded.amount,
      currentUser.name
    );

    // 2. Generate Journal Entry
    // Debit: Accrued Payroll/Salary (212100) or Account Receivable - Employee (115200)
    // Credit: Employee Advance Receivable (115200)
    addJournalEntry(
      'deduction',
      ded.deduction_id,
      '212100 - ค่าแรงและเงินเดือนค้างจ่าย (Accrued Payroll)',
      '115200 - ลูกหนี้เงินทดรองพนักงาน (Employee Advance Receivable)',
      ded.amount,
      `หักยอดเงินส่วนต่างใช้งานเกินทดรอง ผ่านระบบหักเงินเดือนพนักงาน ${requesterName}`
    );

    // 3. Update request status to 'deducted'
    const requests = JSON.parse(localStorage.getItem('okey_requests') || '[]');
    const matchedIdx = requests.findIndex((r: any) => r.created_by === ded.user_id && r.status === 'pending_deduction');
    if (matchedIdx !== -1) {
      requests[matchedIdx].status = 'deducted';
      localStorage.setItem('okey_requests', JSON.stringify(requests));
    }

    loadFinancials();
    onRefreshData();
  };

  return (
    <>
      <div className={`space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 ${selectedDoc ? 'print:hidden' : ''}`} id="ledger-root">
        
        {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden print:hidden">
        <div className="absolute left-0 top-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-2">
          <span className="bg-primary-900/40 text-primary-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-primary-800/40">
            ระบบผ่านการบัญชีอัตโนมัติ (Automated Journal Entry & Voucher Engine)
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 mt-2">
            <BookOpen className="h-7 w-7 text-primary-500" />
            <span>สมุดบัญชีแยกประเภท & เอกสารการเงิน</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            เมื่อรายการเบิกทดรองจ่าย (Advance) เคลียร์ยอดเสร็จสิ้น ระบบ ERP จะประมวลผลความต่างและประทับตราอนุมัติคืนเงิน/หักเงินเดือนอัตโนมัติ พร้อมสร้างสมุดบัญชีคู่ (Double-entry Journal Entries) และใบสำคัญจ่ายคู่ขนาน
          </p>
        </div>

        {/* Dashboard Balances */}
        <div className="grid grid-cols-2 gap-4 shrink-0 w-full md:w-auto">
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">เดบิตรวม (Total Debit)</span>
            <span className="text-sm font-mono font-bold text-primary-400">฿{debitTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">เครดิตรวม (Total Credit)</span>
            <span className="text-sm font-mono font-bold text-emerald-400">฿{creditTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 print:hidden">
        <button
          onClick={() => setActiveSubTab('clearing')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'clearing'
              ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>การจัดการเคลียร์ส่วนต่าง (Refunds & Deductions)</span>
          {(refunds.filter(r => r.status === 'pending').length + deductions.filter(d => d.status === 'pending').length) > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
              {refunds.filter(r => r.status === 'pending').length + deductions.filter(d => d.status === 'pending').length} งาน
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('vouchers')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'vouchers'
              ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>ใบสำคัญและเอกสารบัญชี (Vouchers & Receipts)</span>
          {accountingDocs.length > 0 && (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
              {accountingDocs.length} ฉบับ
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('journal')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'journal'
              ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>ผ่านรายการสมุดรายวันคู่ (General Journal Ledger)</span>
        </button>
      </div>

      {/* VIEW CONTENTS */}

      {activeSubTab === 'clearing' && (
        <div className="space-y-6 print:space-y-4 print:p-0">
          <div className="flex justify-end gap-2 print:hidden no-print">
            <button
              onClick={handlePrintTable}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>พิมพ์ตารางนี้ (Print Sheet)</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const { exportAccountingLedgerToExcel } = await import('../utils/excelExport');
                  await exportAccountingLedgerToExcel(journalEntries, 'Accounting Ledger Report', currentUser.name);
                } catch (err) {
                  console.error('Error exporting accounting ledger:', err);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-bold transition-all shadow-sm border border-green-200"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
          
          <div className="hidden print:block mb-6">
            <CompanyLetterhead 
              companyData={companyData} 
              primaryColor="#1e3a8a" 
              rightContent={
                <div className="text-right shrink-0">
                  <h2 className="text-sm font-bold text-slate-900">Clearing & Refunds Sheet</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Print Date: {new Date().toLocaleDateString('th-TH')}</p>
                </div>
              }
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block print:space-y-6">
          
          {/* Refunds Panel (Unused Advance - Spent < Advance) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="h-4.5 w-4.5 text-amber-500 print:hidden" />
                <span className="print:text-black">รายการคืนเงินบริษัท (Employee Refunds & Deductions)</span>
              </h2>
              <span className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded font-extrabold uppercase print:bg-white print:text-black print:border print:border-slate-300">
                Spent &lt; Advance
              </span>
            </div>

            {refunds.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่มีรายการค้างคืนเงินสดในขณะนี้
              </div>
            ) : (
              <div className="space-y-3">
                {refunds.map(ref => (
                  <div key={ref.refund_id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/40 dark:border-slate-800 flex flex-col justify-between gap-3 print:bg-white print:border-slate-300 print:p-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold print:text-black">{ref.refund_id}</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black">เหลือจ่ายจากคำขอเคลียร์เงินทดรอง (ยืมเกินใช้จริง)</p>
                        <p className="text-[10px] text-slate-400 print:text-slate-600">รหัสยืมอ้างอิง: <span className="font-mono">{ref.advance_id}</span></p>
                        <p className="text-[10px] text-slate-400 print:text-slate-600">วันที่สร้าง: {ref.date}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-extrabold text-amber-600 dark:text-amber-500 block print:text-black">
                          ฿{ref.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="mt-1">
                          {ref.status === 'payroll_deduction' ? (
                            <span className="inline-block text-[9px] bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold ring-1 ring-rose-200">
                              🔴 Payroll Deduction
                            </span>
                          ) : ref.status === 'pending' ? (
                            <span className="inline-block text-[9px] bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold ring-1 ring-amber-200">
                              🟠 Waiting for Refund
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold ring-1 ring-emerald-200">
                              🟢 Cleared (คืนเรียบร้อย)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {ref.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-1">
                        <button
                          onClick={() => handleApproveRefund(ref.refund_id)}
                          className="flex-1 py-1.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Check className="h-3 w-3" />
                          <span>รับคืนเงินสด (Close as Cash)</span>
                        </button>
                        <button
                          onClick={() => handleConvertRefundToDeduction(ref.refund_id)}
                          className="flex-1 py-1.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <X className="h-3 w-3" />
                          <span>หักเงินเดือน (Payroll Deduction)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Reimbursements Panel (Spent > Advance) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary-500 print:hidden" />
                <span className="print:text-black">รายการบริษัทจ่ายเพิ่ม (Additional Reimbursements)</span>
              </h2>
              <span className="text-[10px] bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-400 px-2 py-0.5 rounded font-extrabold uppercase print:bg-white print:text-black print:border print:border-slate-300">
                Spent &gt; Advance
              </span>
            </div>

            {accountingDocs.filter(d => d.doc_type === 'reimbursement_voucher').length === 0 && deductions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่มีรายการบริษัทต้องจ่ายชดใช้คืนเงินพนักงานในขณะนี้
              </div>
            ) : (
              <div className="space-y-3">
                {/* Render Reimbursement Vouchers */}
                {accountingDocs.filter(d => d.doc_type === 'reimbursement_voucher').map(doc => (
                  <div key={doc.doc_id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/40 dark:border-slate-800 flex flex-col justify-between gap-3 print:bg-white print:border-slate-300 print:p-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold print:text-black">{doc.doc_id}</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black">จ่ายคืนพนักงาน: {doc.requester_name}</p>
                        <p className="text-[10px] text-slate-400 print:text-slate-600">ประเภท: ใบสำคัญชดใช้ส่วนต่าง</p>
                        <p className="text-[10px] text-slate-400 print:text-slate-600">วันที่อนุมัติ: {doc.date}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-extrabold text-primary-600 dark:text-primary-400 block print:text-black">
                          ฿{doc.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="mt-1">
                          <span className="inline-block text-[9px] bg-primary-50 text-primary-850 dark:bg-primary-950/30 dark:text-primary-400 px-1.5 py-0.5 rounded font-bold ring-1 ring-primary-200">
                            🔵 Additional Reimbursement
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Keep legacy deductions display if any exist in the database for backward compatibility */}
                {deductions.map(ded => (
                  <div key={ded.deduction_id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/40 dark:border-slate-800 flex flex-col justify-between gap-3 print:bg-white print:border-slate-300 print:p-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold print:text-black">{ded.deduction_id}</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black">หักเงินส่วนเกินพนักงาน: {getUserNameById(ded.user_id)}</p>
                        <p className="text-[10px] text-slate-400 print:text-slate-600">รหัสสะสมเดิม (Legacy Adjustment Record)</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-extrabold text-rose-600 dark:text-rose-400 block print:text-black">
                          ฿{ded.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="mt-1">
                          <span className="inline-block text-[9px] bg-rose-50 text-rose-850 dark:bg-rose-950/30 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold ring-1 ring-rose-200 print:bg-white print:border print:border-slate-300 print:text-black print:ring-0">
                            🔴 Legacy Deduction Record
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Print Signatures */}
        <div className="hidden print:grid grid-cols-2 gap-8 mt-16 pt-8 text-center" style={{ pageBreakInside: 'avoid' }}>
          <div>
            <div className="h-12 border-b border-dashed border-slate-400 mb-2 w-3/4 mx-auto"></div>
            <p className="font-bold text-xs text-black">ผู้ตรวจสอบ (Checked By)</p>
            <p className="text-[10px] text-slate-500 mt-1">วันที่ (Date): ____/____/______</p>
          </div>
          <div>
            <div className="h-12 border-b border-dashed border-slate-400 mb-2 w-3/4 mx-auto"></div>
            <p className="font-bold text-xs text-black">ผู้อนุมัติ (Approved By)</p>
            <p className="text-[10px] text-slate-500 mt-1">วันที่ (Date): ____/____/______</p>
          </div>
        </div>
      </div>
    )}

      {/* VOUCHERS LIST & Corporate print design */}
      {activeSubTab === 'vouchers' && (
        <div className="space-y-4 print:space-y-0 print:p-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm print:border-none print:shadow-none print:p-0">
            {/* Corporate Header for full list print */}
            <div className="hidden print:block mb-8">
              <CompanyLetterhead 
                companyData={companyData} 
                primaryColor="#1e3a8a" 
                rightContent={
                  <div className="text-right shrink-0">
                    <h2 className="text-sm font-bold text-slate-900">Accounting Vouchers Sheet</h2>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Print Date: {new Date().toLocaleDateString('th-TH')}</p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 print:border-b-0 print:mb-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-4.5 w-4.5 text-primary-500 print:hidden" />
                <span className="print:text-black print:text-lg">รายการเอกสารสำคัญทางการเงินระบบเบิกจ่าย (Accounting Vouchers Sheet)</span>
              </h2>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 active:bg-green-800 text-white rounded-xl shadow-md shadow-green-700/10 transition-all hover:scale-[1.02] active:scale-[0.98] text-xs font-bold flex items-center gap-1.5 print:hidden"
              >
                <Printer className="h-4 w-4" />
                <span>พิมพ์ตารางนี้ (Print Sheet)</span>
              </button>
            </div>

            {accountingDocs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ยังไม่มีการบันทึกใบสำคัญในงวดนี้
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-xs print:text-black">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 print:bg-white print:text-black">
                    <tr>
                      <th className="p-3">เลขที่เอกสาร Voucher</th>
                      <th className="p-3">ประเภท</th>
                      <th className="p-3">ผู้ขอเบิก/ผู้คืน</th>
                      <th className="p-3">รายละเอียดบัญชี</th>
                      <th className="p-3 text-right">จำนวนเงิน</th>
                      <th className="p-3 text-center print:hidden">พิมพ์/ตรวจดู</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 print:divide-slate-200">
                    {accountingDocs.map(doc => {
                      const typeBadge = {
                        expense_voucher: { text: 'ใบสำคัญค่าใช้จ่าย', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200 print:border-slate-300' },
                        advance_payment_voucher: { text: 'ใบสำคัญจ่ายเงินล่วงหน้า', color: 'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400 border-primary-200 print:border-slate-300' },
                        refund_receipt: { text: 'ใบเสร็จรับคืนเงินสด', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 print:border-slate-300' },
                        deduction_notice: { text: 'ใบแจ้งหักเงินพนักงาน', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 print:border-slate-300' },
                        reimbursement_voucher: { text: 'ใบสำคัญจ่ายชดใช้เงินส่วนต่าง', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400 border-cyan-200 print:border-slate-300' }
                      }[doc.doc_type] || { text: 'เอกสารอื่นๆ', color: 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 print:border-slate-300' };

                      return (
                        <tr key={doc.doc_id} className="hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/30 print:bg-white">
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300 print:text-black">{doc.doc_id}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeBadge.color} print:bg-white print:text-black`}>
                              {typeBadge.text}
                            </span>
                          </td>
                          <td className="p-3 font-medium print:text-black">{doc.requester_name}</td>
                          <td className="p-3 text-slate-400 truncate max-w-xs print:text-black">{doc.details}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                            ฿{(doc.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <button
                              onClick={() => setSelectedDoc(doc)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold flex items-center gap-1 mx-auto transition-colors"
                            >
                              <Printer className="h-3 w-3" />
                              <span>แสดงไฟล์</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 print:bg-white print:border-black font-bold">
                    <tr>
                      <td colSpan={4} className="p-3 text-right text-slate-700 dark:text-slate-300 print:text-black uppercase tracking-wider text-[11px]">
                        ยอดรวมทั้งสิ้น (Grand Total)
                      </td>
                      <td className="p-3 text-right font-mono text-slate-900 dark:text-white print:text-black text-[13px]">
                        ฿{accountingDocs.reduce((sum, doc) => sum + (doc.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Print Signatures */}
                <div className="hidden print:grid grid-cols-3 gap-8 mt-16 pt-8 text-center" style={{ pageBreakInside: 'avoid' }}>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-2 w-3/4 mx-auto"></div>
                    <p className="font-bold text-xs text-black">ผู้จัดทำ (Prepared By)</p>
                    <p className="text-[10px] text-slate-500 mt-1">วันที่ (Date): ____/____/______</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-2 w-3/4 mx-auto"></div>
                    <p className="font-bold text-xs text-black">ผู้ตรวจสอบ (Checked By)</p>
                    <p className="text-[10px] text-slate-500 mt-1">วันที่ (Date): ____/____/______</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-2 w-3/4 mx-auto"></div>
                    <p className="font-bold text-xs text-black">ผู้อนุมัติ (Approved By)</p>
                    <p className="text-[10px] text-slate-500 mt-1">วันที่ (Date): ____/____/______</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOUBLE-ENTRY JOURNAL LEDGER */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4 print:space-y-0 print:p-0">
          <div className="flex justify-end print:hidden">
            <button
              onClick={handlePrintTable}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>พิมพ์ตารางนี้ (Print Sheet)</span>
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm print:border-none print:shadow-none print:p-0">
            {/* Corporate Header for full list print */}
            <div className="hidden print:block mb-8">
              <CompanyLetterhead 
                companyData={companyData} 
                primaryColor="#1e3a8a" 
                rightContent={
                  <div className="text-right shrink-0">
                    <h2 className="text-sm font-bold text-slate-900">General Journal Ledger</h2>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Print Date: {new Date().toLocaleDateString('th-TH')}</p>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 print:border-b-0 print:mb-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-indigo-500 print:hidden" />
                  <span className="print:text-black print:text-lg">สมุดรายวันทั่วไปเบิกจ่ายสองขา (General Journal Double-Entry Book)</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 print:hidden">ระบบหักกลบเดบิต/เครดิต แบบคู่ขนานตามงวดเงินสดสะสม</p>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <div className="flex items-center gap-2 text-[11px] font-bold bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200/40">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-300">สมดุลคู่บัญชี (Balanced Status): </span>
                  <span className="text-emerald-600">PASSED 0.00 DIFFERENCE</span>
                </div>
                {journalEntries.length > 0 && (
                  <button
                    id="ledger-export-excel-btn"
                    onClick={async () => {
                      try {
                        const { exportAccountingLedgerToExcel } = await import('../utils/excelExport');
                        await exportAccountingLedgerToExcel(
                          journalEntries,
                          'สมุดบัญชีรายวันทั่วไปและการปรับปรุงรายการบัญชี (General Journal Ledger)',
                          currentUser.name
                        );
                      } catch (err) {
                        console.error('Error exporting ledger:', err);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg text-xs font-extrabold transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export Ledger (.xlsx)</span>
                  </button>
                )}
              </div>
            </div>

            {journalEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ยังไม่มีรายการผ่านบัญชีในสมุดรายวันแยกประเภท
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-xs text-left print:text-black">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 print:bg-white print:text-black print:border-black">
                    <tr>
                      <th className="p-3">ID บันทึก</th>
                      <th className="p-3">วันที่</th>
                      <th className="p-3">รหัสผังบัญชีและรายละเอียดคู่บัญชี (Accounts & Items)</th>
                      <th className="p-3 text-right">เดบิต (Debit)</th>
                      <th className="p-3 text-right">เครดิต (Credit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 print:divide-slate-200">
                    {journalEntries.map(entry => (
                      <React.Fragment key={entry.journal_id}>
                        {/* Debit Row */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 print:bg-white">
                          <td className="p-3 font-mono font-semibold text-slate-400 print:text-black" rowSpan={3}>{entry.journal_id}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 print:text-black" rowSpan={3}>{entry.date}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                            Dr. {entry.debit_account}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-primary-600 dark:text-primary-400 print:text-black">
                            ฿{(entry.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right text-slate-300 font-mono print:text-black">-</td>
                        </tr>
                        {/* Credit Row */}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 print:bg-white">
                          <td className="p-3 pl-8 text-slate-600 dark:text-slate-300 print:text-black">
                            Cr. {entry.credit_account}
                          </td>
                          <td className="p-3 text-right text-slate-300 font-mono print:text-black">-</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                            ฿{(entry.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {/* Narrative Row */}
                        <tr className="bg-slate-50/10 dark:bg-slate-800/5 border-b border-slate-100 dark:border-slate-800 print:bg-white print:border-slate-300">
                          <td className="p-2 pl-8 text-[11px] text-slate-450 dark:text-slate-400 italic print:text-black">
                            ({entry.description}) - Ref: {entry.ref_id}
                          </td>
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 print:bg-white print:border-black font-bold">
                    <tr>
                      <td colSpan={3} className="p-3 text-right text-slate-700 dark:text-slate-300 print:text-black uppercase tracking-wider text-[11px]">
                        ยอดรวมทั้งสิ้น (Grand Total)
                      </td>
                      <td className="p-3 text-right font-mono text-slate-900 dark:text-white print:text-black text-[13px]">
                        ฿{journalEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-900 dark:text-white print:text-black text-[13px]">
                        ฿{journalEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Print Signatures */}
                <div className="hidden print:grid grid-cols-2 gap-8 mt-16 pt-8 text-center" style={{ pageBreakInside: 'avoid' }}>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-2 w-3/4 mx-auto"></div>
                    <p className="font-bold text-xs text-black">ผู้บันทึกบัญชี (Bookkeeper)</p>
                    <p className="text-[10px] text-slate-500 mt-1">วันที่ (Date): ____/____/______</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mb-2 w-3/4 mx-auto"></div>
                    <p className="font-bold text-xs text-black">สมุห์บัญชี / ผู้จัดการ (Accounting Manager)</p>
                    <p className="text-[10px] text-slate-500 mt-1">วันที่ (Date): ____/____/______</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* CORPORATE print preview modal (Accounting Document View) */}
      {/* CORPORATE print preview modal (Accounting Document View) */}
      {selectedDoc && (() => {
        // Resolve requester details
        const requesterName = associatedRequest?.employeeName || selectedDoc.requester_name;
        const requesterRole = associatedRequest?.employeeRole || 'พนักงาน';
        const department = associatedRequest?.department || selectedDoc.department || 'สำนักงานส่วนกลาง';
        const requesterUser = dbUsers.find(u => u.name === requesterName || u.name.includes(requesterName));
        const requesterSig = requesterUser?.signatureUrl;

        // Resolve auditor details (สิรินธร)
        const auditorUser = dbUsers.find(u => u.name.includes('สิรินธร') || u.name === selectedDoc.approved_by);
        const auditorSig = auditorUser?.signatureUrl;
        const auditorName = auditorUser?.name || selectedDoc.approved_by || 'สิรินธร รัตนสกุล (CFO)';

        // Resolve approver details
        const approvedSteps = associatedRequest?.approvalHistory?.filter((step: any) => step.status === 'approved' || step.status === 'Approved') || [];
        const finalApproverStep = approvedSteps[approvedSteps.length - 1] || null;
        const approverName = finalApproverStep ? finalApproverStep.approverName : (selectedDoc.approved_by || 'สิรินธร รัตนสกุล (CFO)');
        const approverRole = finalApproverStep ? finalApproverStep.approverRole : 'ผู้อนุมัติ';
        const approverUser = dbUsers.find(u => u.name === approverName || u.name.includes(approverName));
        const approverSig = approverUser?.signatureUrl;

        const isPaymentVoucher = ['expense_voucher', 'reimbursement_voucher', 'advance_payment_voucher'].includes(selectedDoc.doc_type);
        const receiverSig = isPaymentVoucher ? requesterSig : auditorSig;
        const receiverName = isPaymentVoucher ? requesterName : auditorName;

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 print:fixed print:inset-0 print:bg-white print:p-0 print:block print:z-[9999] print:m-0">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 relative border-4 border-slate-900 animate-scale-up print:border-none print:shadow-none print:p-8 print:max-w-full print:w-full print:text-black print:bg-white print:static print:m-0">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedDoc(null)}
                className="absolute right-4 top-4 text-rose-500 hover:text-white hover:bg-rose-500 dark:text-rose-400 dark:hover:text-white p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 shadow-sm font-extrabold transition-all duration-150 cursor-pointer h-9 w-9 flex items-center justify-center print:hidden"
                title="ปิด"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Print Header */}
              <CompanyLetterhead 
                companyData={companyData} 
                primaryColor="#1e3a8a" 
                rightContent={
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded">
                      Official Copy
                    </span>
                    <p className="text-[11px] font-mono font-bold mt-2 text-slate-900 dark:text-white">NO: {selectedDoc.doc_id}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Date: {selectedDoc.date}</p>
                  </div>
                }
              />

              {/* Title Document */}
              <div className="text-center py-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <h4 className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  {selectedDoc.doc_type === 'expense_voucher' && 'PAYMENT VOUCHER (ใบสำคัญค่าใช้จ่าย)'}
                  {selectedDoc.doc_type === 'advance_payment_voucher' && 'ADVANCE PAYMENT VOUCHER (ใบสำคัญจ่ายเงินทดรองล่วงหน้า)'}
                  {selectedDoc.doc_type === 'refund_receipt' && 'OFFICIAL CASH REFUND RECEIPT (ใบเสร็จรับคืนเงินสด)'}
                  {selectedDoc.doc_type === 'deduction_notice' && 'SALARY DEDUCTION NOTICE (ใบแจ้งหักบัญชีเงินเดือน)'}
                  {selectedDoc.doc_type === 'reimbursement_voucher' && 'REIMBURSEMENT VOUCHER (ใบสำคัญจ่ายชดใช้เงินส่วนต่าง)'}
                </h4>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 dark:border-slate-700 pb-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">ผู้ขอเบิก / ผู้รับเงิน / ผู้คืนเงิน:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{requesterName} ({requesterRole})</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">แผนกงาน (Department):</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{department}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">เลขอ้างอิงระบบเบิกจ่าย (Reference ID):</p>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedDoc.ref_id}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">ผู้ตรวจสอบเอกสาร (Audited By):</p>
                  <p className="font-bold text-emerald-700">{auditorName}</p>
                </div>
              </div>

              {/* Particulars Table with VAT support */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">รายละเอียดทางบัญชีและภาษี (Accounting Particulars & VAT)</span>
                <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3 text-center" style={{ width: '10%' }}>ลำดับ</th>
                        <th className="p-3" style={{ width: '60%' }}>รายการคำอธิบาย</th>
                        <th className="p-3 text-right" style={{ width: '30%' }}>จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                      <tr>
                        <td className="p-3 text-center font-medium">1</td>
                        <td className="p-3">
                          <p className="font-bold">{selectedDoc.details}</p>
                          {associatedRequest?.description && (
                            <p className="text-[10px] text-slate-400 mt-1">{associatedRequest.description}</p>
                          )}
                          {associatedRequest?.category && (
                            <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-md mt-1 font-mono uppercase">
                              Category: {associatedRequest.category}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                          ฿{((associatedRequest?.amount || selectedDoc.amount) - (associatedRequest?.vat_amount || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      
                      {associatedRequest?.has_vat && associatedRequest.vat_amount ? (
                        <>
                          <tr className="bg-slate-500/5">
                            <td colSpan={2} className="p-2 text-right text-slate-500 font-medium">จำนวนเงินก่อนภาษี (Net Amount):</td>
                            <td className="p-2 text-right font-mono text-slate-600 dark:text-slate-400">
                              ฿{(associatedRequest.amount - associatedRequest.vat_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-slate-500/5">
                            <td colSpan={2} className="p-2 text-right text-slate-500 font-medium">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
                            <td className="p-2 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                              ฿{associatedRequest.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </>
                      ) : null}

                      <tr className="bg-slate-900 text-white font-bold text-sm">
                        <td colSpan={2} className="p-3 text-right text-xs uppercase tracking-wider">จำนวนเงินรวมสุทธิ (Net Grand Total):</td>
                        <td className="p-3 text-right font-mono">
                          ฿{(selectedDoc.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attached Receipts & Evidence Section */}
              <div className="space-y-3 pt-2 print:hidden border-t border-slate-150 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <FileCheck2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>เอกสารประกอบและหลักฐานแนบ (Receipts & Attached Evidence)</span>
                </span>

                {attachments.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/30">
                    ไม่พบเอกสารแนบในระบบคลังเอกสาร
                  </div>
                ) : (() => {
                  const activeDoc = attachments[activeAttachmentIdx] || attachments[0];
                  const isPdf = activeDoc.url.toLowerCase().endsWith('.pdf') || activeDoc.url.includes('pdf') || activeDoc.url.startsWith('data:application/pdf');

                  return (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                      {/* Attachment Thumbnail Picker */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 block">เลือกเอกสารแนบเพื่อแสดงหลักฐานแนบ (Select Attachment Thumbnail)</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {attachments.map((doc, idx) => {
                            const docIsPdf = doc.url.toLowerCase().endsWith('.pdf') || doc.url.includes('pdf') || doc.url.startsWith('data:application/pdf');
                            const isActive = activeAttachmentIdx === idx;
                            return (
                              <button
                               key={idx}
                               type="button"
                               onClick={() => {
                                 setActiveAttachmentIdx(idx);
                                 setZoomScale(100);
                               }}
                               className={`group relative flex flex-col justify-between items-center p-2 rounded-xl bg-white dark:bg-slate-900 border text-center transition-all ${
                                 isActive
                                   ? 'border-indigo-600 ring-2 ring-indigo-500/15 shadow-md bg-indigo-50/20 dark:bg-indigo-950/20'
                                   : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                               }`}
                              >
                               {/* Miniature Image / PDF Icon */}
                               <div className="w-full h-14 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-900 relative">
                                 {docIsPdf ? (
                                   <div className="flex flex-col items-center justify-center">
                                     <FileText className="h-6 w-6 text-rose-500" />
                                     <span className="text-[8px] font-black tracking-widest text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-1 py-0.5 rounded mt-0.5">PDF</span>
                                   </div>
                                 ) : (
                                   <img
                                     src={doc.url}
                                     alt={doc.name}
                                     className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                     referrerPolicy="no-referrer"
                                   />
                                 )}
                               </div>
                               {/* Filename */}
                               <span className="w-full text-[9px] font-bold text-slate-600 dark:text-slate-300 mt-1.5 truncate" title={doc.name}>
                                 {doc.name}
                               </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Preview Box Container */}
                      <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 flex flex-col min-h-[300px]">
                        
                        {/* Universal Action Header toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 w-full">
                          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            {isPdf ? <FileText className="h-4 w-4 text-rose-500" /> : <ImageIcon className="h-4 w-4 text-indigo-500" />}
                            <span className="max-w-[180px] sm:max-w-xs truncate" title={activeDoc.name}>{activeDoc.name}</span>
                          </span>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {/* Image Zoom controls */}
                            {!isPdf && (
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 mr-1 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => setZoomScale(prev => Math.max(prev - 25, 50))}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition-colors"
                                  title="Zoom Out"
                                >
                                  <ZoomOut className="h-3 w-3" />
                                </button>
                                <span className="text-[9px] font-mono font-extrabold text-slate-750 dark:text-slate-300 min-w-[28px] text-center">{zoomScale}%</span>
                                <button
                                  type="button"
                                  onClick={() => setZoomScale(prev => Math.min(prev + 25, 200))}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition-colors"
                                  title="Zoom In"
                                >
                                  <ZoomIn className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                            {/* Full screen button */}
                            <button
                              type="button"
                              onClick={() => (typeof activeDoc.url === 'string' && activeDoc.url.startsWith('http') ? window.open(activeDoc.url, '_blank') : null)}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm"
                              title="เปิดดูเต็มหน้าจอ"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                              <span>เต็มหน้าจอ</span>
                            </button>

                            {/* Download button */}
                            <button
                              type="button"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = activeDoc.url;
                                link.download = activeDoc.name || 'document';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="ดาวน์โหลดไฟล์เอกสาร"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>ดาวน์โหลด</span>
                            </button>

                            {/* Print button */}
                            <button
                              type="button"
                              onClick={() => {
                                const printWindow: any = {
      document: {
        write: (html: string) => { printWindow._html = (printWindow._html || '') + html; },
        close: () => { openPdfPreview(printWindow._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
                                if (printWindow) {
                                  if (isPdf) {
                                    printWindow.document.write(`
                                      <html>
                                        <head>
                                          <title>${activeDoc.name}</title>
                                        </head>
                                        <body style="margin:0;padding:0;">
                                          <embed src="${activeDoc.url}" type="application/pdf" style="width:100%;height:100vh;border:none;" />
                                        </body>
                                      </html>
                                    `);
                                  } else {
                                    printWindow.document.write(`
                                      <html>
                                        <head>
                                          <title>${activeDoc.name}</title>
                                          <style>
                                            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: white; }
                                            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                            @media print {
                                              body { background: white; }
                                              img { max-height: 100%; max-width: 100%; }
                                            }
                                          </style>
                                        </head>
                                        <body>
                                          <img src="${activeDoc.url}" onload="window.print();window.close();" />
                                        </body>
                                      </html>
                                    `);
                                  }
                                  printWindow.document.close();
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="สั่งพิมพ์หลักฐานนี้"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>พิมพ์เอกสาร</span>
                            </button>
                          </div>
                        </div>

                        {/* Display Preview */}
                        <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900/30">
                          {isPdf ? (
                            <iframe
                              src={activeDoc.url}
                              className="w-full h-[350px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                              title="PDF Preview Frame"
                            ></iframe>
                          ) : (
                            <div className="overflow-auto max-h-[350px] w-full flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-950 shadow-inner">
                              <img
                                src={activeDoc.url}
                                alt={activeDoc.name}
                                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'center center' }}
                                className="max-h-[300px] max-w-full object-contain transition-transform duration-200"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Dynamic Corporate Signature Area */}
              <div className="grid grid-cols-4 gap-4 text-[9px] pt-4 text-center text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700">
                
                {/* 1. Preparer Box */}
                <div className="space-y-2 flex flex-col justify-between h-28 border border-slate-200/60 dark:border-slate-800 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="font-bold text-slate-400 uppercase tracking-wide text-[8px] block border-b border-slate-200 dark:border-slate-700 pb-1">ผู้จัดทำ (Preparer)</span>
                  {requesterSig ? (
                    <img src={requesterSig} className="h-10 object-contain mx-auto" alt="signature" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-10 flex items-center justify-center text-slate-350 italic text-[10px]">ลายมือชื่อดิจิทัล</div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-250 truncate">{requesterName}</p>
                    <p className="text-[8px] text-slate-400">วันที่: {selectedDoc.date}</p>
                  </div>
                </div>

                {/* 2. Auditor Box */}
                <div className="space-y-2 flex flex-col justify-between h-28 border border-slate-200/60 dark:border-slate-800 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="font-bold text-slate-400 uppercase tracking-wide text-[8px] block border-b border-slate-200 dark:border-slate-700 pb-1">ผู้ตรวจสอบ (Auditor)</span>
                  {auditorSig ? (
                    <img src={auditorSig} className="h-10 object-contain mx-auto" alt="signature" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-10 flex items-center justify-center text-slate-350 italic text-[10px]">ผู้รับอนุมัติสารบบ</div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-250 truncate">{auditorName}</p>
                    <p className="text-[8px] text-slate-400">วันที่: {selectedDoc.date}</p>
                  </div>
                </div>

                {/* 3. Approver Box */}
                <div className="space-y-2 flex flex-col justify-between h-28 border border-slate-200/60 dark:border-slate-800 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="font-bold text-slate-400 uppercase tracking-wide text-[8px] block border-b border-slate-200 dark:border-slate-700 pb-1">ผู้อนุมัติจ่าย (Approver)</span>
                  {approverSig ? (
                    <img src={approverSig} className="h-10 object-contain mx-auto" alt="signature" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-10 flex items-center justify-center text-slate-350 italic text-[10px]">Electronic Signed</div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-250 truncate">{approverName}</p>
                    <p className="text-[8px] text-slate-400">{approverRole}</p>
                  </div>
                </div>

                {/* 4. Receiver Box */}
                <div className="space-y-2 flex flex-col justify-between h-28 border border-slate-200/60 dark:border-slate-800 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="font-bold text-slate-400 uppercase tracking-wide text-[8px] block border-b border-slate-200 dark:border-slate-700 pb-1">ผู้รับเงิน (Receiver)</span>
                  {receiverSig ? (
                    <div className="space-y-0.5">
                      <img src={receiverSig} className="h-9 object-contain mx-auto" alt="signature" referrerPolicy="no-referrer" />
                      <span className="text-[7px] text-emerald-600 font-extrabold block">Bank Transferred</span>
                    </div>
                  ) : (
                    <div className="h-10 flex items-center justify-center text-slate-350 italic text-[10px]">โอนเงินสำเร็จ</div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-250 truncate">{receiverName}</p>
                    <p className="text-[8px] text-slate-400">วันที่: {selectedDoc.date}</p>
                  </div>
                </div>

              </div>

              {/* Footer buttons */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-between items-center text-xs print:hidden">
                <p className="text-slate-400 italic font-medium">Generated by O-Key ERP Accounting Module</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePrintVoucher(selectedDoc, 'pdf')}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <FileDown size={14} />
                    <span>ดาวน์โหลด PDF</span>
                  </button>
                  <button
                    onClick={() => handlePrintVoucher(selectedDoc, 'print')}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <Printer size={14} />
                    <span>สั่งพิมพ์ (Print)</span>
                  </button>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
                    title="ปิดหน้าต่าง (Esc)"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </>
  );
}
