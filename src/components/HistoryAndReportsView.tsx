import React, { useState, useMemo } from 'react';
import { openPdfPreview } from '../lib/pdf-preview';
import { 
  Search, 
  Filter, 
  Download, 
  ArrowUpDown, 
  Eye, 
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Calendar
} from 'lucide-react';
import { ExpenseRequest, ExpenseCategory, UserProfile } from '../types';
import { CATEGORIES_CONFIG } from '../data/masterData';
import { getDbDepartments } from '../data/db';
import { getClearingStatusInfo, getDbCompanyData } from '../data/db';
import { CompanyLetterhead } from './CompanyLetterhead';

interface HistoryAndReportsViewProps {
  requests: ExpenseRequest[];
  onSelectRequest: (request: ExpenseRequest) => void;
  currentUser: UserProfile;
}

export default function HistoryAndReportsView({ requests, onSelectRequest, currentUser }: HistoryAndReportsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const companyData = useMemo(() => getDbCompanyData(), []);

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredRequests = useMemo(() => {
    // Determine user role and permissions dynamically
    const isExecutiveOrAdmin = currentUser.approval_level === 'Administrator' || currentUser.approval_level === 'Level 3' || (currentUser.position && (currentUser.position.includes('Director') || currentUser.position.includes('CFO') || currentUser.position.includes('Vice President') || currentUser.position.includes('VP')));
    const isFinance = currentUser.department && (currentUser.department.includes('Finance') || currentUser.department.includes('บัญชีและการเงิน'));
    const isManager = currentUser.position && (currentUser.position.includes('Lead') || currentUser.position.includes('Manager') || currentUser.position.includes('Head') || currentUser.approval_level === 'Level 2');

    return requests.filter((req) => {
      // 1. Role-based visibility check
      if (isExecutiveOrAdmin) {
        // Executive and Admin see all -> no filter
      } else if (isFinance) {
        // Finance sees only Finance/Accounting documents
        const matchesFinanceDept = req.department && (req.department.includes('Finance') || req.department.includes('บัญชี'));
        if (!matchesFinanceDept) return false;
      } else if (isManager) {
        // Manager sees only team documents (same department as manager)
        if (req.department !== currentUser.department) return false;
      } else {
        // Employee sees only their own documents
        const isOwn = req.created_by === currentUser.user_id || req.employeeName === currentUser.name;
        if (!isOwn) return false;
      }

      // Search text (expanded for dates, status, category, department, name)
      const sLower = (searchTerm || '').toLowerCase();
      const matchesSearch = 
        !sLower ||
        (req.title || '').toLowerCase().includes(sLower) ||
        (req.employeeName || '').toLowerCase().includes(sLower) ||
        (req.id || '').toLowerCase().includes(sLower) ||
        (req.department || '').toLowerCase().includes(sLower) ||
        (req.category || '').toLowerCase().includes(sLower) ||
        (req.status || '').toLowerCase().includes(sLower) ||
        (req.date || '').toLowerCase().includes(sLower) ||
        (CATEGORIES_CONFIG[req.category]?.name || '').toLowerCase().includes(sLower);
      
      // Department
      const matchesDept = selectedDepartment === 'All' || req.department === selectedDepartment;

      // Category
      const matchesCat = selectedCategory === 'All' || req.category === selectedCategory;

      // Status
      const matchesStatus = selectedStatus === 'All' || req.status === selectedStatus;

      // Date Range
      const matchesStartDate = !startDate || req.date >= startDate;
      const matchesEndDate = !endDate || req.date <= endDate;

      return matchesSearch && matchesDept && matchesCat && matchesStatus && matchesStartDate && matchesEndDate;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [requests, currentUser, searchTerm, selectedDepartment, selectedCategory, selectedStatus, startDate, endDate, sortBy, sortOrder]);

  // Derived metrics for filtered list
  const totalAmount = filteredRequests.reduce((sum, r) => sum + r.amount, 0);
  const avgAmount = filteredRequests.length > 0 ? totalAmount / filteredRequests.length : 0;

  const handleExportSim = async () => {
    setIsExporting(true);
    try {
      const { exportExpenseRequestsToExcel } = await import('../utils/excelExport');
      await exportExpenseRequestsToExcel(
        filteredRequests,
        `รายงานสรุปประวัติคำขอเบิกค่าใช้จ่าย (แบบคัดกรองข้อมูล)`,
        currentUser.name,
        true
      );
    } catch (err) {
      console.error('Error exporting filtered reports:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handlePrintReport = () => {
    const element = document.getElementById('corporate-report-printable-area');
    if (!element) return;
    
    const printWindow: any = {
      document: {
        write: (html: string) => { printWindow._html = (printWindow._html || '') + html; },
        close: () => { openPdfPreview(printWindow._html, 'เอกสาร (PDF Preview)'); }
      },
      print: () => {},
      close: () => {}
    };
    

    const reportHtml = element.innerHTML; // get the inner HTML of the report

    printWindow.document.write(`
      <html>
        <head>
          <title>OKEY_HISTORY_REPORT_${new Date().toISOString().split('T')[0]}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
            body {
              font-family: 'Sarabun', sans-serif;
              margin: 0;
              padding: 20px;
              color: #0f172a;
              background-color: #ffffff;
            }
            .print-container {
              max-width: 1100px;
              margin: 0 auto;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; font-size: 10px; color: #475569; }
            .signatures-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 40px;
            }
            .sig-box {
              text-align: center;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
            }
            .sig-line {
              border-bottom: 1px dotted #94a3b8;
              height: 40px;
              margin-bottom: 10px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .text-xl { font-size: 1.25rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .text-\\[10px\\] { font-size: 10px; }
            
            /* Hide UI elements that shouldn't be printed */
            button, .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${reportHtml}
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 800);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">ประวัติและรายงานคำขอทั้งหมด</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">ตรวจสอบฐานข้อมูลรวมของบริษัท คัดกรอง ค้นหา และพิมพ์รายงานสรุป</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button 
            id="print-report-pdf-btn"
            onClick={handlePrintReport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white rounded-xl text-sm font-extrabold transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์รายงานสรุป (PDF)</span>
          </button>
          <button 
            id="export-report-btn"
            onClick={handleExportSim}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white rounded-xl text-sm font-extrabold transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>กำลังส่งออก...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>ส่งออกรายงาน Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              id="report-search"
              placeholder="ค้นหาตามรหัสคำขอ, ชื่อพนักงาน หรือชื่อเรื่อง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-primary-500 focus:bg-white outline-hidden"
            />
          </div>
          <button 
            id="report-filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50 transition-all"
          >
            <Filter className="h-4 w-4" />
            <span>{showFilters ? 'ซ่อนตัวกรองขั้นสูง' : 'แสดงตัวกรองขั้นสูง'}</span>
          </button>
        </div>

        {/* Expandable filters */}
        {(showFilters || selectedDepartment !== 'All' || selectedCategory !== 'All' || selectedStatus !== 'All') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">แผนก/หน่วยงาน</label>
              <select 
                id="filter-dept"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500"
              >
                <option value="All">ทุกแผนก (ทั้งหมด)</option>
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">ประเภทค่าใช้จ่าย</label>
              <select 
                id="filter-cat"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500"
              >
                <option value="All">ทุกหมวดหมู่ (ทั้งหมด)</option>
                {Object.values(CATEGORIES_CONFIG).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">สถานะใบเบิก</label>
              <select 
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500"
              >
                <option value="All">ทุกสถานะ (ทั้งหมด)</option>
                <option value="pending">รอการพิจารณา</option>
                <option value="approved">อนุมัติเรียบร้อยแล้ว</option>
                <option value="rejected">ปฏิเสธการจ่าย</option>
                <option value="draft">แบบร่าง</option>
              </select>
            </div>

            <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>ตั้งแต่วันที่ (Start Date)</span>
                </label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>ถึงวันที่ (End Date)</span>
                </label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mini Stats of Filtered Set */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800">
          <p className="text-xs text-slate-400">รายการที่ถูกคัดกรอง</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{filteredRequests.length} รายการ</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800">
          <p className="text-xs text-slate-400">มูลค่ารวมตามตัวกรอง</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">฿{(totalAmount || 0).toLocaleString()}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/40 dark:border-slate-800">
          <p className="text-xs text-slate-400">ค่าเฉลี่ยต่อรายการ</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            ฿{(avgAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50/20">
                <th className="p-4">รหัสบิล</th>
                <th className="p-4">ผู้ยื่นคำขอ / แผนก</th>
                <th className="p-4">ชื่อเรื่องขอเบิก</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 dark:bg-slate-800" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">
                    <span>วันที่ทำรายการ</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 dark:bg-slate-800" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-1">
                    <span>ยอดสุทธิ</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4">ประเภท</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4 text-center">ดูรายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    ไม่พบรายการค่าใช้จ่ายที่ตรงกับตัวกรองที่เลือก
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const catConfig = CATEGORIES_CONFIG[req.category] || CATEGORIES_CONFIG.other;
                  return (
                    <tr 
                      key={req.id} 
                      id={`hist-req-row-${req.id}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-all"
                    >
                      <td className="p-4 font-bold text-slate-950 dark:text-slate-200">
                        {req.id}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{req.employeeName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{req.department}</p>
                      </td>
                      <td className="p-4 max-w-xs truncate">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{req.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{req.description}</p>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {req.date}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        ฿{(req.amount || 0).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-md font-medium text-[10px] ${catConfig.color}`}>
                          {catConfig.name}
                        </span>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const statusInfo = getClearingStatusInfo(req);
                          return (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          id={`view-hist-detail-${req.id}`}
                          onClick={() => onSelectRequest(req)}
                          className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg inline-flex items-center justify-center transition-all"
                          title="เปิดดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Corporate A4 Printable Audit Report */}
      <div id="corporate-report-printable-area" className="hidden print:block print-bg-white text-black p-6 font-sans">
        {/* Logo & Company Name */}
        <CompanyLetterhead companyData={companyData} primaryColor="#1e3a8a" />

        {/* Report Meta Info */}
        <div className="mb-6">
          <h2 className="text-base font-bold text-slate-800 text-center uppercase tracking-wider">รายงานสรุปข้อมูลประวัติการขอเบิกค่าใช้จ่ายองค์กร (Corporate Expense Report)</h2>
          <p className="text-center text-xs text-slate-500 mt-1">
            {startDate || endDate 
              ? `ช่วงวันที่คัดกรอง: ${startDate || 'เริ่มต้น'} ถึง ${endDate || 'ปัจจุบัน'}` 
              : 'ข้อมูลประวัติทั้งหมดในระบบ'
            }
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-6 text-xs border border-slate-200 p-4 rounded-xl">
            <div>
              <p className="py-0.5"><span className="font-semibold text-slate-700">วันที่พิมพ์รายงาน:</span> {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</p>
              <p className="py-0.5"><span className="font-semibold text-slate-700">ผู้พิมพ์รายงาน:</span> {currentUser.name} ({currentUser.role || currentUser.position || 'พนักงาน'})</p>
              <p className="py-0.5"><span className="font-semibold text-slate-700">สิทธิ์ผู้พิมพ์:</span> {currentUser.approval_level || 'ทั่วไป'}</p>
            </div>
            <div className="text-right">
              <p className="py-0.5"><span className="font-semibold text-slate-700">จำนวนรายการที่คัดกรอง:</span> {filteredRequests.length} รายการ</p>
              <p className="py-0.5"><span className="font-semibold text-slate-700 text-sm">ยอดเงินรวมสุทธิ:</span> <span className="font-bold text-slate-900 text-sm">฿{(totalAmount || 0).toLocaleString()}</span></p>
              <p className="py-0.5"><span className="font-semibold text-slate-700">ค่าเฉลี่ยต่อรายการ:</span> ฿{(avgAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
              <th className="p-2 border border-slate-300">รหัสคำขอ</th>
              <th className="p-2 border border-slate-300">พนักงานผู้เบิก</th>
              <th className="p-2 border border-slate-300">รายละเอียดใบเบิก</th>
              <th className="p-2 border border-slate-300 text-center">วันที่ขอเบิก</th>
              <th className="p-2 border border-slate-300 text-center">ประเภท</th>
              <th className="p-2 border border-slate-300 text-center">สถานะ</th>
              <th className="p-2 border border-slate-300 text-right">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {filteredRequests.map((req) => {
              const catName = CATEGORIES_CONFIG[req.category]?.name || req.category;
              const statusInfo = getClearingStatusInfo(req);
              return (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="p-2 border border-slate-300 font-mono font-bold">{req.id}</td>
                  <td className="p-2 border border-slate-300">
                    <p className="font-semibold">{req.employeeName}</p>
                    <p className="text-[10px] text-slate-500">{req.department}</p>
                  </td>
                  <td className="p-2 border border-slate-300">
                    <p className="font-semibold">{req.title}</p>
                    <p className="text-[10px] text-slate-500">{req.description}</p>
                  </td>
                  <td className="p-2 border border-slate-300 text-center">{req.date}</td>
                  <td className="p-2 border border-slate-300 text-center">{catName}</td>
                  <td className="p-2 border border-slate-300 text-center">
                    <span className="font-semibold">{statusInfo.label}</span>
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-bold">฿{(req.amount || 0).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Report Summary Footer & Page numbers */}
        <div className="mt-8 border-t border-slate-300 pt-4 flex justify-between items-center text-[10px] text-slate-400">
          <p>พิมพ์จากระบบบริหารจัดการค่าใช้จ่ายองค์กร Okay Expense Management</p>
          <p>เอกสารเพื่อใช้ตรวจสอบภายในระบบงานเท่านั้น | หน้า 1 จาก 1</p>
        </div>
      </div>
    </div>
  );
}
