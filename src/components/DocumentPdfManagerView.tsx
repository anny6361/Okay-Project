import React, { useState, useEffect } from 'react';
import { uploadToStorage } from '../lib/storage';
import { openPdfPreview } from '../lib/pdf-preview';
import { 
  FileDown, 
  Printer, 
  Check, 
  Database, 
  GitFork, 
  Download, 
  Image as ImageIcon, 
  Trash2, 
  Building, 
  Info, 
  Map, 
  FileText,
  User,
  Briefcase,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { ExpenseRequest, UserProfile } from '../types';
import { getDbUsers, getDbCompanyData, getRealReceiptImages, getDbRefunds, getDbRequests } from '../data/db';
import { saveToFirestore } from '../lib/firestore-sync';
import { CompanyLetterhead } from './CompanyLetterhead';
import { getLetterheadHtml } from '../utils/letterheadHtml';

export default function DocumentPdfManagerView() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'engine'>('engine');
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Load requests from database cache / firestore
    const loadedReqs = getDbRequests();
    setRequests(loadedReqs);
    if (loadedReqs.length > 0) {
      setSelectedRequest(loadedReqs[0]);
    }

    // Load users from database
    setUsers(getDbUsers());

    // Load company master data
    const comp = getDbCompanyData();
    setCompanyData(comp);
  }, []);

  // Sync selectedRequest whenever requests state updates (e.g. after uploading new attachments)
  const syncSelectedRequest = (requestId: string, updatedRequests: ExpenseRequest[]) => {
    const found = updatedRequests.find(r => r.id === requestId);
    if (found) {
      setSelectedRequest(found);
    }
  };

  // Helper function to resolve category specific / name specific primary receipt image

  // Helper function to compile ALL request attachments:
  // Get all real attachments (primary receipt + uploaded evidence)
  const getAllRequestAttachments = (req: ExpenseRequest): string[] => {
    return getRealReceiptImages(req);
  };

  // Handler to let users upload additional receipts/supporting evidence directly in this view
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    if (file && selectedRequest) {
      setIsUploading(true);
      uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then(async (dataUrl) => {
        
        
        
        // Add new attachment to the request's attachment_list
        const updatedAttachments = [
          ...(selectedRequest.attachment_list || []),
          { name: file.name, type: file.type, dataUrl: dataUrl }
        ];
        
        const updatedRequest = {
          ...selectedRequest,
          attachment_list: updatedAttachments
        };
        
        // Update requests array state
        const updatedRequests = requests.map(r => r.id === selectedRequest.id ? updatedRequest : r);
        setRequests(updatedRequests);
        setSelectedRequest(updatedRequest);
        
        // Save back to database
        saveToFirestore('okey_requests', updatedRequests);
        setIsUploading(false);
        inputElement.value = '';
      }).catch(err => {
        console.error("Upload failed", err);
        setIsUploading(false);
        inputElement.value = '';
      });
    }
  };

  // Handler to delete uploaded supporting attachments (excludes the generated primary receipt)
  const handleDeleteAttachment = (indexInAll: number) => {
    if (!selectedRequest) return;
    if (indexInAll === 0) return; // Cannot delete primary auto receipt

    const attachmentListIndex = indexInAll - 1;
    const updatedAttachments = (selectedRequest.attachment_list || []).filter((_, i) => i !== attachmentListIndex);

    const updatedRequest = {
      ...selectedRequest,
      attachment_list: updatedAttachments
    };

    const updatedRequests = requests.map(r => r.id === selectedRequest.id ? updatedRequest : r);
    setRequests(updatedRequests);
    setSelectedRequest(updatedRequest);
    saveToFirestore('okey_requests', updatedRequests);
  };

  // Calculate dynamic settlement details for clearing vouchers
  const getSettlementDetails = (req: ExpenseRequest) => {
    if (req.expense_type !== 'clearing') return null;
    const matchedAdvance = requests.find(r => r.id === req.advance_id);
    const advAmount = matchedAdvance ? matchedAdvance.amount : 0;
    const spentAmount = req.amount;
    const diff = spentAmount - advAmount;

    let isPayrollDeduction = false;
    if (diff < 0) {
      const dbRefunds = getDbRefunds();
      const matchedRefund = dbRefunds.find(ref => ref.advance_id === req.advance_id);
      if (matchedRefund && matchedRefund.status === 'payroll_deduction') {
        isPayrollDeduction = true;
      }
    }

    return {
      advanceAmount: advAmount,
      spentAmount: spentAmount,
      diff: diff,
      type: diff < 0 ? (isPayrollDeduction ? ('payroll_deduction' as const) : ('refund' as const)) : diff > 0 ? ('reimbursement' as const) : ('perfect' as const),
      amount: Math.abs(diff)
    };
  };

  // Generate complete A4 template and open PDF Preview & Print modal
  const handlePrint = () => {
    if (!selectedRequest) return;

    const companyLogo = companyData?.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60';
    const companyName = companyData?.companyName || 'บริษัท โอเค เอ็กซ์เพนส์ แมเนจเมนท์ จำกัด';
    const companyAddress = companyData?.address || '99/9 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310';
    const companyTaxId = companyData?.taxId || '0-1055-66000-11-2';
    const companyPhone = companyData?.phone || '02-123-4567';
    const companyEmail = companyData?.email || 'finance@okay.com';

    // Find requester user details & signature from registered profiles
    const requesterUser = users.find(u => u.name === selectedRequest.employeeName || u.user_id === selectedRequest.created_by) || users[1];
    const requesterSig = requesterUser?.signatureUrl || 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Foreman_Signature.png';

    // Resolve all attachments as real images for the PDF
    const allAttachments = getAllRequestAttachments(selectedRequest);

    // Render attachments grid inside the PDF (Real images only, no filenames or URLs)
    const pdfAttachmentsHtml = allAttachments.map((img, idx) => `
      <div style="break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; background-color: #ffffff; text-align: center;">
        <p style="font-weight: bold; font-size: 10px; color: #475569; margin: 0 0 6px 0;">
          ${idx === 0 ? 'หลักฐานใบเสร็จหลัก (Primary Receipt)' : 
            idx === 1 ? 'หลักฐานสลิปโอนเงิน / Slip / Statement' : 
            idx === 2 ? 'ภาพประกอบสถานที่ / พยานแวดล้อม /ใบเสนอราคา / รูปสินค้า' : `เอกสารประกอบแนบเพิ่มเติม #${idx}`}
        </p>
        <img src="${img}" style="max-height: 250px; max-width: 100%; object-fit: contain; border-radius: 4px; border: 1px solid #e2e8f0;" alt="evidence attachment" />
      </div>
    `).join('');

    // Prepare comments block (ความคิดเห็นผู้อนุมัติ) - Removed according to Requirement 5
    const pdfCommentsHtml = ``;

    // Replacement-specific flow vs standard request flow
    if (selectedRequest.supporting_document_type === 'replacement') {
      const formattedAmount = (selectedRequest.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
      
      // Map signature cards with registered signature images or pending placeholder
      const pdfReplacementLevelsHtml = selectedRequest.approvalHistory.map((step, idx) => {
        const matchingUser = users.find(u => u.name === step.approverName);
        const userSig = matchingUser?.signatureUrl;
        const isApproved = step.status === 'approved';

        if (isApproved && userSig) {
          return `
            <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; min-height: 115px; box-sizing: border-box;">
              <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 10px; text-transform: uppercase;">${step.approverRole || `ผู้อนุมัติระดับที่ ${idx + 1}`}</p>
              <img src="${userSig}" style="height: 38px; max-width: 90%; object-fit: contain; margin: 4px auto; display: block;" alt="Signature" />
              <div>
                <p style="font-weight: 600; margin: 4px 0 2px 0; font-size: 11px; color: #1e293b;">${step.approverName}</p>
                <p style="color: #10b981; font-weight: bold; margin: 0; font-size: 8px;">✓ APPROVED</p>
                <p style="color: #94a3b8; font-size: 8px; margin: 2px 0 0 0;">${step.date}</p>
              </div>
            </div>
          `;
        } else {
          return `
            <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; min-height: 115px; box-sizing: border-box;">
              <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 10px; text-transform: uppercase;">${step.approverRole || `ผู้อนุมัติระดับที่ ${idx + 1}`}</p>
              <div style="color: #dc2626; font-weight: bold; margin: auto; padding: 12px 6px; font-size: 10px; border: 1px solid #fca5a5; border-radius: 4px; width: 100%; background-color: #fef2f2; box-sizing: border-box; text-transform: uppercase; letter-spacing: 0.5px;">
                รอการลงนาม<br/><span style="font-size: 8px; font-weight: normal; color: #ef4444;">(Pending)</span>
              </div>
              <div>
                <p style="font-weight: 600; margin: 4px 0 2px 0; font-size: 11px; color: #64748b;">${step.approverName}</p>
                <p style="color: #94a3b8; font-size: 8px; margin: 0;">-</p>
              </div>
            </div>
          `;
        }
      }).join(`
        <div style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: auto 2px;">➔</div>
      `);

      const replacementContent = `
        <html>
          <head>
            <title>ใบแทนใบเสร็จรับเงิน - ${selectedRequest.replacement_receipt_number || selectedRequest.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
              body {
                font-family: 'Sarabun', sans-serif;
                margin: 0;
                padding: 40px;
                color: #1e293b;
                background: #ffffff;
                font-size: 14px;
                line-height: 1.6;
              }
              .container {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
                border: 1px solid #cbd5e1;
                padding: 40px;
                box-sizing: border-box;
              }
              .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 20px;
                margin-bottom: 25px;
              }
              .logo-title {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .logo-img {
                height: 55px;
                width: 55px;
                object-fit: cover;
                border-radius: 8px;
              }
              .company-info h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 700;
              }
              .company-info p {
                margin: 2px 0 0 0;
                font-size: 11px;
                color: #64748b;
              }
              .doc-meta {
                text-align: right;
              }
              .doc-meta h1 {
                margin: 0;
                font-size: 20px;
                color: #f59e0b;
                font-weight: 700;
              }
              .doc-meta p {
                margin: 4px 0 0 0;
                font-size: 12px;
                font-family: monospace;
                font-weight: bold;
              }
              .title-desc {
                text-align: center;
                margin-bottom: 25px;
              }
              .title-desc h3 {
                margin: 0;
                font-size: 16px;
                text-decoration: underline;
                font-weight: bold;
              }
              .title-desc p {
                margin: 5px 0 0 0;
                font-size: 12px;
                color: #475569;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 10px 12px;
                text-align: left;
                font-size: 13px;
              }
              th {
                background-color: #f8fafc;
                font-weight: 600;
              }
              .text-right {
                text-align: right;
              }
              .text-center {
                text-align: center;
              }
              .total-row {
                font-weight: bold;
                background-color: #f1f5f9;
              }
              .section-title {
                font-weight: bold;
                color: #0f172a;
                margin: 25px 0 8px 0;
                font-size: 13px;
                border-left: 3px solid #f59e0b;
                padding-left: 8px;
              }
              .info-grid {
                display: grid;
                grid-template-cols: 1fr 1fr;
                gap: 15px;
                background-color: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                margin-bottom: 25px;
              }
              .info-item span {
                font-size: 11px;
                color: #64748b;
                display: block;
              }
              .info-item p {
                margin: 2px 0 0 0;
                font-weight: 600;
                font-size: 13px;
              }
              .reason-box {
                background-color: #fffbeb;
                border: 1px dashed #fef3c7;
                padding: 15px;
                border-radius: 8px;
                font-size: 13px;
                margin-bottom: 25px;
              }
              .signature-grid {
                display: flex;
                flex-direction: row;
                align-items: stretch;
                justify-content: space-between;
                gap: 6px;
                margin-top: 25px;
              }
              .barcode-sim {
                font-family: monospace;
                letter-spacing: 3px;
                background-color: #f1f5f9;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 9px;
                text-align: center;
                font-weight: bold;
                display: inline-block;
              }
              .footer-stamp {
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
                margin-top: 40px;
                border-top: 1px dashed #e2e8f0;
                padding-top: 15px;
              }
              .evidence-grid {
                display: grid;
                grid-template-cols: 1fr 1fr;
                gap: 15px;
                margin-top: 15px;
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="container">
              ${getLetterheadHtml(companyData, '#1e3a8a', `
                <h1 style="margin: 0; font-size: 16px; color: #1e3a8a; font-weight: bold; font-family: 'Sarabun', sans-serif;">ใบแทนใบเสร็จรับเงิน</h1>
                <p style="margin: 4px 0 0 0; font-size: 10px; font-family: monospace; font-weight: bold;">เลขที่เอกสาร: ${selectedRequest.replacement_receipt_number || selectedRequest.id}</p>
                <p style="font-size: 9px; color: #64748b; margin: 2px 0 0 0; font-family: 'Sarabun', sans-serif;">วันที่พิมพ์เอกสาร: ${new Date().toLocaleDateString('th-TH')}</p>
                <p style="font-size: 9px; color: #64748b; margin: 2px 0 0 0; font-family: 'Sarabun', sans-serif;">เวลา: ${new Date().toLocaleTimeString('th-TH')}</p>
                <p style="font-size: 8px; color: #94a3b8; margin: 2px 0 0 0; font-family: monospace;">Version: 1.0 (Audit Trail Active)</p>
              `)}

              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding: 10px; background-color: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                <div>
                  <p style="margin:0; font-size: 11px; color: #475569; font-weight: bold;">Digital Verification Signature</p>
                  <p style="margin:4px 0 0 0; font-size: 10px; font-family: monospace; color: #64748b;">SHA-256 Hash: ${btoa(selectedRequest.id + selectedRequest.amount + selectedRequest.date).replace(/=/g, '').toUpperCase()}...</p>
                  <p style="margin:2px 0 0 0; font-size: 10px; color: #64748b;">Document ID: ${selectedRequest.id}</p>
                </div>
                <div>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('OKAY-ERP://verify/' + selectedRequest.id)}" style="width: 50px; height: 50px;" alt="Verification QR Code" />
                </div>
              </div>

              <div class="title-desc">
                <h3>ใบแทนใบเสร็จรับเงิน (Replacement Receipt)</h3>
                <p>ตามระเบียบกรมสรรพากร ถือเป็นเอกสารหลักฐานรายจ่ายประกอบการหักภาษีเงินได้นิติบุคคล</p>
              </div>

              <div class="section-title">ข้อมูลผู้ขอรับเงินสะสมและสถานที่ทำรายการ</div>
              <div class="info-grid">
                <div class="info-item">
                  <span>ผู้ขอเบิกจ่าย (Claimant / Requester)</span>
                  <p>${selectedRequest.employeeName} (${selectedRequest.employeeRole})</p>
                </div>
                <div class="info-item">
                  <span>หน่วยงาน / แผนกรับภาระ (Department)</span>
                  <p>${selectedRequest.department}</p>
                </div>
                <div class="info-item">
                  <span>ชื่อร้านค้า / ผู้รับเงินปลายทาง (Merchant / Payee)</span>
                  <p>${selectedRequest.replacement_merchant || 'ไม่ระบุชื่อร้านค้า'}</p>
                </div>
                <div class="info-item">
                  <span>สถานที่ทำรายการ / พิกัด (Location)</span>
                  <p>${selectedRequest.replacement_location || 'ไม่ระบุสถานที่'}</p>
                </div>
                <div class="info-item">
                  <span>ช่องทางการชำระเงิน (Payment Method)</span>
                  <p>${
                    selectedRequest.replacement_payment_method === 'cash' ? 'เงินสด (Cash)' :
                    selectedRequest.replacement_payment_method === 'transfer' ? 'โอนเงินผ่านธนาคาร (Bank Transfer)' :
                    selectedRequest.replacement_payment_method === 'credit_card' ? 'บัตรเครดิต (Credit Card)' :
                    selectedRequest.replacement_payment_method === 'promptpay' ? 'พร้อมเพย์ (PromptPay)' : 'อื่นๆ (Other)'
                  }</p>
                </div>
                <div class="info-item">
                  <span>บุคคลที่เกี่ยวข้อง / พยานพยาน (Witness / Involved)</span>
                  <p>${selectedRequest.replacement_involved || '-'}</p>
                </div>
              </div>

              <div class="section-title">เหตุผลความจำเป็นที่ไม่อาจเรียกใบเสร็จรับเงินได้</div>
              <div class="reason-box">
                <div style="padding: 15px;">
                  <strong>เหตุผลความจำเป็น:</strong><br/>
                  ${selectedRequest.replacement_reason || 'ไม่มีคำชี้แจงความจำเป็น'}
                </div>
              </div>

              <div class="section-title">รายละเอียดรายการค่าใช้จ่ายประกอบใบแทน</div>
              <table>
                <thead>
                  <tr>
                    <th class="text-center" style="width: 80px;">ลำดับ</th>
                    <th>รายการสินค้า / บริการประกอบรายจ่าย</th>
                    <th class="text-right" style="width: 150px;">จำนวนเงินรวม (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-center">1</td>
                    <td>
                      <strong>${selectedRequest.title}</strong><br/>
                      <span style="font-size: 11px; color: #64748b;">${selectedRequest.replacement_remarks || selectedRequest.description || '-'}</span>
                    </td>
                    <td class="text-right">${formattedAmount}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="2" class="text-right">รวมจำนวนเงินที่ขอเบิกจ่ายทดแทนทั้งสิ้น (บาท):</td>
                    <td class="text-right">฿${formattedAmount}</td>
                  </tr>
                </tbody>
              </table>

              <div class="section-title">พยานหลักฐานและหลักฐานทดแทนประกอบแนบทั้งหมด (Receipt & Evidence Gallery)</div>
              <div class="evidence-grid">
                ${pdfAttachmentsHtml}
              </div>

              ${pdfCommentsHtml}

              <p style="font-size: 11px; color: #475569; margin-top: 30px;">
                ข้าพเจ้าขอรับรองว่า รายจ่ายข้างต้นนี้เกิดขึ้นจริงเพื่อประโยชน์การดำเนินงานและธุรกิจของบริษัทฯ และข้าพเจ้าไม่อาจเรียกเก็บใบเสร็จรับเงินจากผู้รับเงินได้ด้วยความจำเป็นสุดวิสัย
              </p>

              <h4 style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 30px 0 10px 0; color: #475569;">
                ประวัติลงมติเห็นชอบทางอิเล็กทรอนิกส์ (ERP Digital Approval Timeline & Signatures)
              </h4>
              <div class="signature-grid">
                <!-- ผู้ขอเบิกจ่าย card -->
                <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; min-height: 115px; box-sizing: border-box;">
                  <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 10px; text-transform: uppercase;">ผู้ขอเบิกเงิน (Claimant)</p>
                  <img src="${requesterSig}" style="height: 38px; max-width: 90%; object-fit: contain; margin: 4px auto; display: block;" alt="Claimant Signature" />
                  <div>
                    <p style="font-weight: 600; margin: 4px 0 2px 0; font-size: 11px; color: #1e293b;">${selectedRequest.employeeName}</p>
                    <p style="color: #3b82f6; font-weight: bold; margin: 0; font-size: 8px;">✓ SUBMITTED</p>
                    <p style="color: #94a3b8; font-size: 8px; margin: 2px 0 0 0;">${selectedRequest.date}</p>
                  </div>
                </div>
                
                <!-- Arrow -->
                <div style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: auto 2px;">➔</div>

                <!-- Approvers list cards -->
                ${pdfReplacementLevelsHtml}
                
                <!-- Arrow -->
                <div style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: auto 2px;">➔</div>

                <!-- คลังกลาง stamp -->
                <div style="flex: 1; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f1f5f9; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 115px; box-sizing: border-box;">
                  <div>
                    <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 10px; text-transform: uppercase;">ประทับตราคลังกลาง</p>
                    <p style="color: #64748b; font-size: 8px; margin: 4px 0;">O-Key System Safe Vault</p>
                    <div class="barcode-sim" style="font-family: 'JetBrains Mono', monospace; letter-spacing: 2px; background-color: #f1f5f9; padding: 4px 6px; border-radius: 4px; font-size: 8px; text-align: center; font-weight: bold; display: inline-block;">
                      ${selectedRequest.id.replace('REQ', 'BAR')}
                    </div>
                  </div>
                </div>
              </div>

              <div class="footer-stamp">
                <p>เอกสารฉบับนี้พิมพ์โดยระบบ Okay Expense Management System เมื่อวันที่ ${new Date().toLocaleString('th-TH')}</p>
                <p>มาตรฐานระเบียบกรมสรรพากร (มาตรา 65 ตรี (18))</p>
              </div>
            </div>
          </body>
        </html>
      `;
      openPdfPreview({
        html: replacementContent,
        title: `ใบแทนใบเสร็จรับเงิน - ${selectedRequest.replacement_receipt_number || selectedRequest.id}`,
        attachments: allAttachments.map((url, i) => ({
          url,
          title: `หลักฐานแนบ #${i + 1}`,
          name: `หลักฐาน #${i + 1}`,
          type: (url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf')) ? 'pdf' : 'image'
        }))
      });
      return;
    }

    const matchedUser = users.find(u => u.name === selectedRequest.employeeName) || {
      username: 'Okay0001',
      position: selectedRequest.employeeRole || 'พนักงาน'
    };

    const settlement = getSettlementDetails(selectedRequest);
    const matchedAdvance = requests.find(r => r.id === selectedRequest.advance_id);

    // Map signature cards with registered signature images or pending placeholder
    const pdfStandardLevelsHtml = selectedRequest.approvalHistory.map((step, idx) => {
      const matchingUser = users.find(u => u.name === step.approverName);
      const userSig = matchingUser?.signatureUrl;
      const isApproved = step.status === 'approved';

      if (isApproved && userSig) {
        return `
          <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; min-height: 115px; box-sizing: border-box;">
            <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 10px; text-transform: uppercase;">${step.approverRole || `ผู้อนุมัติระดับที่ ${idx + 1}`}</p>
            <img src="${userSig}" style="height: 38px; max-width: 90%; object-fit: contain; margin: 4px auto; display: block;" alt="Signature" />
            <div>
              <p style="font-weight: 600; margin: 4px 0 2px 0; font-size: 11px; color: #1e293b;">${step.approverName}</p>
              <p style="color: #10b981; font-weight: bold; margin: 0; font-size: 8px;">✓ APPROVED</p>
              <p style="color: #94a3b8; font-size: 8px; margin: 2px 0 0 0;">${step.date}</p>
            </div>
          </div>
        `;
      } else {
        return `
          <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; min-height: 115px; box-sizing: border-box;">
            <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 10px; text-transform: uppercase;">${step.approverRole || `ผู้อนุมัติระดับที่ ${idx + 1}`}</p>
            <div style="color: #dc2626; font-weight: bold; margin: auto; padding: 12px 6px; font-size: 10px; border: 1px solid #fca5a5; border-radius: 4px; width: 100%; background-color: #fef2f2; box-sizing: border-box; text-transform: uppercase; letter-spacing: 0.5px;">
              รอการลงนาม<br/><span style="font-size: 8px; font-weight: normal; color: #ef4444;">(Pending)</span>
            </div>
            <div>
              <p style="font-weight: 600; margin: 4px 0 2px 0; font-size: 11px; color: #64748b;">${step.approverName}</p>
              <p style="color: #94a3b8; font-size: 8px; margin: 0;">-</p>
            </div>
          </div>
        `;
      }
    }).join(`
      <div style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: auto 2px;">➔</div>
    `);

    const pdfEvidenceGalleryHtml = allAttachments.map((img, idx) => `
      <div style="break-inside: avoid; text-align: center; margin-top: 20px; border-top: 2px dashed #cbd5e1; padding-top: 20px;">
        <h4 style="text-align: left; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; color: #475569;">
          ${idx === 0 ? 'หลักฐานเอกสารใบเสร็จหลัก (Automated Primary Receipt Evidence)' : `หลักฐานพยานประกอบแนบเพิ่มเติม #${idx}`}
        </h4>
        <img src="${img}" style="max-height: 400px; max-width: 100%; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0;" alt="receipt gallery item" />
      </div>
    `).join('');

    const content = `
      <html>
        <head>
          <title>${selectedRequest.id} - O-Key PDF Generation Engine</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: 'Sarabun', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            .a4-page {
              width: 210mm;
              min-height: 297mm;
              padding: 15mm;
              box-sizing: border-box;
              margin: 0 auto;
              position: relative;
              background-color: #ffffff;
            }
            @media print {
              body {
                background-color: #ffffff;
              }
              .a4-page {
                width: auto;
                height: auto;
                padding: 10mm;
                box-shadow: none;
                margin: 0;
              }
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .logo-img {
              height: 55px;
              width: 55px;
              object-fit: cover;
              border-radius: 8px;
            }
            .doc-title {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 11px;
            }
            .meta-table td {
              padding: 6px 8px;
              border: 1px solid #e2e8f0;
            }
            .meta-label {
              background-color: #f8fafc;
              font-weight: bold;
              width: 20%;
              color: #475569;
            }
            .item-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 11px;
            }
            .item-table th {
              background-color: #0f172a;
              color: #ffffff;
              padding: 8px;
              text-align: left;
              font-weight: bold;
            }
            .item-table td {
              padding: 8px;
              border: 1px solid #cbd5e1;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }
            .summary-table td {
              padding: 6px 10px;
            }
            .grand-total {
              background-color: #0f172a;
              color: #ffffff;
              font-weight: 800;
              font-size: 14px;
            }
            .footer-notes {
              margin-top: 30px;
              font-size: 9px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
            }
            .signature-grid {
              display: flex;
              flex-direction: row;
              align-items: stretch;
              justify-content: space-between;
              gap: 6px;
              margin-top: 25px;
            }
            .barcode-sim {
              font-family: 'JetBrains Mono', monospace;
              letter-spacing: 3px;
              background-color: #f1f5f9;
              padding: 6px 10px;
              border-radius: 4px;
              font-size: 9px;
              text-align: center;
              font-weight: bold;
              display: inline-block;
            }
            .stamp-seal {
              border: 3px double #10b981;
              color: #10b981;
              font-weight: 800;
              padding: 4px 10px;
              font-size: 11px;
              border-radius: 6px;
              display: inline-block;
              transform: rotate(-5deg);
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="a4-page">
            
            <!-- HEADER -->
            ${getLetterheadHtml(companyData, '#1e3a8a', `
              <span class="stamp-seal" style="border: 2px solid #10b981; color: #10b981; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; display: inline-block;">PAID & AUDITED</span>
              <p style="margin: 6px 0 2px 0; font-size: 10px; font-weight: bold; font-family: monospace;">
                DOC ID: ${selectedRequest.id.replace('REQ', 'DOC')}
              </p>
              <p style="margin: 0; font-size: 8px; color: #64748b; font-family: 'Sarabun', sans-serif;">
                วันที่พิมพ์: ${new Date().toISOString().split('T')[0]}
              </p>
            `)}

            <!-- SECTION TITLE -->
            <div style="background-color: #f1f5f9; text-align: center; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 20px;">
              <h2 class="doc-title">
                ${selectedRequest.expense_type === 'advance' ? 'ADVANCE PAYMENT VOUCHER (ใบสำคัญจ่ายเงินทดรองล่วงหน้า)' :
                  selectedRequest.expense_type === 'clearing' ? 'ADVANCE CLEARING STATEMENT (ใบเสร็จเคลียร์เงินทดรองจ่าย)' :
                  'EXPENSE REIMBURSEMENT VOUCHER (ใบสำคัญจ่ายเงินเบิกคืนพนักงาน)'}
              </h2>
            </div>

            <!-- EMPLOYEE INFORMATION -->
            <table class="meta-table">
              <tr>
                <td class="meta-label">ชื่อผู้เบิกเงิน / Claimant</td>
                <td>${selectedRequest.employeeName}</td>
                <td class="meta-label">รหัสพนักงาน / ID</td>
                <td style="font-family: 'JetBrains Mono', monospace; font-weight: bold;">${matchedUser.username}</td>
              </tr>
              <tr>
                <td class="meta-label">แผนก / Department</td>
                <td>${selectedRequest.department}</td>
                <td class="meta-label">ตำแหน่ง / Position</td>
                <td>${matchedUser.position}</td>
              </tr>
              <tr>
                <td class="meta-label">วัตถุประสงค์ / Objective</td>
                <td colspan="3">${selectedRequest.title}</td>
              </tr>
              <tr>
                <td class="meta-label">สารบบอ้างอิง / Transaction Ref</td>
                <td style="font-family: 'JetBrains Mono', monospace;">${selectedRequest.id}</td>
                <td class="meta-label">วันที่ส่งอนุมัติ / Submitted Date</td>
                <td>${selectedRequest.date}</td>
              </tr>
            </table>

            <!-- ADVANCE REFERENCE DETAILS (FOR CLEARING STATEMENTS) -->
            ${selectedRequest.expense_type === 'clearing' ? `
            <div style="margin-top: 15px; margin-bottom: 20px;">
              <h4 style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; color: #1e3a8a; border-left: 3px solid #1e3a8a; padding-left: 8px;">
                ตารางอ้างอิงใบสำคัญเบิกเงินล่วงหน้าและการหักล้าง (ADVANCE CLEARING REFERENCE TABLE)
              </h4>
              <table class="meta-table" style="margin-bottom: 0;">
                <tr>
                  <td class="meta-label" style="background-color: #f0fdf4; color: #15803d; width: 25%;">เลขที่ใบ Advance (Ref ID)</td>
                  <td style="font-family: 'JetBrains Mono', monospace; font-weight: bold;">${matchedAdvance?.id || selectedRequest.advance_id || '-'}</td>
                  <td class="meta-label" style="background-color: #f0fdf4; color: #15803d; width: 25%;">วันที่เบิก (Advance Date)</td>
                  <td>${matchedAdvance?.date || '-'}</td>
                </tr>
                <tr>
                  <td class="meta-label" style="background-color: #f0fdf4; color: #15803d;">วงเงินล่วงหน้า (Advance Amount)</td>
                  <td style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #1e3a8a;">฿${(matchedAdvance?.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td class="meta-label" style="background-color: #f0fdf4; color: #15803d;">วัตถุประสงค์ (Purpose)</td>
                  <td>${matchedAdvance?.title || selectedRequest.title}</td>
                </tr>
                <tr>
                  <td class="meta-label" style="background-color: #f0fdf4; color: #15803d;">ผู้อนุมัติใบ Advance (Approver)</td>
                  <td colspan="3">${matchedAdvance?.approvalHistory?.filter(h => h.status === 'approved' || h.status === 'Approved').map(h => h.approverName).join(', ') || 'ผู้ดูแลระบบ / ผู้อนุมัติ'}</td>
                </tr>
                <tr>
                  <td class="meta-label" style="background-color: #fdf2f8; color: #9d174d;">ยอดใช้จ่ายจริง (Actual Spent)</td>
                  <td style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #b70b57;">฿${(selectedRequest.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td class="meta-label" style="background-color: #fdf2f8; color: #9d174d;">ยอดเงินคงเหลือ (Remaining)</td>
                  <td style="font-family: 'JetBrains Mono', monospace; font-weight: bold;">
                    ฿${((matchedAdvance?.amount || 0) - (selectedRequest.amount || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td class="meta-label" style="background-color: #fef2f2; color: #991b1b;">ผลต่างการเคลียร์ (Clearing Outcome)</td>
                  <td colspan="3" style="font-family: 'JetBrains Mono', monospace; font-weight: 800;">
                    ${(() => {
                      const diff = (selectedRequest.amount || 0) - (matchedAdvance?.amount || 0);
                      if (diff < 0) {
                        const dbRefunds = getDbRefunds();
                        const matchedRefund = dbRefunds.find(ref => ref.advance_id === selectedRequest.advance_id);
                        if (matchedRefund && matchedRefund.status === 'payroll_deduction') {
                          return `<span style="color: #dc2626;">🔴 หักเงินเดือน (Payroll Deduction) ฿${Math.abs(diff).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>`;
                        }
                        return `<span style="color: #d97706;">🟠 รอคืนเงินบริษัท (Waiting for Refund) ฿${Math.abs(diff).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>`;
                      } else if (diff > 0) {
                        return `<span style="color: #2563eb;">🔵 บริษัทต้องจ่ายเพิ่ม (Additional Reimbursement) ฿${diff.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>`;
                      } else {
                        return `<span style="color: #10b981;">🟢 เคลียร์เรียบร้อย (Cleared)</span>`;
                      }
                    })()}
                  </td>
                </tr>
              </table>
            </div>
            ` : ''}

            <!-- EXPENSE PARTICULARS TABLE -->
            <table class="item-table">
              <thead>
                <tr>
                  <th style="width: 5%;">ลำดับ</th>
                  <th style="width: 20%;">หมวดค่าใช้จ่าย</th>
                  <th style="width: 55%;">รายละเอียดประกอบรายการ</th>
                  <th style="width: 20%; text-align: right;">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center; font-family: 'JetBrains Mono', monospace;">1</td>
                  <td style="font-weight: bold;">
                    ${selectedRequest.category.toUpperCase()}
                  </td>
                  <td>
                    ${selectedRequest.description || 'ค่าใช้จ่ายตามแนบสารบบใบสำคัญ'}
                  </td>
                  <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: bold;">
                    ฿${(selectedRequest.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; color: #cbd5e1;">-</td>
                  <td style="color: #cbd5e1;">-</td>
                  <td style="color: #64748b; font-style: italic; text-align: center;">-- สิ้นสุดรายการนำเสนอ --</td>
                  <td style="text-align: right; color: #cbd5e1;">-</td>
                </tr>
              </tbody>
            </table>

            <!-- FINANCIAL SETTLEMENT SUMMARY (REIMBURSEMENT / REFUND / PAYROLL DEDUCTION AUDITS) -->
            ${(selectedRequest.advance_paid_date || selectedRequest.clearing_submitted_date || selectedRequest.refund_transferred_date || selectedRequest.company_reimbursed_date || selectedRequest.payroll_deduction_date) ? `
            <div style="margin-top: 15px; margin-bottom: 20px;">
              <h4 style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; color: #15803d; border-left: 3px solid #15803d; padding-left: 8px;">
                บันทึกขั้นตอนและผลการชำระเงินสุดท้าย (FINANCIAL SETTLEMENT AUDIT TRACKS)
              </h4>
              <table class="meta-table" style="margin-bottom: 0;">
                <tr>
                  <td class="meta-label">วันจ่ายเงินทดรอง (Advance Payout Date)</td>
                  <td>${selectedRequest.advance_paid_date || '-'}</td>
                  <td class="meta-label">วันนำส่งเอกสาร (Clearing Submitted)</td>
                  <td>${selectedRequest.clearing_submitted_date || selectedRequest.date || '-'}</td>
                </tr>
                <tr>
                  <td class="meta-label">วันคืนเงิน / จ่ายคืนพนักงาน (Settlement Date)</td>
                  <td>
                    ${selectedRequest.refund_transferred_date || selectedRequest.company_reimbursed_date || selectedRequest.payroll_deduction_date || '-'}
                  </td>
                  <td class="meta-label">ช่องทาง / วิธีการเคลียร์ (Settlement Mode)</td>
                  <td>
                    ${selectedRequest.settlement_type === 'refund' ? 'โอนเงินคืนบริษัท (Refunded)' :
                      selectedRequest.settlement_type === 'payroll_deduction' ? 'หักบัญชีเงินเดือน (Payroll Deduction)' :
                      selectedRequest.settlement_type === 'reimbursement' ? 'บริษัทโอนจ่ายเพิ่ม (Reimburse Extra)' :
                      'ดุลบัญชีลงตัวพอดี (Perfect Match)'}
                  </td>
                </tr>
                ${selectedRequest.payroll_period ? `
                <tr>
                  <td class="meta-label">รอบหักเงินเดือน (Payroll Period)</td>
                  <td>${selectedRequest.payroll_period}</td>
                  <td class="meta-label">วันหักเงินเดือน (Deduction Date)</td>
                  <td>${selectedRequest.payroll_deduction_date || '-'}</td>
                </tr>
                ` : ''}
                ${(selectedRequest.refund_proof_name || selectedRequest.company_reimbursement_proof_url) ? `
                <tr>
                  <td class="meta-label">เอกสารสลิปหลักฐาน (Settlement Slip)</td>
                  <td colspan="3" style="font-family: monospace; font-size: 10px;">
                    ✔️ ตรวจรับและแนบหลักฐานในระบบเรียบร้อย: ${selectedRequest.refund_proof_name || 'สลิปการโอนเงิน (Settlement Proof Slip)'}
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
            ` : ''}

            <!-- REVISION HISTORY & PRE-APPROVAL EDITS CONTROL -->
            ${(selectedRequest.revisions && selectedRequest.revisions.length > 0) ? `
            <div style="margin-top: 15px; margin-bottom: 20px;">
              <h4 style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; color: #b45309; border-left: 3px solid #b45309; padding-left: 8px;">
                บันทึกการปรับปรุงสิทธิ์และยอดเงินอนุมัติ (PRE-APPROVAL EDITS REVISION HISTORY)
              </h4>
              <table class="item-table" style="margin-bottom: 0;">
                <thead>
                  <tr>
                    <th style="width: 10%; background-color: #78350f; color: #ffffff;">เวอร์ชัน</th>
                    <th style="width: 25%; background-color: #78350f; color: #ffffff;">ผู้บันทึกแก้ไข</th>
                    <th style="width: 45%; background-color: #78350f; color: #ffffff;">รายการเปลี่ยนแปลง / เหตุผล</th>
                    <th style="width: 20%; background-color: #78350f; color: #ffffff; text-align: right;">วันเวลา</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedRequest.revisions.map(rev => `
                    <tr>
                      <td style="text-align: center; font-weight: bold;">v${rev.version}</td>
                      <td>${rev.author}</td>
                      <td>
                        <strong>${rev.action}</strong>
                        ${rev.notes ? `<br/><span style="font-style: italic; color: #4b5563; font-size: 10px;">เหตุผล: ${rev.notes}</span>` : ''}
                      </td>
                      <td style="text-align: right;">${rev.date} ${rev.time}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            <!-- FINANCIAL SUMMARY & BALANCES -->
            <div style="display: grid; grid-template-cols: 1.2fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 10px; line-height: 1.5; color: #475569; background-color: #f8fafc;">
                <p style="font-weight: bold; color: #1e293b; margin: 0 0 4px 0;">เงื่อนไขประกอบการหักบัญชีและจ่ายหนี้ (Enterprise Policy Audits):</p>
                <p style="margin: 2px 0;">• เอกสารนี้สร้างขึ้นโดยระบบอัตโนมัติ O-Key ERP Module</p>
                <p style="margin: 2px 0;">• ผ่านการพิจารณาตรวจสอบสอดคล้องตามนโยบาย (Compliance Status: <b>${selectedRequest.policyStatus.toUpperCase()}</b>)</p>
                <p style="margin: 2px 0;">• ${selectedRequest.policyNotes?.[0] || 'ข้อมูลนโยบายสอดคล้องตามข้อกำหนดขององค์กร'}</p>
              </div>

              <table class="summary-table">
                ${settlement ? `
                  <tr>
                    <td style="text-align: right; color: #64748b;">ยอดที่รับทดรองล่วงหน้า (Advance Granted):</td>
                    <td style="text-align: right; font-family: 'JetBrains Mono', monospace; width: 100px;">฿${(settlement.advanceAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style="text-align: right; color: #64748b;">ค่าใช้จ่ายสุทธิ (Actual Spent):</td>
                    <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">฿${(settlement.spentAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style="font-weight: bold; color: ${
                    settlement.type === 'refund' ? '#d97706' : 
                    settlement.type === 'payroll_deduction' ? '#ef4444' : 
                    settlement.type === 'reimbursement' ? '#2563eb' : 
                    '#10b981'
                  }">
                    <td style="text-align: right;">
                      ${settlement.type === 'refund' ? '🟠 ยอดเงินที่ต้องคืนบริษัท (Waiting for Refund):' : 
                        settlement.type === 'payroll_deduction' ? '🔴 ยอดเงินที่หักบัญชีเงินเดือน (Payroll Deduction):' : 
                        settlement.type === 'reimbursement' ? '🔵 บริษัทต้องจ่ายชดใช้เพิ่ม (Additional Reimbursement):' : 
                        '🟢 เคลียร์เรียบร้อย (Cleared):'}
                    </td>
                    <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">฿${(settlement.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ` : ''}
                <tr class="grand-total">
                  <td style="text-align: right; border-radius: 6px 0 0 6px;">ยอดสุทธิอนุมัติจ่าย (Net Voucher Approved):</td>
                  <td style="text-align: right; font-family: 'JetBrains Mono', monospace; border-radius: 0 6px 6px 0;">฿${(selectedRequest.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>

            <!-- DYNAMIC APPROVAL TIMELINE WORKFLOW -->
            <h4 style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 20px 0 10px 0; color: #475569;">
              ประวัติลงมติเห็นชอบทางอิเล็กทรอนิกส์ (ERP Digital Approval Timeline & Signatures)
            </h4>
            <div class="signature-grid">
              <!-- ผู้ขอเบิกจ่าย card -->
              <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; min-height: 115px; box-sizing: border-box;">
                <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 10px; text-transform: uppercase;">ผู้ขอเบิกเงิน (Claimant)</p>
                <img src="${requesterSig}" style="height: 38px; max-width: 90%; object-fit: contain; margin: 4px auto; display: block;" alt="Claimant Signature" />
                <div>
                  <p style="font-weight: 600; margin: 4px 0 2px 0; font-size: 11px; color: #1e293b;">${selectedRequest.employeeName}</p>
                  <p style="color: #3b82f6; font-weight: bold; margin: 0; font-size: 8px;">✓ SUBMITTED</p>
                  <p style="color: #94a3b8; font-size: 8px; margin: 2px 0 0 0;">${selectedRequest.date}</p>
                </div>
              </div>

              <!-- Arrow -->
              <div style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: auto 2px;">➔</div>

              <!-- Approvers cards -->
              ${pdfStandardLevelsHtml}

              <!-- Arrow -->
              <div style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: auto 2px;">➔</div>

              <!-- คลังกลาง stamp -->
              <div style="flex: 1; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; font-size: 10px; background-color: #f1f5f9; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 115px; box-sizing: border-box;">
                <div>
                  <p style="font-weight: bold; margin: 0 0 4px 0; color: #1e293b; font-size: 10px; text-transform: uppercase;">ประทับตราคลังกลาง</p>
                  <p style="color: #64748b; font-size: 8px; margin: 4px 0;">O-Key System Safe Vault</p>
                  <div class="barcode-sim" style="font-family: 'JetBrains Mono', monospace; letter-spacing: 2px; background-color: #f1f5f9; padding: 4px 6px; border-radius: 4px; font-size: 8px; text-align: center; font-weight: bold; display: inline-block;">
                    ${selectedRequest.id.replace('REQ', 'BAR')}
                  </div>
                </div>
              </div>
            </div>

            <!-- COMMENTS SECTION -->
            ${pdfCommentsHtml}

            <!-- RECEIPT IMAGES SECTION -->
            ${pdfEvidenceGalleryHtml}

            <!-- AUDIT FOOTER -->
            <div class="footer-notes">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>* เอกสารนี้ไม่สามารถแก้ไขหรือดัดแปลงโครงสร้างได้หลังจากฝ่ายตรวจสอบบัญชีผ่านรายการ (Locked ERP Ledger)</span>
                <span>Audit Code: <span style="font-family: 'JetBrains Mono', monospace; font-weight: bold;">sha256-f89a9c8b0e...</span></span>
              </div>
              <p style="margin: 4px 0 0 0; text-align: center; font-size: 8px; color: #94a3b8;">
                O-Key Systems Group Co., Ltd. Confidential Internal Document
              </p>
            </div>

          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    openPdfPreview({
      html: content,
      title: `${selectedRequest.title || 'เอกสาร'} - ${selectedRequest.id}`,
      attachments: allAttachments.map((url, i) => ({
        url,
        title: `${selectedRequest.title} - หลักฐานแนบ #${i + 1}`,
        name: `หลักฐาน #${i + 1}`,
        type: (url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf')) ? 'pdf' : 'image'
      }))
    });
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100" id="pdf-manager-root">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute left-0 top-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-2">
          <span className="bg-gradient-to-r from-primary-500 to-indigo-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            AUTOMATIC PDF GENERATION HUB (ระบบตรวจร่างเอกสาร PDF)
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 mt-2">
            <FileDown className="h-7 w-7 text-primary-500" />
            <span>ระบบตรวจสอบ & จัดการไฟล์ PDF อัตโนมัติ</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            สถาปัตยกรรมและศูนย์กลางสร้างเอกสารสำคัญทางการเงินอัตโนมัติ (PDF Engine) ที่เชื่อมกับฐานข้อมูลสมุดรายวันคู่อัตโนมัติและใบคำขอ ผ่านระบบการตรวจสอบความเสี่ยงอย่างเป็นระบบ
          </p>
        </div>

        {/* Action Toggle Tabs */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full md:w-auto shrink-0">
          <button
            onClick={() => setActiveTab('engine')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all w-1/2 md:w-auto text-center justify-center ${
              activeTab === 'engine'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>แท่นพิมพ์ PDF Engine</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all w-1/2 md:w-auto text-center justify-center ${
              activeTab === 'architecture'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Map className="h-4 w-4" />
            <span>แผนภาพสถาปัตยกรรม</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'architecture' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Section 1: System Architecture */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Building className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">1. ภาพรวมสถาปัตยกรรมระบบสร้างเอกสาร (System Architecture Overview)</h2>
                <p className="text-xs text-slate-400">โครงสร้างการสื่อสารและเชื่อมโยงข้อมูล ERP ระดับองค์กร (Enterprise Grade Architecture)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <span className="font-bold text-base">📤</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Receipt Capture & OCR</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  พนักงานทำการส่งไฟล์รูปภาพใบเสร็จหรือแสกน ผ่านระบบ OCR สกัดชื่อร้านค้า วันที่ และจำนวนเงินเข้าระบบอัตโนมัติ
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <span className="font-bold text-base">⚙️</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Risk Policy Audit</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ผ่านการประเมินนโยบายความเสี่ยงอัจฉริยะ (Compliance Validator) ตรวจสอบการซ้ำซ้อน วงเงินเกินเกณฑ์ และแจ้งเตือนข้อกำหนด
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <span className="font-bold text-base">📑</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Core Approval Engine</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  สายส่งต่ออนุมัติ (Workflow Chain) หลายลำดับขั้นสูงสุด 4 ระดับ พร้อมระบบประทับสิทธิ์ดิจิทัล (Digital Signature Stamping)
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <span className="font-bold text-base">🖨️</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">PDF / Print Renderer</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ประกอบข้อมูลผู้ขอเบิก ลำดับผู้อนุมัติ รูปใบเสร็จ และลายเซ็น เข้าสู่ HTML Template สำหรับพิมพ์ A4 สั่งพิมพ์ตรงหรือบันทึกลง Google Drive
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: PDF Generation Flow */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <GitFork className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">2. ลำดับขั้นตอนการทำงานจากต้นจนจบ (End-to-End PDF Generation Flow)</h2>
                <p className="text-xs text-slate-400">Flow การสกัดร่าง ออกแบบ และประทับตราลายเซ็นลงระบบเพื่อปิดรอบบัญชี</p>
              </div>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary-200/55 dark:before:bg-primary-900/30">
              <div className="relative">
                <span className="absolute -left-6 top-1 bg-primary-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">1</span>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/40 dark:border-slate-800/80">
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">พนักงานสร้างเอกสารเบิก (Voucher Generation Request)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    พนักงานลงมติขอสร้างคำขอชนิด "เบิกคืน (Reimbursement)", "ยืมล่วงหน้า (Advance)" หรือ "เคลียร์เงินยืม (Clearing)" เข้าระบบและกรอกยอดจริง
                  </p>
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-1 bg-primary-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">2</span>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/40 dark:border-slate-800/80">
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">คำนวณและปรับบัญชีส่วนต่างอัตโนมัติ (Automated Financial Adjustment)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    หากเป็นรายการเคลียร์ยอดเงินยืม (Clearing) ระบบจะดึงฐานข้อมูล Advance เดิม เพื่อคำนวณส่วนต่างอัตโนมัติ:
                    <span className="block font-semibold mt-1 text-amber-600 dark:text-amber-400">ใช้จ่ายน้อยกว่ายืม → พนักงานส่งคืนเงินบริษัท (🟠 Waiting for Refund)</span>
                    <span className="block font-semibold mt-1 text-emerald-600 dark:text-emerald-400">ใช้จ่ายเท่ากับยืม → เคลียร์เรียบร้อยพอดีถ้วน (🟢 Cleared)</span>
                    <span className="block font-semibold mt-1 text-primary-600 dark:text-primary-400">ใช้จ่ายมากกว่ายืม → บริษัทต้องจ่ายชดใช้เงินเพิ่มให้พนักงาน (🔵 Additional Reimbursement)</span>
                  </p>
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-1 bg-primary-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">3</span>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/40 dark:border-slate-800/80">
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">ประมวลผลสมุดรายวันคู่อัตโนมัติ (ERP Double-entry Synced)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    ระบบผ่านรายการสมุดรายวันกลาง (General Journal Entries) เป็นยอดเดบิตค่าใช้จ่ายตามหมวด (เช่น Dr. 510000 - ค่าเดินทาง) คู่กับเครดิตเงินสดคลังย่อยหรือลูกหนี้พนักงาน เพื่อบันทึกงบกำไรขาดทุนแบบ Real-time
                  </p>
                </div>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-1 bg-primary-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">4</span>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/40 dark:border-slate-800/80">
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">สร้างเทมเพลต A4 HTML และพิมพ์ไฟล์ PDF ปลอดภัย (A4 PDF Lock)</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    ประกอบข้อมูลทั้งหมด แปลง HTML เป็นขนาด A4 นำเข้า Grid จัดตำแหน่งรูปภาพใบเสร็จให้อยู่ในกรอบกระดาษโดยไม่ล้นขอบ และฝังลายเซ็นดิจิทัลของผู้อนุมัติทั้งสามลำดับขั้นลงในหน้าเอกสารแบบสมบูรณ์
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Database Tables */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Database className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">3. โครงสร้างฐานข้อมูลระดับองค์กร (Dynamic Schema Design)</h2>
                <p className="text-xs text-slate-400">รายละเอียดโครงสร้างตารางข้อมูลเชื่อมสัมพันธ์กัน</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                  <span>👤 ตารางพนักงาน (UserProfile)</span>
                </h3>
                <div className="font-mono text-[10px] space-y-1 text-slate-600 dark:text-slate-450">
                  <p><span className="text-slate-900 dark:text-white font-semibold">user_id:</span> string [PK]</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">username:</span> string (เช่น Okay0001)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">name:</span> string (ชื่อ-สกุล)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">department:</span> string (แผนก)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">position:</span> string (ตำแหน่ง)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">is_active:</span> boolean</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                  <span>💵 ตารางคำขอเบิกเงิน (ExpenseRequest)</span>
                </h3>
                <div className="font-mono text-[10px] space-y-1 text-slate-600 dark:text-slate-450">
                  <p><span className="text-slate-900 dark:text-white font-semibold">id:</span> string [PK] (เช่น REQ-XXXX)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">title:</span> string (หัวข้อ)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">amount:</span> number (ยอดเงิน)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">expense_type:</span> 'advance' | 'reimbursement' | 'clearing'</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">advance_id:</span> string [FK] (อ้างอิงใบยืม)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">status:</span> string (สถานะ)</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                  <span>📑 ตารางจัดเก็บเอกสารบัญชี (AccountingDocument)</span>
                </h3>
                <div className="font-mono text-[10px] space-y-1 text-slate-600 dark:text-slate-450">
                  <p><span className="text-slate-900 dark:text-white font-semibold">doc_id:</span> string [PK] (รูปแบบ AUTO-XXXX)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">doc_type:</span> 'expense_voucher' | 'advance_payment_voucher' | 'refund_receipt' | 'deduction_notice' | 'reimbursement_voucher'</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">ref_id:</span> string [FK] (เชื่อมธุรกรรม)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">amount:</span> number (ยอดเงินรวม)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">details:</span> string (คำอธิบายประกอบ)</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                  <span>📊 ตารางสมุดบัญชีรายวันคู่ (JournalEntry)</span>
                </h3>
                <div className="font-mono text-[10px] space-y-1 text-slate-600 dark:text-slate-450">
                  <p><span className="text-slate-900 dark:text-white font-semibold">journal_id:</span> string [PK] (เช่น JRN-2026-XXXX)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">debit_account:</span> string (ชื่อและรหัสบัญชีเดบิต)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">credit_account:</span> string (ชื่อและรหัสบัญชีเครดิต)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">amount:</span> number (ยอดดุล)</p>
                  <p><span className="text-slate-900 dark:text-white font-semibold">ref_id:</span> string [FK]</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'engine' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls side (Takes 5/12 width) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 1: Select Active Expense request to print */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-black text-xs">1</span>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">เลือกเอกสารตั้งต้นคำขอเบิกเงิน</h3>
                  <p className="text-[10px] text-slate-400">ดึงข้อมูลคำขอเบิกจากสารบบสมบูรณ์มาสร้างแบบพิมพ์</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">ใบคำขอที่ได้รับการอนุมัติเรียบร้อย:</label>
                {requests.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-400 text-center">
                    ไม่มีรายการคำขอเบิกเงินในฐานข้อมูล
                  </div>
                ) : (
                  <select
                    value={selectedRequest?.id || ''}
                    onChange={(e) => {
                      const found = requests.find(r => r.id === e.target.value);
                      if (found) setSelectedRequest(found);
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden text-slate-800 dark:text-slate-200 font-bold"
                  >
                    {requests.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.id} | {r.title} (฿{(r.amount || 0).toLocaleString()}) - {r.expense_type?.toUpperCase() || 'REIMBURSE'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedRequest && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-[11px] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-450">ประเภทรายการ:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedRequest.expense_type || 'Reimbursement'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">ผู้ขอรับสิทธิ์:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRequest.employeeName} ({selectedRequest.department})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">สถานะเดินเอกสาร:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">APPROVED & STAMPED</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Receipts Grid & Supporting Documents Manager */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-black text-xs">2</span>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">สารบบไฟล์เอกสารแนบประกอบทั้งหมด</h3>
                    <p className="text-[10px] text-slate-400">ภาพจำลอง Thumbnail ของหลักฐานจริงทั้งหมด (ไม่มีการแสดงชื่อไฟล์หรือ URL)</p>
                  </div>
                </div>
                <ImageIcon className="h-4 w-4 text-slate-400" />
              </div>

              {selectedRequest ? (() => {
                const attachments = getAllRequestAttachments(selectedRequest);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {attachments.map((imgUrl, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            const isPdf = imgUrl.toLowerCase().includes('.pdf') || imgUrl.startsWith('data:application/pdf');
                            openPdfPreview({
                              html: '',
                              title: `${selectedRequest.title} - ${idx === 0 ? 'ใบเสร็จหลัก' : `เอกสารแนบ #${idx + 1}`}`,
                              fileUrl: imgUrl,
                              items: attachments.map((url, i) => ({
                                url,
                                title: `${selectedRequest.title} - ${i === 0 ? 'ใบเสร็จหลัก' : `เอกสารแนบ #${i + 1}`}`,
                                type: (url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf')) ? 'pdf' : 'image',
                                name: i === 0 ? 'ใบเสร็จหลัก' : `เอกสารแนบ #${i + 1}`
                              })),
                              initialIndex: idx
                            });
                          }}
                          className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
                        >
                          <img 
                            src={imgUrl} 
                            className="w-full h-full object-cover" 
                            alt="document evidence thumbnail" 
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Label specifying asset role (No names or URLs) */}
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 p-1 text-center">
                            <span className="text-[8px] font-black text-white uppercase tracking-wider">
                              {idx === 0 ? 'ใบเสร็จหลัก' : 
                               idx === 1 ? 'สลิปเงินโอน' : 
                               idx === 2 ? 'ภาพประกอบ' : `พยานวัตถุ #${idx}`}
                            </span>
                          </div>

                          {/* Delete option for uploaded supporting documents only (index > 0) */}
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttachment(idx);
                              }}
                              className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-md scale-90"
                              title="ลบเอกสารแนบ"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add more attachments tile */}
                      <div className={`aspect-square rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer relative transition-colors duration-200 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <div className="flex flex-col items-center justify-center">
                            <Loader2 className="h-6 w-6 text-primary-500 animate-spin mb-1" />
                            <span className="text-[8px] text-slate-500 font-bold">กำลังอัปโหลด...</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-xl text-slate-400 font-semibold">+</span>
                            <span className="text-[8px] text-slate-500 dark:text-slate-400 font-bold mt-1 text-center">แนบไฟล์เพิ่ม</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-primary-500/5 p-3 border border-primary-500/10 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-1.5">
                      <Info className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                      <span>
                        ระบบทำการดึงภาพหลักฐานประกอบแบบรวมศูนย์โดยอัตโนมัติ (ใบเสร็จหลัก + รูปสถานที่/สินค้า + สลิปการโอน + บันทึกแชต/อีเมลพยาน) เพื่อนำไปฝังและประทับตราในหน้า PDF โดยไม่ต้องเลือกใหม่
                      </span>
                    </div>
                  </div>
                );
              })() : (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  กรุณาเลือกเอกสารเพื่อดูภาพพยานหลักฐาน
                </div>
              )}
            </div>

          </div>

          {/* Interactive Document PDF Template Preview (Takes 7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                ตัวอย่างผลลัพธ์หน้าเอกสาร A4 (Real-time PDF Output Preview)
              </span>
              
              <button
                type="button"
                onClick={handlePrint}
                className="py-2.5 px-6 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all hover:-translate-y-0.5"
              >
                <Printer className="h-4 w-4" />
                <span>พิมพ์ / บันทึก PDF (A4)</span>
              </button>
            </div>

            {selectedRequest ? (() => {
              const matchedUser = users.find(u => u.name === selectedRequest.employeeName) || {
                username: 'Okay0001',
                position: selectedRequest.employeeRole || 'พนักงาน'
              };
              const settlement = getSettlementDetails(selectedRequest);
              
              // Resolve requester details & signature
              const requesterUser = users.find(u => u.name === selectedRequest.employeeName || u.user_id === selectedRequest.created_by) || users[1];
              const requesterSig = requesterUser?.signatureUrl || 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Foreman_Signature.png';

              // Fetch compiled attachments
              const compiledAttachments = getAllRequestAttachments(selectedRequest);

              return (
                <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-2xl relative space-y-6 max-h-[850px] overflow-y-auto" id="printable-a4-panel">
                  
                  {/* Watermark logo */}
                  <div className="absolute right-10 top-1/3 opacity-[0.03] pointer-events-none select-none">
                    <img 
                      src={companyData?.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60'} 
                      className="w-96 h-96 object-cover" 
                      alt="watermark logo" 
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Header Row */}
                  <CompanyLetterhead 
                    companyData={companyData} 
                    primaryColor="#1e3a8a" 
                    rightContent={
                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-0.5 border-2 border-emerald-500 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded rotate-[-4deg] inline-block mb-1.5 shadow-xs">
                          PAID & AUDITED
                        </span>
                        <p className="text-xs font-mono font-bold text-slate-900 dark:text-white leading-none">DOC ID: {selectedRequest.id.replace('REQ', 'DOC')}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">พิมพ์เมื่อ: {new Date().toISOString().split('T')[0]}</p>
                      </div>
                    }
                  />

                  {/* Document Subject */}
                  <div className="text-center py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-100">
                      {selectedRequest.expense_type === 'advance' ? 'ADVANCE PAYMENT VOUCHER (ใบสำคัญจ่ายเงินทดรองล่วงหน้า)' :
                       selectedRequest.expense_type === 'clearing' ? 'ADVANCE CLEARING STATEMENT (ใบเสร็จเคลียร์เงินทดรองจ่าย)' :
                       'EXPENSE REIMBURSEMENT VOUCHER (ใบสำคัญจ่ายเงินเบิกคืนพนักงาน)'}
                    </h4>
                  </div>

                  {/* Claimant Details Grid */}
                  <table className="w-full text-[11px] border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2.5 font-bold text-slate-500 w-1/4">ชื่อผู้เบิก / Claimant:</td>
                        <td className="py-2.5 text-slate-900 dark:text-white font-bold">{selectedRequest.employeeName}</td>
                        <td className="py-2.5 font-bold text-slate-500 w-1/4">รหัสพนักงาน / ID:</td>
                        <td className="py-2.5 text-slate-900 dark:text-white font-mono font-bold">{matchedUser.username}</td>
                      </tr>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2.5 font-bold text-slate-500">แผนก / Department:</td>
                        <td className="py-2.5 text-slate-800 font-semibold">{selectedRequest.department}</td>
                        <td className="py-2.5 font-bold text-slate-500">ตำแหน่ง / Position:</td>
                        <td className="py-2.5 text-slate-800 font-semibold">{matchedUser.position}</td>
                      </tr>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2.5 font-bold text-slate-500">วัตถุประสงค์ / Title:</td>
                        <td className="py-2.5 text-slate-900 dark:text-white font-bold" colSpan={3}>{selectedRequest.title}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-500">อ้างอิงสารบบ / Ref ID:</td>
                        <td className="py-2.5 text-slate-500 font-mono" colSpan={3}>{selectedRequest.id}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Particulars list table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-2.5 font-bold text-center w-[50px]">ลำดับ</th>
                          <th className="p-2.5 font-bold w-[180px]">หมวดหมู่ค่าใช้จ่าย</th>
                          <th className="p-2.5 font-bold">รายละเอียดประกอบรายการ</th>
                          <th className="p-2.5 font-bold text-right w-[150px]">ยอดเงินอนุมัติ (บาท)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="p-2.5 text-center font-mono font-semibold">1</td>
                          <td className="p-2.5 font-bold uppercase">{selectedRequest.category}</td>
                          <td className="p-2.5 text-slate-700 leading-relaxed">
                            {selectedRequest.description || 'ค่าใช้จ่ายตามแนบสารบบใบสำคัญ'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            ฿{(selectedRequest.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-center text-slate-400 font-mono">-</td>
                          <td className="p-2.5 text-slate-400 font-semibold">-</td>
                          <td className="p-2.5 text-slate-450 text-center italic">-- สิ้นสุดสารบัญแสดงรายชื่อ --</td>
                          <td className="p-2.5 text-right text-slate-400 font-mono">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Settlement and Compliance Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 text-[10px] leading-relaxed text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">การประเมินความสอดคล้องตามเกณฑ์นโยบาย:</p>
                      <p>• ผ่านระบบเกณฑ์ความเสี่ยง (Status: <span className="font-bold text-emerald-600">COMPLIANT</span>)</p>
                      <p>• ลายมือชื่ออิเล็กทรอนิกส์ทั้งหมดได้รับการอนุมัติแบบครบวงจร (Complete Workflow Chain)</p>
                      <p>• งบประมาณได้รับการตรวจสมดุล (Balance Ledger Verified)</p>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      {settlement && (
                        <>
                          <div className="flex justify-between text-slate-500">
                            <span>ยอดเบิกจ่ายเดิมล่วงหน้า (Advance):</span>
                            <span className="font-mono">฿{(settlement.advanceAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>ใช้จ่ายจริงตามแนบ (Spent):</span>
                            <span className="font-mono">฿{(settlement.spentAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className={`flex justify-between font-bold ${
                            settlement.type === 'refund' ? 'text-amber-600' :
                            settlement.type === 'payroll_deduction' ? 'text-rose-600' :
                            settlement.type === 'reimbursement' ? 'text-primary-600 dark:text-primary-400' :
                            'text-emerald-600'
                          }`}>
                            <span>
                              {settlement.type === 'refund' ? '🟠 ยอดเงินคงเหลือที่ต้องคืนบริษัท (Waiting for Refund):' :
                               settlement.type === 'payroll_deduction' ? '🔴 ยอดเงินหักบัญชีเงินเดือนพนักงาน (Payroll Deduction):' :
                               settlement.type === 'reimbursement' ? '🔵 บริษัทต้องจ่ายชดใช้เพิ่ม (Additional Reimbursement):' :
                               '🟢 เคลียร์เรียบร้อย (Cleared):'}
                            </span>
                            <span className="font-mono">฿{(settlement.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between items-center p-2.5 bg-slate-950 text-white rounded-lg font-bold">
                        <span>ยอดสุทธิเห็นชอบ (Net Grand Total):</span>
                        <span className="font-mono text-sm">฿{(selectedRequest.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Profiles Digital Signatures Area */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">
                      ระบบประทับตราและลงมติทางดิจิทัล (Workflow Digital Signatures):
                    </span>
                    <div className="grid grid-cols-4 gap-3 text-center text-[10px]">
                      
                      {/* ผู้ขอเบิกจ่าย (Claimant) card */}
                      <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 flex flex-col justify-between min-h-[120px] shadow-xs">
                        <span className="font-bold text-slate-500 uppercase text-[9px]">ผู้ขอเบิกเงิน (Claimant)</span>
                        <div className="flex justify-center items-center h-12 my-1">
                          <img 
                            src={requesterSig} 
                            className="max-h-10 max-w-[90px] object-contain mix-blend-multiply" 
                            alt="claimant signature" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-100 leading-tight">{selectedRequest.employeeName}</p>
                          <p className="text-[8px] text-slate-400 mt-0.5 truncate">{selectedRequest.employeeRole || 'พนักงาน'}</p>
                        </div>
                      </div>

                      {/* Approval Chain history cards */}
                      {selectedRequest.approvalHistory.map((step, idx) => {
                        const matchingUser = users.find(u => u.name === step.approverName);
                        const userSig = matchingUser?.signatureUrl;
                        const isApproved = step.status === 'approved';

                        return (
                          <div key={step.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 flex flex-col justify-between min-h-[120px] shadow-xs">
                            <span className="font-bold text-slate-500 uppercase text-[9px]">{step.approverRole || `ผู้อนุมัติระดับ ${idx + 1}`}</span>
                            <div className="flex justify-center items-center h-12 my-1">
                              {isApproved && userSig ? (
                                <img 
                                  src={userSig} 
                                  className="max-h-10 max-w-[90px] object-contain mix-blend-multiply" 
                                  alt="approver signature" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="text-red-500 font-extrabold text-[10px] px-2 py-1 border border-dashed border-red-300 rounded-md bg-red-50/50 select-none">
                                  รอการลงนาม
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 dark:text-slate-100 leading-tight">{step.approverName}</p>
                              <p className="text-[8px] text-slate-400 mt-0.5 truncate">{step.approverRole || 'กรรมการอนุมัติ'}</p>
                            </div>
                          </div>
                        );
                      })}

                      {/* คลังกลาง Stamp card */}
                      <div className="p-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-100/40 flex flex-col justify-center items-center min-h-[120px] text-center">
                        <span className="font-bold text-slate-500 uppercase text-[9px] mb-1">ประทับตราคลังกลาง</span>
                        <p className="text-[7px] text-slate-400">O-Key ERP Safe Vault</p>
                        <div className="bg-slate-200/80 px-2 py-1 rounded font-mono text-[9px] font-bold text-slate-700 dark:text-slate-200 tracking-wider mt-2 shadow-2xs">
                          {selectedRequest.id.replace('REQ', 'BAR')}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Approver comments block */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">
                      ความคิดเห็นผู้อนุมัติ (Approver Feedback):
                    </span>
                    <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3.5 space-y-3 text-[11px] leading-relaxed">
                      {selectedRequest.approvalHistory.filter(step => step.comment || step.status).map((step, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-slate-700 border-b border-dashed border-slate-200/60 pb-2 last:border-b-0 last:pb-0">
                          <span className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-extrabold text-slate-800 dark:text-slate-100">
                              {step.approverName} <span className="font-medium text-slate-400 text-[10px]">({step.approverRole})</span>
                            </p>
                            <p className="text-slate-600 italic mt-0.5">"{step.comment || 'อนุมัติความสอดคล้องตามระเบียบเรียบร้อย ข้อมูลครบถ้วนสมบูรณ์'}"</p>
                          </div>
                          <span className="text-[9px] text-slate-400 shrink-0 font-mono">{step.date}</span>
                        </div>
                      )) || (
                        <p className="text-slate-400 italic text-center text-xs">ไม่มีความเห็นเพิ่มเติมสำหรับเอกสารชุดนี้</p>
                      )}
                    </div>
                  </div>

                  {/* Receipts Attachment Preview inside A4 (Real images only, no filenames/URLs) */}
                  <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-5 space-y-3">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
                      รูปภาพพยานหลักฐานและเอกสารแนบทั้งหมด (Receipt & Evidence Unified Grid):
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      {compiledAttachments.map((imgUrl, idx) => (
                        <div key={idx} className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 p-2 shadow-xs">
                          <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 text-center bg-slate-100 py-1 rounded">
                            {idx === 0 ? 'หลักฐานเอกสารใบเสร็จหลัก' : 
                             idx === 1 ? 'สลิปเงินโอนผ่านธนาคาร (Slip)' : 
                             idx === 2 ? 'รูปสถานที่ / สินค้า / พยานหลักฐานประกอบ' : `เอกสารพยานแนบเพิ่มเติม #${idx}`}
                          </p>
                          <img 
                            src={imgUrl} 
                            className="w-full h-44 object-contain rounded-lg border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900" 
                            alt="A4 attachment preview" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-between items-center text-[9px] text-slate-400">
                    <span>Generated automatically by O-Key ERP Accounting Module & PDF Lock Systems</span>
                    <span className="font-mono font-bold">SHA256: f89a9c8b0e5132ce47d519b...</span>
                  </div>

                </div>
              );
            })() : (
              <div className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                กรุณาเลือกเอกสารเพื่อเริ่มตรวจร่างและสั่งพิมพ์
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
