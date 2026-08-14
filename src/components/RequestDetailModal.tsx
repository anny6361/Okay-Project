import React, { useState } from 'react';
import { openPdfPreview } from '../lib/pdf-preview';
import { 
  X, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  MessageSquare,
  ArrowRight,
  Send,
  Ticket,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  Download,
  ExternalLink,
  FileSpreadsheet
} from 'lucide-react';
import { ExpenseRequest, Comment } from '../types';
import { getRealReceiptImages, getDbRequests, getClearingStatusInfo, getRealWorkflowStepInfo, getSafePreviewUrl } from '../data/db';

function ReceiptViewer({ receiptName, amount, title, date, id }: { receiptName: string; amount: number; title: string; date: string; id: string; key?: React.Key }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handlePrint = () => {
    const printWindow: any = {
      document: {
        open: () => { printWindow._html = ''; },
        write: (html: string) => { printWindow._html = (printWindow._html || '') + html; },
        close: () => { openPdfPreview(printWindow._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>พิมพ์ใบเสร็จ - ${id}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; display: flex; justify-content: center; }
              .receipt { border: 2px solid #ccc; padding: 30px; width: 400px; font-family: monospace; }
              .text-center { text-align: center; }
              .bold { font-weight: bold; }
              .flex { display: flex; justify-content: space-between; margin: 10px 0; }
              .divider { border-top: 1px dashed #000; margin: 15px 0; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="receipt">
              <div class="text-center">
                <h3>OKAY EXPENSE AUDITOR</h3>
                <p>E-Tax Receipt / Invoice Statement</p>
                <p>Document ID: ${id}</p>
              </div>
              <div class="divider"></div>
              <div class="flex"><span>ร้านค้า:</span><span class="bold">${title}</span></div>
              <div class="flex"><span>วันที่เบิกจ่าย:</span><span>${date}</span></div>
              <div class="flex"><span>ชื่อไฟล์แนบ:</span><span>${receiptName}</span></div>
              <div class="divider"></div>
              <div class="flex bold" style="font-size: 16px;">
                <span>ยอดเงินรวมทั้งสิ้น:</span>
                <span>฿${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="divider"></div>
              <p class="text-center" style="font-size: 10px; color: #555;">อนุมัติโดยระบบความปลอดภัย OKEY Enterprise</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = () => {
    const receiptContent = `
==============================================
            OKAY EXPENSE RECEIPT STATEMENT
==============================================
Document ID  : ${id}
Merchant Name: ${title}
Date         : ${date}
Attachment   : ${receiptName}
Amount       : THB ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
Status       : Verified & Audited
==============================================
    `;
    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Receipt-${id}-${receiptName || 'statement'}.txt`;
    link.click();
  };

  return (
    <div className="border border-slate-250 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-900 text-white flex flex-col h-[340px] shadow-lg">
      {/* Control bar */}
      <div className="bg-slate-950 px-3 py-2 flex items-center justify-between border-b border-slate-800">
        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">{receiptName}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            type="button"
            onClick={handleZoomOut} 
            title="Zoom Out"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-bold font-mono px-1 min-w-[36px] text-center text-slate-400">{zoom}%</span>
          <button 
            type="button"
            onClick={handleZoomIn} 
            title="Zoom In"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-slate-800" />
          <button 
            type="button"
            onClick={handleRotate} 
            title="Rotate"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button 
            type="button"
            onClick={handlePrint} 
            title="Print"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button 
            type="button"
            onClick={handleDownload} 
            title="Download"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative bg-slate-950/60 shadow-inner">
        <div 
          className="transition-transform duration-200 ease-out origin-center"
          style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
        >
          {/* Styled E-Receipt Mock */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 rounded-lg shadow-2xl w-[220px] font-mono text-[9px] relative border-t-8 border-primary-600">
            <div className="absolute right-2 top-2 select-none pointer-events-none opacity-20 border-2 border-emerald-600 text-emerald-600 font-bold px-1 py-0.5 rounded rotate-12 text-[8px] uppercase tracking-wider">
              VERIFIED
            </div>

            <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-600 pb-2">
              <h5 className="font-extrabold uppercase tracking-widest text-[8px]">OKAY EXPENSE</h5>
              <p className="text-[6px] text-slate-500 dark:text-slate-400">TAX RECEIPT STATEMENT</p>
              <p className="text-[6px] text-slate-400">ID: {id}</p>
            </div>

            <div className="py-2 space-y-1 border-b border-dashed border-slate-300 dark:border-slate-600">
              <div className="flex justify-between">
                <span>MERCHANT:</span>
                <span className="font-bold text-right truncate max-w-[110px]">{title}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{date}</span>
              </div>
              <div className="flex justify-between">
                <span>FILE:</span>
                <span className="truncate max-w-[90px] text-slate-500 dark:text-slate-400">{receiptName}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between font-bold text-slate-950 text-[10px]">
                <span>TOTAL:</span>
                <span>฿{(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="mt-3 text-center text-[6px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <p>Generated in Enterprise Secure Drive</p>
              <p className="font-bold text-primary-600 dark:text-primary-400">SHA-256 MATCHED</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplacementReceiptViewer({ request }: { request: ExpenseRequest }) {
  const [zoom, setZoom] = useState(100);
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const handlePrint = () => {
    const printWindow: any = {
      document: {
        write: (html: string) => { printWindow._html = (printWindow._html || '') + html; },
        close: () => { openPdfPreview(printWindow._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
    if (printWindow) {
      const formattedAmount = (request.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
      const filesText = request.attachment_list && request.attachment_list.length > 0
        ? request.attachment_list.map(f => `- ${f.name}`).join('<br/>')
        : 'ไม่มีไฟล์แนบพยานหลักฐาน';

      const lastApprover = request.approvalHistory && request.approvalHistory.length > 0
        ? request.approvalHistory[request.approvalHistory.length - 1]
        : null;

      printWindow.document.write(`
        <html>
          <head>
            <title>ใบแทนใบเสร็จรับเงิน - ${request.replacement_receipt_number || request.id}</title>
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
              .logo {
                width: 48px;
                height: 48px;
                background-color: #f59e0b;
                color: white;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 20px;
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
                margin: 20px 0 8px 0;
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
              .signature-section {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #cbd5e1;
              }
              .signature-box {
                width: 45%;
                text-align: center;
              }
              .signature-line {
                border-bottom: 1px dashed #475569;
                margin-top: 40px;
                margin-bottom: 8px;
                height: 20px;
              }
              .footer-stamp {
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
                margin-top: 40px;
                border-top: 1px dashed #e2e8f0;
                padding-top: 15px;
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="container">
              <div class="header">
                <div class="logo-title">
                  <div class="logo" style="background-color: #f59e0b; color: white; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 8px;">OK</div>
                  <div class="company-info" style="margin-left: 12px;">
                    <h2 style="margin: 0; font-size: 18px;">บริษัท โอเคย์ โซลูชั่นส์ จำกัด</h2>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">OKAY SOLUTIONS CO., LTD.<br/>สำนักงานใหญ่ เลขผู้เสียภาษี: 0105562001002<br/>โทร: +66 2 123 4567 | อีเมล: accounting@okaysolutions.com</p>
                  </div>
                </div>
                <div class="doc-meta" style="text-align: right;">
                  <h1 style="margin: 0; font-size: 20px; color: #f59e0b;">ใบแทนใบเสร็จรับเงิน</h1>
                  <p style="margin: 4px 0 0 0; font-size: 12px; font-family: monospace; font-weight: bold;">เลขที่เอกสาร: ${request.replacement_receipt_number || request.id}</p>
                  <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">วันที่ออกเอกสาร: ${request.date}</p>
                </div>
              </div>

              <div class="title-desc">
                <h3>ใบแทนใบเสร็จรับเงิน (Replacement Receipt)</h3>
                <p>ตามระเบียบกรมสรรพากร ถือเป็นเอกสารหลักฐานรายจ่ายประกอบการหักภาษีเงินได้นิติบุคคล</p>
              </div>

              <div class="section-title">ข้อมูลผู้ขอรับเงินสะสมและสถานที่ทำรายการ</div>
              <div class="info-grid">
                <div class="info-item">
                  <span>ผู้ขอเบิกจ่าย (Requester)</span>
                  <p>${request.employeeName} (${request.employeeRole})</p>
                </div>
                <div class="info-item">
                  <span>หน่วยงาน / แผนกรับภาระ (Department)</span>
                  <p>${request.department}</p>
                </div>
                <div class="info-item">
                  <span>ชื่อร้านค้า / ผู้รับเงินปลายทาง (Merchant / Payee)</span>
                  <p>${request.replacement_merchant || 'ไม่ระบุชื่อร้านค้า'}</p>
                </div>
                <div class="info-item">
                  <span>สถานที่ทำรายการ / พิกัด (Location)</span>
                  <p>${request.replacement_location || 'ไม่ระบุสถานที่'}</p>
                </div>
                <div class="info-item">
                  <span>ช่องทางการชำระเงิน (Payment Method)</span>
                  <p>${
                    request.replacement_payment_method === 'cash' ? 'เงินสด (Cash)' :
                    request.replacement_payment_method === 'transfer' ? 'โอนเงินผ่านธนาคาร (Bank Transfer)' :
                    request.replacement_payment_method === 'credit_card' ? 'บัตรเครดิต (Credit Card)' :
                    request.replacement_payment_method === 'promptpay' ? 'พร้อมเพย์ (PromptPay)' : 'อื่นๆ (Other)'
                  }</p>
                </div>
                <div class="info-item">
                  <span>บุคคลที่เกี่ยวข้อง / พยานพยาน (Witness / Involved)</span>
                  <p>${request.replacement_involved || '-'}</p>
                </div>
              </div>

              <div class="section-title">เหตุผลความจำเป็นที่ไม่อาจเรียกใบเสร็จรับเงินได้</div>
              <div class="reason-box">
                <strong>เหตุผลความจำเป็น:</strong><br/>
                ${request.replacement_reason || 'ไม่มีคำชี้แจงความจำเป็น'}
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
                      <strong>${request.title}</strong><br/>
                      <span style="font-size: 11px; color: #64748b;">${request.replacement_remarks || request.description || '-'}</span>
                    </td>
                    <td class="text-right">${formattedAmount}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="2" class="text-right">รวมจำนวนเงินที่ขอเบิกจ่ายทดแทนทั้งสิ้น (บาท):</td>
                    <td class="text-right">฿${formattedAmount}</td>
                  </tr>
                </tbody>
              </table>

              <div class="section-title">พยานหลักฐานและหลักฐานทดแทนประกอบแนบ</div>
              <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; margin-bottom: 25px;">
                ${filesText}
              </div>

              <p style="font-size: 11px; color: #475569; margin-top: 30px;">
                ข้าพเจ้าขอรับรองว่า รายจ่ายข้างต้นนี้เกิดขึ้นจริงเพื่อประโยชน์การดำเนินงานและธุรกิจของบริษัทฯ และข้าพเจ้าไม่อาจเรียกเก็บใบเสร็จรับเงินจากผู้รับเงินได้ด้วยความจำเป็นสุดวิสัย
              </p>

              <div class="signature-section">
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <p style="font-size: 12px; font-weight: bold; margin: 0;">( ${request.employeeName} )</p>
                  <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">ผู้เสนอขอเบิกเงิน (Requester)</p>
                  <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">วันที่: ${request.date}</p>
                </div>
                <div class="signature-box">
                  <div class="signature-line">${lastApprover ? `<span style="font-family: cursive; font-size: 14px; color: #2563eb;">${lastApprover.approverName}</span>` : ''}</div>
                  <p style="font-size: 12px; font-weight: bold; margin: 0;">( ${lastApprover ? lastApprover.approverName : '...................................................'} )</p>
                  <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">ผู้อนุมัติเอกสารและอนุมัติจ่าย (Authorized Approver)</p>
                  <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">วันที่: ${lastApprover ? lastApprover.date : '......../......../........'}</p>
                </div>
              </div>

              <div class="footer-stamp">
                <p>เอกสารฉบับนี้พิมพ์โดยระบบ Okay Expense Management System เมื่อวันที่ ${new Date().toLocaleString('th-TH')}</p>
                <p>มาตรฐานระเบียบกรมสรรพากร (มาตรา 65 ตรี (18))</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="border border-amber-250 dark:border-amber-900 rounded-2xl overflow-hidden bg-slate-900 text-white flex flex-col h-[400px] shadow-lg">
      <div className="bg-amber-950/80 px-3 py-2 flex items-center justify-between border-b border-amber-900/40">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
            ใบแทนใบเสร็จ
          </span>
          <span className="text-[10px] text-amber-200 truncate" title={request.replacement_receipt_number}>
            {request.replacement_receipt_number}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            type="button"
            onClick={handleZoomOut} 
            className="p-1 hover:bg-amber-900/40 rounded text-amber-200 hover:text-white transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[9px] font-bold font-mono text-amber-300 w-8 text-center">{zoom}%</span>
          <button 
            type="button"
            onClick={handleZoomIn} 
            className="p-1 hover:bg-amber-900/40 rounded text-amber-200 hover:text-white transition-all"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-3 bg-amber-900/60" />
          <button 
            type="button"
            onClick={handlePrint} 
            className="p-1 bg-amber-600 hover:bg-amber-500 rounded text-white font-bold text-[10px] px-2 flex items-center gap-1 transition-all"
            title="Print A4"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>พิมพ์ A4</span>
          </button>
        </div>
      </div>

      {/* Visual Doc Preview inside viewport */}
      <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-start justify-center">
        <div 
          className="transition-transform duration-150 origin-top bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-5 rounded-lg shadow-xl w-[260px] text-[8px] leading-relaxed space-y-3 font-sans border-t-4 border-amber-500"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <h5 className="font-bold text-slate-950 text-[9px]">ใบแทนใบเสร็จรับเงิน</h5>
            <p className="text-[6px] text-slate-400">เลขที่: {request.replacement_receipt_number}</p>
          </div>

          <div className="space-y-1 text-slate-600 dark:text-slate-300">
            <p><strong>ผู้เสนอขอเบิก:</strong> {request.employeeName}</p>
            <p><strong>ร้านค้า / ผู้รับ:</strong> {request.replacement_merchant}</p>
            <p><strong>สถานที่:</strong> {request.replacement_location}</p>
            <p><strong>ช่องทางจ่ายเงิน:</strong> {request.replacement_payment_method === 'cash' ? 'เงินสด' : 'โอนเงิน/พร้อมเพย์'}</p>
            <p className="bg-amber-50 p-1.5 rounded text-[7px] text-amber-900 border border-amber-100 italic">
              <strong>เหตุผล:</strong> {request.replacement_reason}
            </p>
          </div>

          {request.attachment_list && request.attachment_list.length > 0 && (
            <div className="space-y-1">
              <span className="font-semibold block text-slate-500 dark:text-slate-400">เอกสารแนบประกอบ ({request.attachment_list.length}):</span>
              <div className="grid grid-cols-1 gap-1 max-h-[80px] overflow-y-auto">
                {request.attachment_list.map((file, i) => (
                  <div key={i} className="flex justify-between items-center p-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded text-[7px]">
                    <span className="truncate max-w-[130px] font-mono">{file.name}</span>
                    <a href={file.dataUrl} download={file.name} className="text-primary-600 dark:text-primary-400 hover:underline">ดาวน์โหลด</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 flex justify-between font-bold text-slate-950 text-[9px]">
            <span>ยอดเบิกจ่ายสะสม:</span>
            <span>฿{(request.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RequestDetailModalProps {
  request: ExpenseRequest;
  onClose: () => void;
  onAddComment: (requestId: string, text: string) => void;
  currentUser: string;
  onCancelRequest?: (id: string, reason: string) => void;
}

export default function RequestDetailModal({ request, onClose, onAddComment, currentUser, onCancelRequest }: RequestDetailModalProps) {
  const [commentText, setCommentText] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const getCategoryConfig = (catId: string) => {
    const defaults: Record<string, { name: string; color: string }> = {
      travel: { name: 'ค่าเดินทางและที่พัก (Travel)', color: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300' },
      fuel: { name: 'ค่าน้ำมัน (Fuel)', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
      meals: { name: 'ค่ารับรองและอาหาร (Meals)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
      equipment: { name: 'อุปกรณ์สำนักงาน/เครื่องมือ (Equipment)', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      accommodation: { name: 'ค่าที่พัก (Accommodation)', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
      software: { name: 'ค่าซอฟต์แวร์และคลาวด์ (Software)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
      training: { name: 'ค่าฝึกอบรมและสัมมนา (Training)', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
      marketing: { name: 'ค่าโฆษณาและการตลาด (Marketing)', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
      other: { name: 'อื่นๆ (Other)', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300' }
    };

    return defaults[catId] || { name: catId, color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300' };
  };

  const catConfig = getCategoryConfig(request.category);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(request.id, commentText);
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{request.id}</span>
              <span className="text-slate-300">•</span>
              {(() => {
                const statusInfo = getClearingStatusInfo(request);
                return (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                );
              })()}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{request.title}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const formattedAmount = (request.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
                const lastApprover = request.approvalHistory && request.approvalHistory.length > 0
                  ? request.approvalHistory[request.approvalHistory.length - 1]
                  : null;
                const htmlContent = `
                  <html>
                    <head>
                      <title>ใบเบิกเงิน - ${request.id}</title>
                      <style>
                        @page { size: A4; margin: 15mm; }
                        body { font-family: 'Sarabun', sans-serif, system-ui; margin: 0; padding: 20px; color: #1e293b; font-size: 13px; line-height: 1.5; }
                        .container { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                        .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
                        .company-title { font-size: 20px; font-weight: bold; color: #0369a1; }
                        .doc-title { font-size: 16px; font-weight: bold; margin-top: 5px; color: #0f172a; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; }
                        .amount-box { text-align: right; background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px; border-radius: 8px; font-size: 18px; font-weight: bold; color: #0369a1; margin: 15px 0; }
                        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; text-align: center; }
                        .sig-line { border-bottom: 1px dashed #94a3b8; height: 40px; margin-bottom: 8px; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <div class="company-title">บริษัท โอเค จำกัด (OKAY CO., LTD.)</div>
                          <div class="doc-title">ใบขอเบิกเงิน / ใบอนุมัติการจ่ายเงิน (Expense Request Form)</div>
                          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">เลขที่เอกสาร: ${request.id} | วันที่: ${request.date}</div>
                        </div>
                        <div class="grid">
                          <div><strong>ผู้ขอเบิก:</strong> ${request.employeeName} (${request.employeeRole})</div>
                          <div><strong>หน่วยงาน / แผนก:</strong> ${request.department}</div>
                          <div><strong>ประเภทรายการ:</strong> ${request.expense_type === 'clearing' ? 'ใบเคลียร์เงินทดรอง' : request.expense_type === 'advance' ? 'ใบขอเบิกล่วงหน้า' : 'ใบเบิกชดเชย'}</div>
                          <div><strong>สถานะ:</strong> ${request.status === 'approved' ? 'อนุมัติแล้ว' : request.status === 'rejected' ? 'ปฏิเสธ' : 'รออนุมัติ'}</div>
                        </div>
                        <div style="margin-bottom: 15px;">
                          <strong>หัวข้อ / วัตถุประสงค์:</strong>
                          <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; margin-top: 4px;">
                            ${request.title}
                          </div>
                        </div>
                        ${request.description ? `
                        <div style="margin-bottom: 15px;">
                          <strong>รายละเอียดเพิ่มเติม:</strong>
                          <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; margin-top: 4px; white-space: pre-wrap;">
                            ${request.description}
                          </div>
                        </div>` : ''}
                        <div class="amount-box">
                          ยอดเงินขอเบิกสุทธิ: ฿${formattedAmount} บาท
                        </div>
                        <div class="sig-grid">
                          <div>
                            <div class="sig-line"></div>
                            <div>( ${request.employeeName} )</div>
                            <div style="font-size: 11px; color: #64748b;">ผู้ขอเบิกเงิน (Requester)</div>
                          </div>
                          <div>
                            <div class="sig-line">${lastApprover ? `<span style="color:#0284c7;font-weight:bold;">${lastApprover.approverName}</span>` : ''}</div>
                            <div>( ${lastApprover ? lastApprover.approverName : '.........................................'} )</div>
                            <div style="font-size: 11px; color: #64748b;">ผู้อนุมัติ (Authorized Approver)</div>
                          </div>
                        </div>
                      </div>
                    </body>
                  </html>
                `;
                const evidenceList = getRealReceiptImages(request);
                openPdfPreview({
                  html: htmlContent,
                  title: `ใบเบิกเงิน-${request.id}`,
                  attachments: evidenceList.map((url, i) => ({
                    url,
                    title: `หลักฐานแนบ #${i + 1}`,
                    name: `หลักฐาน #${i + 1}`,
                    type: (url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf')) ? 'pdf' : 'image'
                  }))
                });
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">พิมพ์ / บันทึก A4</span>
            </button>

            <button 
              id="close-detail-modal"
              onClick={onClose}
              className="text-rose-500 hover:text-white hover:bg-rose-500 dark:text-rose-400 dark:hover:text-white p-2 rounded-xl transition-all duration-200 bg-rose-50 dark:bg-rose-950/20 shadow-sm font-bold text-lg leading-none cursor-pointer flex items-center justify-center h-9 w-9"
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Body containing 2 columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Real-Time Live Workflow Step Banner */}
          <div className="lg:col-span-5">
            {(() => {
              const stepInfo = getRealWorkflowStepInfo(request);
              return (
                <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs ${stepInfo.color}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-900/70 shadow-xs">
                        📍 สถานะขั้นตอนจริงในระบบ (Live Workflow Progress)
                      </span>
                      {stepInfo.totalSteps > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-full">
                          ขั้นตอนที่ {stepInfo.stepNumber} จาก {stepInfo.totalSteps}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-extrabold">{stepInfo.statusText}</p>
                    {stepInfo.currentApproverName !== '-' && stepInfo.currentApproverName !== 'อนุมัติแล้ว' && (
                      <p className="text-xs opacity-90 flex items-center gap-1.5 pt-0.5">
                        <span>👤 ผู้อนุมัติที่ต้องดำเนินการในขั้นนี้:</span>
                        <span className="font-bold underline">{stepInfo.currentApproverName}</span>
                        <span className="text-[10px] opacity-75">({stepInfo.currentApproverRole})</span>
                      </p>
                    )}
                  </div>

                  {/* Stepper nodes */}
                  {stepInfo.totalSteps > 1 && request.approvalHistory && (
                    <div className="flex items-center gap-2 shrink-0 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-black/5">
                      {request.approvalHistory.map((step, idx) => {
                        const isDone = step.status === 'approved';
                        const isCurrent = step.status === 'pending';
                        const isRejected = step.status === 'rejected';
                        return (
                          <div key={idx} className="flex items-center gap-2" title={`${step.approverRole}: ${step.approverName}`}>
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shadow-xs transition-all ${
                              isDone ? 'bg-emerald-600 text-white' :
                              isRejected ? 'bg-rose-600 text-white' :
                              isCurrent ? 'bg-amber-500 text-white ring-2 ring-amber-300 animate-pulse' :
                              'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {isDone ? '✓' : isRejected ? '✕' : idx + 1}
                            </div>
                            <div className="hidden sm:block text-left">
                              <p className="text-[10px] font-bold leading-none">{step.approverRole}</p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">{step.approverName}</p>
                            </div>
                            {idx < request.approvalHistory.length - 1 && (
                              <div className={`w-4 h-0.5 ${isDone ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Column 1: Details & Receipt & Timeline (Takes 3/5 width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Meta details cards */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">ผู้ขอเบิกเงิน</span>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{request.employeeName}</p>
                    <p className="text-[10px] text-slate-400">{request.employeeRole}</p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">หน่วยงาน / วันที่ส่ง</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{request.department}</p>
                    <p className="text-[10px] text-slate-400">{request.date}</p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">หมวดหมู่ค่าใช้จ่าย</span>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg inline-block w-fit ${catConfig.color}`}>
                  {catConfig.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">ยอดเงินเบิกจ่ายรวม</span>
                <p className="text-base font-black text-slate-950 dark:text-white">
                  ฿{(request.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Advance Clearing Analysis (Requirement 1 & 2) */}
            {request.expense_type === 'clearing' && (() => {
              const allRequests = getDbRequests();
              const matchedAdvance = request.advance_id ? allRequests.find(r => r.id === request.advance_id) : undefined;
              const advAmount = matchedAdvance ? (matchedAdvance.amount || 0) : 0;
              const spentAmount = request.amount || 0;
              const diff = spentAmount - advAmount;

              // Chronology dates
              const advancePaidDate = request.advance_paid_date || matchedAdvance?.date || matchedAdvance?.created_at?.split('T')[0];
              const clearingSubmittedDate = request.clearing_submitted_date || request.date || request.created_at?.split('T')[0];
              const refundTransferredDate = request.refund_transferred_date;
              const companyReimbursedDate = request.company_reimbursed_date;
              const approvedDate = request.approved_date || (request.status === 'approved' ? request.approvalHistory[request.approvalHistory.length - 1]?.date : undefined);
              const financeProcessedDate = request.finance_processed_date || (request.status === 'approved' ? request.approvalHistory.find(h => h.approverRole.includes('Finance') || h.approverRole.includes('บัญชี'))?.date : undefined);

              // Aging calculation (Outstanding days)
              let endPeriodDate = new Date('2026-07-05').toISOString().split('T')[0]; // today fallback
              if (request.status === 'approved' && approvedDate) {
                endPeriodDate = approvedDate;
              }
              const outstandingDays = advancePaidDate ? Math.max(0, Math.ceil((new Date(endPeriodDate).getTime() - new Date(advancePaidDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;

              return (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">📊 ข้อมูลเปรียบเทียบและการเคลียร์เงิน (Clearing Analysis)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full">
                      จำนวนวันสะสม: {outstandingDays} วัน
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">1. ยอดรับล่วงหน้า</span>
                      <p className="text-xs font-bold text-primary-600 dark:text-primary-400 font-mono mt-0.5">
                        ฿{advAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        ID: <span className="font-mono">{request.advance_id || 'N/A'}</span>
                      </p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">2. ยอดใช้จ่ายจริง</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                        ฿{spentAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        หัวข้อ: {matchedAdvance?.title || 'ใบเบิกล่วงหน้า'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">3. ผลการเคลียร์เงิน</span>
                      {diff < 0 ? (
                        <div className="mt-0.5">
                          <p className="text-xs font-bold text-amber-600 font-mono">
                            ฿{Math.abs(diff).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </p>
                          <span className="text-[9px] font-bold text-amber-600 block leading-tight mt-0.5">
                            🟠 รอคืนเงินบริษัท
                          </span>
                        </div>
                      ) : diff > 0 ? (
                        <div className="mt-0.5">
                          <p className="text-xs font-bold text-primary-600 dark:text-primary-400 font-mono">
                            ฿{diff.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </p>
                          <span className="text-[9px] font-bold text-primary-600 dark:text-primary-400 block leading-tight mt-0.5">
                            🔵 บริษัทต้องจ่ายเพิ่ม
                          </span>
                        </div>
                      ) : (
                        <div className="mt-0.5">
                          <p className="text-xs font-bold text-emerald-600 font-mono">
                            ฿0.00
                          </p>
                          <span className="text-[9px] font-bold text-emerald-600 block leading-tight mt-0.5">
                            🟢 เคลียร์เรียบร้อย
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date Chronology Timeline (Requirement 2 & Audit Trail) */}
                  <div className="space-y-2 border-t border-slate-150/60 dark:border-slate-800 pt-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">📅 วันที่สำคัญของกระบวนการเคลียร์เงิน (Milestone Dates)</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] bg-white dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 font-sans">
                      <div>
                        <span className="text-slate-400 block">รับเงินทดรอง:</span>
                        <strong className="text-slate-700 dark:text-slate-300">{advancePaidDate || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">ส่งคำขอเคลียร์:</span>
                        <strong className="text-slate-700 dark:text-slate-300">{clearingSubmittedDate || '-'}</strong>
                      </div>
                      {diff < 0 && (
                        <div>
                          <span className="text-slate-400 block">โอนเงินคืนบริษัท:</span>
                          <strong className={refundTransferredDate ? "text-amber-600 font-bold" : "text-rose-500 font-bold"}>
                            {refundTransferredDate || '⚠️ ยังไม่โอนคืน / ไม่พบข้อมูล'}
                          </strong>
                        </div>
                      )}
                      {diff > 0 && (
                        <div>
                          <span className="text-slate-400 block">บริษัทจ่ายเพิ่ม:</span>
                          <strong className={companyReimbursedDate ? "text-primary-600 font-bold" : "text-slate-500 dark:text-slate-400"}>
                            {companyReimbursedDate || 'รอฝ่ายการเงินชำระ'}
                          </strong>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 block">อนุมัติเสร็จสิ้น:</span>
                        <strong className={approvedDate ? "text-emerald-600 font-bold" : "text-slate-500 dark:text-slate-400"}>
                          {approvedDate || 'อยู่ระหว่างพิจารณา'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">ฝ่ายการเงินลงบัญชี:</span>
                        <strong className={financeProcessedDate ? "text-indigo-600 font-bold" : "text-slate-500 dark:text-slate-400"}>
                          {financeProcessedDate || 'รอการบันทึกบัญชี'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">วัตถุประสงค์และคำอธิบาย</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl whitespace-pre-wrap border border-slate-200/20">
                {request.description || 'ไม่มีคำอธิบายหรือข้อมูลเพิ่มเติม'}
              </p>
            </div>

            {/* Revision History for Pre-Approval Edits */}
            {request.revisions && request.revisions.length > 0 && (
              <div className="space-y-2.5 bg-amber-50/10 dark:bg-amber-950/10 p-4 rounded-2xl border border-amber-200/20 font-sans">
                <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  🔄 ประวัติการแก้ไขยอดและสิทธิ์เบิกเงิน (Revision History)
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {request.revisions.map((rev, index) => (
                    <div key={index} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded">เวอร์ชัน {rev.version}</span>
                        <span className="text-slate-400">{rev.date} {rev.time}</span>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{rev.action}</p>
                      {rev.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-1.5 rounded">
                          เหตุผล: {rev.notes}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-medium">โดยผู้บันทึก: {rev.author}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-Stage Approval Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">ประวัติการดำเนินการ (Workflow Timeline)</h4>
              
              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:bg-slate-700">
                {request.approvalHistory.length === 0 ? (
                  <div className="relative pl-4">
                    <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 border-4 border-white" />
                    <p className="text-xs text-slate-400 italic">ไม่มีข้อมูลการเดินระบบงาน (คำขออาจอยู่ในขั้นตอนแบบร่าง)</p>
                  </div>
                ) : (
                  request.approvalHistory.map((step, idx) => {
                    const isDone = step.status === 'approved';
                    const isRejected = step.status === 'rejected';
                    const isWaiting = step.status === 'pending';

                    return (
                      <div key={step.id} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-4 border-white ${
                          isDone ? 'bg-emerald-500' :
                          isRejected ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                        }`} />

                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                ขั้นตอนที่ {idx + 1}: {step.approverName}
                              </p>
                              <p className="text-[10px] text-slate-400">{step.approverRole}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isDone ? 'bg-emerald-50 text-emerald-700' :
                              isRejected ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {isDone ? 'เห็นชอบ / อนุมัติ' :
                               isRejected ? 'ปฏิเสธ' : 'กำลังพิจารณา'}
                            </span>
                          </div>

                          {step.comment && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 italic leading-relaxed bg-white/60 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                              &ldquo;{step.comment}&rdquo;
                            </p>
                          )}
                          <p className="text-[9px] text-slate-400 mt-1.5 text-right">{step.date}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cancellation block */}
            {request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'cancelled' && onCancelRequest && (
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/30 rounded-2xl space-y-3 mt-4">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold">ยกเลิกรายการนี้ (Cancel System)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">คุณสามารถยกเลิกรายการนี้ได้หากยังไม่ได้รับอนุมัติสุดท้าย ข้อมูลจะถูกบันทึกใน Audit Log ทันที</p>
                
                {showCancelConfirm ? (
                  <div className="space-y-2">
                    <textarea 
                      required
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="ระบุเหตุผลในการยกเลิกเอกสาร... *"
                      className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-hidden focus:ring-1 focus:ring-rose-500"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <button 
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg transition-all"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        type="button"
                        disabled={!cancelReason.trim()}
                        onClick={() => {
                          onCancelRequest(request.id, cancelReason);
                          setShowCancelConfirm(false);
                        }}
                        className="px-2.5 py-1.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-[10px] font-extrabold rounded-lg transition-all disabled:opacity-50 shadow-md shadow-green-500/10 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        ยืนยันการยกเลิกจริง
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🗑️</span> ยกเลิกใบเบิกคำขอนี้
                  </button>
                )}
              </div>
            )}

            {/* If already cancelled, show cancellation info details */}
            {request.status === 'cancelled' && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/40 space-y-2 mt-4 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold">
                  <span>🚫</span>
                  <span>เอกสารถูกยกเลิกแล้ว (Cancelled Request)</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <p><strong>ผู้ยกเลิก:</strong> {request.cancelledBy || 'ผู้ใช้ระบบ'}</p>
                  <p><strong>เวลาที่ยกเลิก:</strong> {request.cancelledAt ? new Date(request.cancelledAt).toLocaleString('th-TH') : '-'}</p>
                  <p className="italic bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-250 mt-1"><strong>เหตุผล:</strong> {request.cancelReason || 'ไม่ระบุเหตุผล'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Digital Receipt View & Collaborative comments (Takes 2/5 width) */}
          <div className="lg:col-span-2 space-y-6 lg:border-l lg:border-slate-100 dark:border-slate-800 lg:pl-6">
            
            {/* Digital Receipt View */}
            <div className="space-y-3">
              {(() => {
                const evidenceList = getRealReceiptImages(request);
                return (
                  <>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      เอกสารหลักฐานแนบ ({evidenceList.length})
                    </h4>
                    {evidenceList.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {evidenceList.map((imgUrl, idx) => {
                          const urlStr = (imgUrl || '').toLowerCase();
                          const isPdf = urlStr.startsWith('data:application/pdf') || urlStr.includes('.pdf') || urlStr.startsWith('blob:application/pdf');
                          const isDoc = urlStr.includes('word') || urlStr.includes('msword') || urlStr.includes('.doc');
                          const isXls = urlStr.includes('excel') || urlStr.includes('spreadsheet') || urlStr.includes('.xls') || urlStr.includes('.csv');

                          return (
                            <div 
                              key={idx} 
                              className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 aspect-[3/4] shadow-md group cursor-pointer hover:ring-2 hover:ring-primary-500 hover:ring-offset-2 dark:hover:ring-offset-slate-900 transition-all p-2 flex flex-col justify-between"
                              onClick={() => {
                                openPdfPreview({
                                  html: '',
                                  title: `${request.title} - เอกสารแนบ #${idx + 1}`,
                                  fileUrl: imgUrl,
                                  items: evidenceList.map((u, i) => ({
                                    url: u,
                                    title: `${request.title} - เอกสารแนบ #${i + 1}`,
                                    type: (u.toLowerCase().includes('.pdf') || u.startsWith('data:application/pdf')) ? 'pdf' : 'image',
                                    name: `เอกสารแนบ #${i + 1}`
                                  })),
                                  initialIndex: idx
                                });
                              }}
                            >
                              {isPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors rounded-xl">
                                  <FileText className="h-10 w-10 mb-2" />
                                  <span className="text-xs font-bold">PDF Document</span>
                                </div>
                              ) : isDoc ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors rounded-xl">
                                  <FileText className="h-10 w-10 mb-2" />
                                  <span className="text-xs font-bold">Word Document</span>
                                </div>
                              ) : isXls ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors rounded-xl">
                                  <FileSpreadsheet className="h-10 w-10 mb-2" />
                                  <span className="text-xs font-bold">Excel / Spreadsheet</span>
                                </div>
                              ) : (
                                <img 
                                  src={getSafePreviewUrl(imgUrl)} 
                                  className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105" 
                                  alt="Attached receipt" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 rounded-2xl">
                                <ZoomIn className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 dark:bg-slate-800 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                        <p className="text-xs">ไม่มีหลักฐานใบเสร็จแนบในระบบ</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Policy flags checklists */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">การประเมินนโยบาย (Policy Audits)</h4>
              <div className="space-y-1.5">
                {request.policyNotes.map((note, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-2 p-2.5 rounded-xl text-[11px] border ${
                      request.policyStatus === 'violation' 
                        ? 'bg-rose-50 border-rose-100 text-rose-700' 
                        : request.policyStatus === 'warning'
                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                          : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    }`}
                  >
                    {request.policyStatus === 'violation' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    ) : request.policyStatus === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments collaborative chat */}
            <div className="space-y-3 flex flex-col h-[280px]">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">กระดานสื่อสารและชี้แจง ({request.comments.length})</h4>
              
              <div className="flex-1 overflow-y-auto space-y-3 p-1">
                {request.comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">ไม่มีความคิดเห็นหรือข้อความซักถาม</p>
                ) : (
                  request.comments.map((comm) => {
                    const isMe = comm.author === currentUser || comm.author === 'มนัญญา ใจสู้';
                    return (
                      <div key={comm.id} className={`space-y-1 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`p-2.5 rounded-2xl max-w-[90%] text-xs ${
                          isMe 
                            ? 'bg-primary-600 text-white rounded-br-none' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                        }`}>
                          <p className="leading-relaxed">{comm.text}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 px-1">
                          <span className="font-semibold">{comm.author}</span>
                          <span>•</span>
                          <span>{comm.date}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input block */}
              <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="เขียนข้อความหรือข้อชี้แจง..."
                  className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-primary-500"
                />
                <button 
                  type="submit"
                  id="submit-comment-btn"
                  className="p-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl flex items-center justify-center transition-all shadow-md shadow-green-500/20 hover:scale-[1.05] active:scale-[0.95]"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>

      {/* Lightbox Interactive Preview Modal */}
      {selectedPreviewImage && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top action bar */}
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-primary-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200 truncate">
                  {selectedPreviewImage.startsWith('data:application/pdf') || selectedPreviewImage.toLowerCase().includes('.pdf') ? 'เอกสารหลักฐานเบิกจ่าย (PDF File)' : 'หลักฐานใบเสร็จรับเงิน (Image File)'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const evidenceList = getRealReceiptImages(request);
                    const idx = evidenceList.indexOf(selectedPreviewImage);
                    const isPdf = selectedPreviewImage.startsWith('data:application/pdf') || selectedPreviewImage.toLowerCase().includes('.pdf');
                    openPdfPreview({
                      title: `หลักฐานแนบ - ${request.id}`,
                      fileUrl: selectedPreviewImage,
                      fileType: isPdf ? 'pdf' : 'image',
                      items: evidenceList.map((u, i) => ({
                        url: u,
                        title: `${request.title} - เอกสารแนบ #${i + 1}`,
                        type: (u.toLowerCase().includes('.pdf') || u.startsWith('data:application/pdf')) ? 'pdf' : 'image',
                        name: `เอกสารแนบ #${i + 1}`
                      })),
                      initialIndex: idx >= 0 ? idx : 0
                    });
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
                    const safeUrl = getSafePreviewUrl(selectedPreviewImage);
                    const isPdf = selectedPreviewImage.startsWith('data:application/pdf') || selectedPreviewImage.toLowerCase().includes('.pdf');
                    const evidenceList = getRealReceiptImages(request);
                    const idx = evidenceList.indexOf(selectedPreviewImage);
                    openPdfPreview({
                      title: `หลักฐานแนบ - ${request.id}`,
                      fileUrl: safeUrl,
                      fileType: isPdf ? 'pdf' : 'image',
                      items: evidenceList.map((u, i) => ({
                        url: u,
                        title: `${request.title} - เอกสารแนบ #${i + 1}`,
                        type: (u.toLowerCase().includes('.pdf') || u.startsWith('data:application/pdf')) ? 'pdf' : 'image',
                        name: `เอกสารแนบ #${i + 1}`
                      })),
                      initialIndex: idx >= 0 ? idx : 0
                    });
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="เปิดในแท็บใหม่"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>เปิดเต็มจอ</span>
                </button>

                <a
                  href={getSafePreviewUrl(selectedPreviewImage)}
                  download="attached_evidence_document"
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="ดาวน์โหลดไฟล์หลักฐาน"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>ดาวน์โหลด</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedPreviewImage(null)}
                  className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer ml-2"
                  title="ปิด"
                >
                  <X className="h-5 w-5 font-bold" />
                </button>
              </div>
            </div>

            {/* Viewer content area */}
            <div className="flex-1 p-4 bg-slate-950 flex items-center justify-center overflow-auto min-h-[60vh]">
              {(() => {
                const imgUrl = selectedPreviewImage || '';
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
                      className="w-full h-[75vh] rounded-2xl border border-slate-800 bg-white"
                      title="PDF Document Preview"
                    />
                  );
                } else if (isDoc || isXls || (!isImage && imgUrl.startsWith('data:'))) {
                  return (
                    <div className="max-w-xl w-full p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-6">
                      <div className="mx-auto w-20 h-20 rounded-2xl bg-primary-950/60 text-primary-400 flex items-center justify-center border border-primary-800/50">
                        {isXls ? <FileSpreadsheet className="h-10 w-10 text-emerald-400" /> : <FileText className="h-10 w-10 text-blue-400" />}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-white">
                          {isXls ? 'เอกสารตารางคำนวณ (Excel / CSV)' : isDoc ? 'เอกสารข้อความ (Word Document)' : 'เอกสารหลักฐานแนบ (Document File)'}
                        </h3>
                        <p className="text-xs text-slate-400">
                          เอกสารไฟล์ต้นฉบับถูกแนบมาในระบบอย่างสมบูรณ์ ผู้อนุมัติและผู้ขอเบิกสามารถกดเปิดอ่าน ดาวน์โหลด หรือพิมพ์ใบสรุปเอกสารได้ทันที
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <a 
                          href={safeUrl} 
                          download="attached_evidence_document"
                          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
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
                                  <head><title>เอกสารแนบ - ${request.id}</title></head>
                                  <body style="margin:0;padding:0;background:#0f172a;display:flex;justify-content:center;align-items:center;">
                                    <iframe src="${safeUrl}" style="width:100vw;height:100vh;border:none;"></iframe>
                                  </body>
                                </html>
                              `, `เอกสารแนบ-${request.id}`);
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
                    <img 
                      src={safeUrl} 
                      className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-xl border border-slate-800" 
                      alt="Zoomed attached receipt evidence" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
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
