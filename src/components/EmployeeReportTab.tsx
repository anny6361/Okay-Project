import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  FileDown, 
  Filter, 
  Building, 
  Layers,
  CheckCircle,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { UserProfile, Department } from '../types';
import { calculateWorkTenure } from '../utils/employeeUtils';

interface EmployeeReportTabProps {
  employees: UserProfile[];
  departments: Department[];
  currentUser: UserProfile;
}

export default function EmployeeReportTab({ 
  employees, 
  departments,
  currentUser 
}: EmployeeReportTabProps) {
  const [reportDept, setReportDept] = useState<string>('all');
  const [reportStatus, setReportStatus] = useState<string>('all');
  const [reportSort, setReportSort] = useState<string>('employee_id');

  // Filter & sort list of employees
  const getFilteredData = (): UserProfile[] => {
    let list = employees.filter(emp => !emp.deleted); // Exclude hard deleted, keep soft-deleted if filter selected

    if (reportDept !== 'all') {
      list = list.filter(emp => emp.department === reportDept);
    }

    if (reportStatus !== 'all') {
      if (reportStatus === 'deleted') {
        // Show soft-deleted employees specifically
        list = employees.filter(emp => emp.deleted === true);
      } else {
        list = list.filter(emp => emp.employmentStatus === reportStatus);
      }
    }

    list.sort((a, b) => {
      if (reportSort === 'employee_id') {
        return (a.employee_id || '').localeCompare(b.employee_id || '');
      } else if (reportSort === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (reportSort === 'startDate') {
        return (a.startDate || '').localeCompare(b.startDate || '');
      }
      return 0;
    });

    return list;
  };

  const filtered = getFilteredData();

  // ExcelJS Export
  const handleDownloadExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ทะเบียนประวัติพนักงาน');

      // Title & Meta row
      worksheet.mergeCells('A1:K1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'รายงานทะเบียนประวัติพนักงาน - O-Key ERP Enterprise';
      titleCell.font = { name: 'Cordia New', size: 18, bold: true, color: { argb: 'FF1E293B' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.mergeCells('A2:K2');
      const metaCell = worksheet.getCell('A2');
      metaCell.value = `พิมพ์โดย: ${currentUser.name} | ณ วันที่: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')} | จำนวนบุคลากร: ${filtered.length} คน`;
      metaCell.font = { name: 'Cordia New', size: 12, italic: true };
      metaCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.addRow([]); // Blank row

      // Setup Headers
      const headers = [
        { header: 'รหัสพนักงาน (ID)', key: 'employee_id', width: 15 },
        { header: 'ชื่อพนักงาน (Full Name)', key: 'name', width: 25 },
        { header: 'เลขบัตรประจำตัวประชาชน', key: 'idCard', width: 22 },
        { header: 'แผนกประจำ (Department)', key: 'department', width: 25 },
        { header: 'ตำแหน่งงาน (Position)', key: 'position', width: 25 },
        { header: 'สิทธิ์ผู้อนุมัติ (Role)', key: 'role', width: 15 },
        { header: 'เบอร์โทรศัพท์', key: 'phone', width: 15 },
        { header: 'อีเมลบริษัท', key: 'email', width: 22 },
        { header: 'วันที่เข้าทำงาน', key: 'startDate', width: 15 },
        { header: 'อายุงาน (Tenure)', key: 'tenure', width: 18 },
        { header: 'สถานะพนักงาน', key: 'status', width: 15 }
      ];
      
      worksheet.columns = headers;

      // Add Data Rows
      filtered.forEach(emp => {
        let statusText = 'ทำงานปกติ';
        if (emp.employmentStatus === 'probation') statusText = 'ทดลองงาน';
        else if (emp.employmentStatus === 'suspended') statusText = 'ระงับชั่วคราว';
        else if (emp.employmentStatus === 'resigned') statusText = 'พ้นสภาพพนักงาน';

        worksheet.addRow({
          employee_id: emp.employee_id || '',
          name: emp.name || '',
          idCard: emp.idCard || '',
          department: emp.department || '',
          position: emp.position || '',
          role: emp.approval_level || 'Level 1',
          phone: emp.phone || '',
          email: emp.email || '',
          startDate: emp.startDate || '',
          tenure: calculateWorkTenure(emp.startDate),
          status: statusText
        });
      });

      // Style Table Header (Row 4)
      const headerRow = worksheet.getRow(4);
      headerRow.height = 26;
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF312E81' } // Dark indigo
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Style Data Rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 4) {
          row.height = 20;
          row.eachCell((cell, colNumber) => {
            cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 3 || colNumber === 9 ? 'center' : 'left' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
          // Zebra striping
          if (rowNumber % 2 === 0) {
            row.eachCell(cell => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' }
              };
            });
          }
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `O-KEY_Employee_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถดาวน์โหลดไฟล์ Excel ได้');
    }
  };

  // jsPDF Export
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Page styling and margins
      doc.setFillColor(49, 46, 129); // Dark Indigo
      doc.rect(0, 0, 210, 8, 'F');

      // Title Block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('O-KEY ERP ENTERPRISE - EMPLOYEE REGISTER REPORT', 14, 20);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Company Code: OKAY-GRP-ERP | Official Human Resources Register Record`, 14, 25);
      
      // Horizontal Rule
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 28, 196, 28);

      // Metadata Cards
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`Printed By: ${currentUser.name} (${currentUser.username})`, 14, 34);
      doc.text(`Generated Date: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}`, 14, 39);
      doc.text(`Filter Department: ${reportDept === 'all' ? 'All Departments' : reportDept}`, 110, 34);
      doc.text(`Filter Status: ${reportStatus.toUpperCase()}`, 110, 39);

      // Setup Table
      const headers = [['Emp ID', 'Employee Name', 'Department', 'Position', 'Mobile Phone', 'StartDate', 'Status']];
      const data = filtered.map(emp => {
        let statusText = 'Active';
        if (emp.employmentStatus === 'probation') statusText = 'Probation';
        else if (emp.employmentStatus === 'suspended') statusText = 'Suspended';
        else if (emp.employmentStatus === 'resigned') statusText = 'Resigned';

        return [
          emp.employee_id || 'N/A',
          emp.name || 'N/A',
          emp.department || 'N/A',
          emp.position || 'N/A',
          emp.phone || 'N/A',
          emp.startDate || 'N/A',
          statusText
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: headers,
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 40 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 15 }
        },
        margin: { left: 14, right: 14 }
      });

      // Add Signature Block at bottom
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      if (finalY < 230) {
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        doc.text('Prepared By:', 14, finalY);
        doc.line(14, finalY + 12, 60, finalY + 12);
        doc.setFont('Helvetica', 'normal');
        doc.text(`(${currentUser.name})`, 14, finalY + 17);
        doc.text('Human Resources Specialist', 14, finalY + 21);

        doc.setFont('Helvetica', 'bold');
        doc.text('Authorized Official Sign-Off:', 120, finalY);
        doc.line(120, finalY + 12, 175, finalY + 12);
        doc.setFont('Helvetica', 'normal');
        doc.text('Chief Operations Officer (COO)', 120, finalY + 17);
        doc.text('Date: ____/____/________', 120, finalY + 21);
      }

      // Save PDF
      doc.save(`O-KEY_Employee_Register_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถสร้างไฟล์ PDF ทะเบียนพนักงานได้');
    }
  };

  // CSV Export
  const handleDownloadCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for Thai language Excel support
    csvContent += "Employee ID,Name,Title,First Name,Last Name,Nickname,ID Card,Birth Date,Age,Gender,Phone,Email,Address,Start Date,Department,Position,Role,Bank Name,Bank Account,Emergency Contact,Emergency Phone,Status\n";

    filtered.forEach(emp => {
      const row = [
        `"${emp.employee_id || ''}"`,
        `"${emp.name || ''}"`,
        `"${emp.title || ''}"`,
        `"${emp.firstName || ''}"`,
        `"${emp.lastName || ''}"`,
        `"${emp.nickname || ''}"`,
        `"${emp.idCard || ''}"`,
        `"${emp.birthDate || ''}"`,
        `"${emp.age || ''}"`,
        `"${emp.gender || ''}"`,
        `"${emp.phone || ''}"`,
        `"${emp.email || ''}"`,
        `"${emp.address || ''}"`,
        `"${emp.startDate || ''}"`,
        `"${emp.department || ''}"`,
        `"${emp.position || ''}"`,
        `"${emp.approval_level || ''}"`,
        `"${emp.bankName || ''}"`,
        `"${emp.bankAccount || ''}"`,
        `"${emp.emergencyContact || ''}"`,
        `"${emp.emergencyPhone || ''}"`,
        `"${emp.employmentStatus || ''}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `O-KEY_Employee_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export
  const handleDownloadJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filtered, null, 2)
    )}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", `O-KEY_Employee_Register_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="reporting-tab-container">
      {/* Configuration filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-indigo-500" />
          <span>เงื่อนไขการคัดกรองข้อมูลเพื่อรายงานทะเบียนประวัติ</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">เลือกแผนกงาน</label>
            <select
              value={reportDept}
              onChange={e => setReportDept(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">🏢 ทั้งหมดทุกแผนก ({departments.length})</option>
              {departments.map(d => (
                <option key={d.department_id} value={d.department_name}>{d.department_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">สถานะการทำงาน</label>
            <select
              value={reportStatus}
              onChange={e => setReportStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">👥 ทุกสถานะพนักงาน</option>
              <option value="active">🟢 ทำงานประจำ (Active)</option>
              <option value="probation">🟡 ทดลองงาน (Probation)</option>
              <option value="suspended">🔴 พักงานชั่วคราว (Suspended)</option>
              <option value="resigned">⚪ พ้นสภาพพนักงาน (Resigned)</option>
              <option value="deleted">🗑 ถูกถอนข้อมูลพนักงาน (Soft-Deleted)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">การจัดเรียงลำดับ</label>
            <select
              value={reportSort}
              onChange={e => setReportSort(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="employee_id">🔢 เรียงตาม รหัสพนักงาน</option>
              <option value="name">🔤 เรียงตาม ชื่อ-นามสกุล</option>
              <option value="startDate">📅 เรียงตาม วันที่เริ่มเข้าทำงาน</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export launcher cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={handleDownloadExcel}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
        >
          <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">ดาวน์โหลด Excel (.xlsx)</span>
          <span className="text-[10px] text-slate-400">สเปรดชีตจัดรูปแบบองค์กรพร้อมขอบบาร์</span>
        </button>

        <button
          onClick={handleDownloadPdf}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
        >
          <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">ออกเอกสารทางราชการ PDF</span>
          <span className="text-[10px] text-slate-400">ดาวน์โหลด PDF เพื่อสั่งพิมพ์หรือเก็บลงแฟ้ม</span>
        </button>

        <button
          onClick={handleDownloadCsv}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
        >
          <div className="h-10 w-10 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileDown className="h-5 w-5" />
          </div>
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">ดาวน์โหลด CSV (.csv)</span>
          <span className="text-[10px] text-slate-400">แยกคั่นด้วยเครื่องหมายจุลภาค</span>
        </button>

        <button
          onClick={handleDownloadJson}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
        >
          <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileJson className="h-5 w-5" />
          </div>
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">อิมพอร์ตแบคอัป JSON</span>
          <span className="text-[10px] text-slate-400">ดาวน์โหลดฐานข้อมูลบุคลากรรูปแบบ JSON</span>
        </button>
      </div>

      {/* PRINT PREVIEW LETTERHEAD PANEL */}
      <div className="bg-slate-100 dark:bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1">
          <Printer className="h-3.5 w-3.5" />
          แสดงตัวอย่างภาพก่อนพิมพ์เอกสารจริง (Live Report Print-Preview Sheet)
        </span>

        {/* The Page Mockup */}
        <div className="bg-white text-slate-800 p-8 md:p-12 w-full max-w-[800px] aspect-[1/1.414] shadow-xl border border-slate-200 rounded-xs space-y-6 flex flex-col justify-between font-sans relative overflow-hidden text-left">
          {/* Accent top ribbon */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-900" />
          
          <div className="space-y-6">
            {/* Mock Header Letterhead */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-md font-extrabold text-indigo-950 leading-tight uppercase tracking-tight">
                  OKAY ERP GROUP CO., LTD.
                </h1>
                <p className="text-[10px] text-slate-400 mt-1">
                  101 Sukhumvit Rd, Khlong Toei, Bangkok 10110 Thailand <br/>
                  Phone: +66 (0) 2234 5678 | Email: contact@okey.com
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-indigo-50 text-indigo-900 font-bold text-[9px] px-2.5 py-1 rounded-sm border border-indigo-100 uppercase tracking-widest">
                  Official Register
                </span>
                <p className="text-[8px] text-slate-400 mt-1">Code: OKAY-EMPR-2026</p>
              </div>
            </div>

            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-lg font-extrabold text-slate-800 text-center tracking-tight">
                รายงานทะเบียนประวัติรายชื่อพนักงานองค์กร
              </h2>
              <p className="text-[10px] text-slate-400 text-center mt-1">
                รายชื่อบุคลากรที่คัดกรองตามหลักเกณฑ์การจัดวางสถิติงบประมาณค่าใช้จ่ายองค์กร
              </p>
            </div>

            {/* Meta statistics strip */}
            <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-150 text-center">
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 block">พิมพ์โดย</span>
                <span className="text-[10px] font-bold text-slate-700">{currentUser.name}</span>
              </div>
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 block">วันที่จัดพิมพ์</span>
                <span className="text-[10px] font-bold text-slate-700">{new Date().toLocaleDateString('th-TH')}</span>
              </div>
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 block">ฝ่าย/แผนกที่เลือก</span>
                <span className="text-[10px] font-bold text-slate-700">{reportDept === 'all' ? 'ทุกแผนก' : reportDept}</span>
              </div>
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 block">จำนวนบุคลากร</span>
                <span className="text-[10px] font-bold text-slate-700">{filtered.length} คน</span>
              </div>
            </div>

            {/* Table Mockup */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600 font-bold">
                    <th className="py-2 px-1">ID</th>
                    <th className="py-2 px-1">ชื่อ-นามสกุล</th>
                    <th className="py-2 px-1">แผนกประจำ</th>
                    <th className="py-2 px-1">ตำแหน่งงาน</th>
                    <th className="py-2 px-1">เบอร์โทรศัพท์</th>
                    <th className="py-2 px-1">วันที่เริ่มงาน</th>
                    <th className="py-2 px-1 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.slice(0, 10).map(emp => (
                    <tr key={emp.user_id} className="text-slate-700">
                      <td className="py-2 px-1 font-mono font-bold text-[9px]">{emp.employee_id || 'N/A'}</td>
                      <td className="py-2 px-1 font-bold">{emp.name}</td>
                      <td className="py-2 px-1 text-slate-500">{emp.department}</td>
                      <td className="py-2 px-1 text-slate-500">{emp.position}</td>
                      <td className="py-2 px-1 font-mono text-slate-500">{emp.phone}</td>
                      <td className="py-2 px-1 font-mono text-slate-500">{emp.startDate || 'N/A'}</td>
                      <td className="py-2 px-1 text-center font-bold">
                        {emp.employmentStatus === 'active' && 'Active'}
                        {emp.employmentStatus === 'probation' && 'Probation'}
                        {emp.employmentStatus === 'suspended' && 'Suspended'}
                        {emp.employmentStatus === 'resigned' && 'Resigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length > 10 && (
              <p className="text-center text-[9px] italic text-slate-400">
                และรายการอื่น ๆ อีกจำนวน {filtered.length - 10} รายการที่ซ่อนอยู่ในหน้าพรีวิวนี้...
              </p>
            )}
          </div>

          {/* Official Signature signoff line mockup */}
          <div className="flex justify-between items-end border-t border-slate-150 pt-8 text-[10px] mt-6">
            <div className="space-y-1">
              <p className="text-slate-400">ลงชื่อจัดพิมพ์ (Prepared By)</p>
              <div className="h-6" />
              <p className="font-bold">....................................................................</p>
              <p className="font-bold text-slate-600">({currentUser.name})</p>
              <p className="text-slate-400">เจ้าหน้าที่ทรัพยากรบุคคล (HR Specialist)</p>
            </div>
            
            <div className="space-y-1 text-right">
              <p className="text-slate-400">พยานและผู้รับรองรายงาน (Authorized Approval)</p>
              <div className="h-6" />
              <p className="font-bold">....................................................................</p>
              <p className="font-bold text-slate-600">วิลาสินี มีโชค</p>
              <p className="text-slate-400">ผู้อำนวยการฝ่ายการเงินองค์กร (Finance Director)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
