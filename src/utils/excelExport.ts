import ExcelJS from 'exceljs';
import { ExpenseRequest, UserProfile, EnterpriseAuditLog, JournalEntry, DepartmentBudget, Department } from '../types';

/**
 * Get current date/time formatted for Thais
 */
function getFormattedDateTime(): string {
  const d = new Date();
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Bangkok'
  }) + ' (GMT+7)';
}

/**
 * Utility to trigger browser download of an ExcelJS workbook buffer
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Common Corporate Styling Theme Constants (Google Sheets Aesthetic)
 */
const COLORS = {
  headerBg: 'FFE2EFDA',     // Soft Light Green (Google Sheets Style)
  headerText: 'FF1E293B',   // Dark Slate for high contrast text
  zebraRowBg: 'FFF8FBF9',   // Very soft green/grey tint for alternating rows (Zebra striping)
  borderLight: 'FFCBD5E1',  // Slate 300 thin borders
  logoBg: 'FF1B4332',       // Deep Forest Green for branding

  // Status Badge Background & Font Colors
  statusApprovedBg: 'FFE6F4EA', // Emerald-50
  statusApprovedFg: 'FF137333', // Emerald-700
  statusPendingBg: 'FFFEF7E0',  // Amber-50
  statusPendingFg: 'FFB06000',  // Amber-700
  statusRejectedBg: 'FFFCE8E6', // Rose-50
  statusRejectedFg: 'FFC5221F', // Rose-700
  statusDraftBg: 'FFF1F3F4',    // Gray-50
  statusDraftFg: 'FF3C4043',    // Gray-700
};

/**
 * Fetch company logo image dynamically and convert to base64 for workbook embedding
 */
async function getLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch('/src/assets/images/corporate_logo_minimalist_1783570910802.jpg');
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error loading logo image for Excel:', err);
    return null;
  }
}

/**
 * Create beautiful Corporate Header Banner on a worksheet with embedded logo
 */
async function createExcelHeader(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet, 
  title: string, 
  reporterName: string, 
  columnCount: number
) {
  // Add some spacing
  worksheet.addRow([]);

  // Fetch logo base64 and add to sheet if available
  const logoBase64 = await getLogoBase64();
  if (logoBase64) {
    try {
      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: 'jpeg',
      });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 1 },
        ext: { width: 140, height: 42 }
      });
    } catch (err) {
      console.error('Failed to append logo image:', err);
    }
  }

  // Row 2: Company Name (align left next to logo if logo exists, or at start)
  const brandRow = worksheet.getRow(2);
  brandRow.height = 35;
  const startCol = logoBase64 ? 3 : 1;
  worksheet.mergeCells(2, startCol, 2, columnCount);
  const brandCell = brandRow.getCell(startCol);
  brandCell.value = 'O-KEY EXPENSE MANAGEMENT CO., LTD.  |  ENTERPRISE PORTAL';
  brandCell.font = {
    name: 'Inter',
    size: 13,
    bold: true,
    color: { argb: 'FF1B4332' } // Deep Forest Green
  };
  brandCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 3: Report Title (Row 3)
  const titleRow = worksheet.getRow(3);
  titleRow.height = 25;
  worksheet.mergeCells(3, 1, 3, columnCount);
  const titleCell = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = {
    name: 'Inter',
    size: 14,
    bold: true,
    color: { argb: 'FF0F172A' } // Slate 900
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Metadata Panel (Row 4)
  const metaRow = worksheet.getRow(4);
  metaRow.height = 18;
  worksheet.mergeCells(4, 1, 4, columnCount);
  const metaCell = metaRow.getCell(1);
  metaCell.value = `ผู้พิมพ์รายงาน: ${reporterName || 'พนักงาน ERP'}  |  พิมพ์เมื่อวันที่: ${getFormattedDateTime()}  |  สถานะข้อมูล: อ้างอิงเรียลไทม์ (Live Connected secure database)`;
  metaCell.font = {
    name: 'Inter',
    size: 9,
    italic: true,
    color: { argb: 'FF475569' } // Slate 600
  };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Extra space
  worksheet.addRow([]);
}

/**
 * Autofit columns beautifully
 */
function autoFitColumns(worksheet: ExcelJS.Worksheet, headerRowIndex: number) {
  worksheet.columns?.forEach(column => {
    let maxLength = 12; // Minimum width
    column.eachCell?.({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber >= headerRowIndex) {
        const valStr = cell.value ? String(cell.value) : '';
        // Approximate length: Thai characters are wide, let's treat them generously
        const displayLength = valStr.split('').reduce((acc, char) => {
          return acc + (char.charCodeAt(0) > 128 ? 1.5 : 1.0);
        }, 0);
        if (displayLength > maxLength) {
          maxLength = Math.min(displayLength + 3, 50); // Cap column width at 50 to prevent crazy values
        }
      }
    });
    column.width = maxLength;
  });
}

/**
 * Format standard data cell borders
 */
function applyCellBorders(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.borderLight } },
    left: { style: 'thin', color: { argb: COLORS.borderLight } },
    bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
    right: { style: 'thin', color: { argb: COLORS.borderLight } }
  };
}

/**
 * Apply Status Badge Coloring logic
 */
function applyStatusBadgeStyle(cell: ExcelJS.Cell, statusText: string) {
  const norm = (statusText || '').toLowerCase().trim();
  let bg = COLORS.statusDraftBg;
  let fg = COLORS.statusDraftFg;

  if (norm === 'approved' || norm === 'cleared' || norm === 'paid' || norm === 'success' || norm === 'completed' || norm === 'active') {
    bg = COLORS.statusApprovedBg;
    fg = COLORS.statusApprovedFg;
  } else if (norm === 'pending' || norm === 'draft' || norm === 'pending_refund' || norm === 'more_info') {
    bg = COLORS.statusPendingBg;
    fg = COLORS.statusPendingFg;
  } else if (norm === 'rejected' || norm === 'cancelled' || norm === 'violation' || norm === 'failed' || norm === 'disabled') {
    bg = COLORS.statusRejectedBg;
    fg = COLORS.statusRejectedFg;
  }

  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: bg }
  };
  cell.font = {
    name: 'Inter',
    size: 10,
    bold: true,
    color: { argb: fg }
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

/**
 * 1. EXPORT EXPENSE REQUESTS (REIMBURSEMENTS, ADVANCES, CLEARINGS)
 */
export async function exportExpenseRequestsToExcel(
  requests: ExpenseRequest[],
  title: string,
  reporterName: string,
  isFilteredList: boolean = false
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'O-Key ERP Excel Service';
  workbook.lastModifiedBy = reporterName;
  workbook.created = new Date();

  const sheetName = isFilteredList ? 'Filtered Requests' : 'All Expense Requests';
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  const columns = [
    { header: 'เลขที่เอกสาร', key: 'id', width: 15 },
    { header: 'ประเภทใบเบิก', key: 'type', width: 15 },
    { header: 'วันที่ทำรายการ', key: 'date', width: 15 },
    { header: 'ชื่อพนักงาน', key: 'employeeName', width: 22 },
    { header: 'แผนก/ฝ่าย', key: 'department', width: 18 },
    { header: 'หัวข้อรายการเบิก', key: 'title', width: 30 },
    { header: 'หมวดหมู่', key: 'category', width: 18 },
    { header: 'จำนวนเงินเบิก', key: 'amount', width: 16 },
    { header: 'สถานะ', key: 'status', width: 15 },
    { header: 'ผู้ตรวจสอบ/อนุมัติ', key: 'current_approver', width: 20 },
    { header: 'นโยบายควบคุม', key: 'policyStatus', width: 15 },
    { header: 'เลขผู้เสียภาษีร้านค้า', key: 'taxId', width: 18 },
    { header: 'ภาษีมูลค่าเพิ่ม (VAT)', key: 'vatAmount', width: 16 },
    { header: 'ยอดเงินสุทธิ (ก่อน VAT)', key: 'netAmount', width: 16 },
    { header: 'อ้างอิงเงินทดรอง', key: 'advanceId', width: 18 }
  ];

  await createExcelHeader(workbook, worksheet, `${title} (${requests.length} รายการ)`, reporterName, columns.length);

  // Add Table Headers (Row 6)
  const headerRowIndex = 6;
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 26;

  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    cell.font = {
      name: 'Inter',
      size: 11,
      bold: true,
      color: { argb: COLORS.headerText }
    };
    cell.alignment = { vertical: 'middle', horizontal: i === 7 || i === 12 || i === 13 ? 'right' : 'center' };
    applyCellBorders(cell);
  });

  // Add Data Rows
  const startDataRow = 7;
  requests.forEach((req, index) => {
    const rowNum = startDataRow + index;
    const row = worksheet.getRow(rowNum);
    row.height = 22;

    const netVal = req.amount - (req.vat_amount || 0);

    const values = [
      req.id,
      req.expense_type?.toUpperCase() || req.type || 'REIMBURSEMENT',
      req.date,
      req.employeeName,
      req.department,
      req.title,
      req.category,
      req.amount,
      req.status,
      req.current_approver || 'อนุมัติเรียบร้อย/สิ้นสุดสายงาน',
      req.policyStatus ? req.policyStatus.toUpperCase() : 'COMPLIANT',
      req.tax_id || 'N/A',
      req.vat_amount || 0,
      netVal,
      req.advance_id || 'N/A'
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Inter', size: 10 };
      applyCellBorders(cell);

      // Zebra striping
      if (index % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.zebraRowBg }
        };
      }

      // Formatting alignments and number values
      if (colIdx === 0 || colIdx === 1 || colIdx === 2 || colIdx === 10 || colIdx === 11 || colIdx === 14) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colIdx === 7 || colIdx === 12 || colIdx === 13) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"฿"#,##0.00';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Highlight policy violations
      if (colIdx === 10 && val === 'VIOLATION') {
        cell.font = { name: 'Inter', size: 10, bold: true, color: { argb: 'FFC5221F' } };
      }

      // Highlight Status column
      if (colIdx === 8) {
        applyStatusBadgeStyle(cell, String(val));
      }
    });
  });

  // Add Aggregate Summaries Row at the bottom
  const totalRowIndex = startDataRow + requests.length;
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.height = 26;

  // Clear cells and add borders
  for (let i = 1; i <= columns.length; i++) {
    const cell = totalRow.getCell(i);
    applyCellBorders(cell);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' } // light slate background
    };
  }

  // Label
  const labelCell = totalRow.getCell(1);
  labelCell.value = ' รวมยอดสรุป ';
  labelCell.font = { name: 'Inter', size: 11, bold: true };
  labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(totalRowIndex, 1, totalRowIndex, 7);

  // Sum formula for amount (Column 8)
  const amountSumCell = totalRow.getCell(8);
  amountSumCell.value = {
    formula: `=SUM(H${startDataRow}:H${totalRowIndex - 1})`,
    date1904: false
  };
  amountSumCell.font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  amountSumCell.numFmt = '"฿"#,##0.00';
  amountSumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Status/Counter Info
  const countCell = totalRow.getCell(9);
  countCell.value = `จำนวน: ${requests.length} รายการ`;
  countCell.font = { name: 'Inter', size: 10, italic: true };
  countCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.mergeCells(totalRowIndex, 9, totalRowIndex, 11);

  // Sum formulas for VAT (Column 13) and Net (Column 14)
  const vatSumCell = totalRow.getCell(13);
  vatSumCell.value = {
    formula: `=SUM(M${startDataRow}:M${totalRowIndex - 1})`,
    date1904: false
  };
  vatSumCell.font = { name: 'Inter', size: 11, bold: true };
  vatSumCell.numFmt = '"฿"#,##0.00';
  vatSumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  const netSumCell = totalRow.getCell(14);
  netSumCell.value = {
    formula: `=SUM(N${startDataRow}:N${totalRowIndex - 1})`,
    date1904: false
  };
  netSumCell.font = { name: 'Inter', size: 11, bold: true };
  netSumCell.numFmt = '"฿"#,##0.00';
  netSumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Auto filter and frozen headers
  worksheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: columns.length }
  };
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: headerRowIndex, activeCell: 'A7', showGridLines: true }
  ];

  autoFitColumns(worksheet, headerRowIndex);
  await downloadWorkbook(workbook, `O-Key_Expense_Report`);
}

/**
 * 2. EXPORT USERS & MASTER EMPLOYEES
 */
export async function exportUsersToExcel(
  users: UserProfile[],
  departments: Department[],
  title: string,
  reporterName: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'O-Key ERP Excel Service';
  
  // Sheet 1: User Profiles & Roles
  const uSheet = workbook.addWorksheet('Employee Directory', { views: [{ showGridLines: true }] });
  const cols = [
    { header: 'User ID', key: 'user_id' },
    { header: 'ชื่อ-นามสกุล', key: 'name' },
    { header: 'ตำแหน่งงาน', key: 'position' },
    { header: 'แผนก/ฝ่าย', key: 'department' },
    { header: 'ระดับสิทธิ์ (Role)', key: 'role' },
    { header: 'อีเมล', key: 'email' },
    { header: 'Username สำหรับเข้าสู่ระบบ', key: 'username' },
    { header: 'สถานะการทำงาน', key: 'status' }
  ];

  await createExcelHeader(workbook, uSheet, title, reporterName, cols.length);

  const headerRow = uSheet.getRow(6);
  headerRow.height = 26;
  cols.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 11, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyCellBorders(cell);
  });

  users.forEach((usr, idx) => {
    const row = uSheet.getRow(7 + idx);
    row.height = 22;
    const isActStr = usr.is_active ? 'Active' : 'Disabled';
    const vals = [
      usr.user_id,
      usr.name,
      usr.position || 'N/A',
      usr.department || 'N/A',
      usr.role || 'Employee',
      usr.email || 'N/A',
      usr.username || 'N/A',
      isActStr
    ];

    vals.forEach((v, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 10 };
      applyCellBorders(cell);
      
      // Zebra striping
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      if (colIdx === 0 || colIdx === 4 || colIdx === 6 || colIdx === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      if (colIdx === 7) {
        applyStatusBadgeStyle(cell, String(v));
      }
    });
  });

  uSheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: cols.length } };
  uSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(uSheet, 6);

  // Sheet 2: Department Budgets
  const dSheet = workbook.addWorksheet('Departments & Budgets', { views: [{ showGridLines: true }] });
  const dCols = [
    { header: 'รหัสแผนก', key: 'id' },
    { header: 'ชื่อแผนก', key: 'name_th' },
    { header: 'ผู้จัดการฝ่าย (Head)', key: 'head_name' },
    { header: 'งบประมาณประจำปี (Budget)', key: 'budget' },
    { header: 'สถานะฝ่าย', key: 'status' }
  ];

  await createExcelHeader(workbook, dSheet, 'ข้อมูลแผนกและงบประมาณการเงินประจำปี', reporterName, dCols.length);

  const dHeaderRow = dSheet.getRow(6);
  dHeaderRow.height = 26;
  dCols.forEach((col, idx) => {
    const cell = dHeaderRow.getCell(idx + 1);
    cell.value = col.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 11, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 3 ? 'right' : 'center' };
    applyCellBorders(cell);
  });

  departments.forEach((dept, idx) => {
    const row = dSheet.getRow(7 + idx);
    row.height = 22;
    const vals = [
      dept.department_id || `DEPT-${idx + 1}`,
      dept.department_name,
      dept.head_of_department || 'ไม่ได้ระบุ',
      dept.budget || 0,
      dept.status || 'active'
    ];

    vals.forEach((v, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 10 };
      applyCellBorders(cell);
      
      // Zebra striping
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      if (colIdx === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"฿"#,##0.00';
      } else if (colIdx === 0 || colIdx === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      if (colIdx === 4) {
        applyStatusBadgeStyle(cell, String(v) === 'active' ? 'Approved' : 'Rejected');
      }
    });
  });

  // Totals for budgets
  const dTotalIdx = 7 + departments.length;
  const dTotalRow = dSheet.getRow(dTotalIdx);
  dTotalRow.height = 24;
  for (let i = 1; i <= dCols.length; i++) {
    const cell = dTotalRow.getCell(i);
    applyCellBorders(cell);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }
  const dLabelCell = dTotalRow.getCell(1);
  dLabelCell.value = ' สรุปงบประมาณรวมทุกแผนก ';
  dLabelCell.font = { name: 'Inter', size: 11, bold: true };
  dSheet.mergeCells(dTotalIdx, 1, dTotalIdx, 3);

  const budgetSumCell = dTotalRow.getCell(4);
  budgetSumCell.value = {
    formula: `=SUM(D7:D${dTotalIdx - 1})`,
    date1904: false
  };
  budgetSumCell.font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  budgetSumCell.numFmt = '"฿"#,##0.00';
  budgetSumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  dSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(dSheet, 6);

  await downloadWorkbook(workbook, `O-Key_Employees_Departments_Master`);
}

/**
 * 3. EXPORT ENTERPRISE AUDIT LOGS
 */
export async function exportAuditLogsToExcel(
  logs: EnterpriseAuditLog[],
  title: string,
  reporterName: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'O-Key ERP Excel Service';

  const sheet = workbook.addWorksheet('Audit Security Logs', { views: [{ showGridLines: true }] });
  const cols = [
    { header: 'Timestamp (เวลาเกิดเหตุ)', key: 'timestamp', width: 22 },
    { header: 'เลขที่อ้างอิงข้อมูล', key: 'ref_id', width: 18 },
    { header: 'ผู้กระทำการ (User/System)', key: 'action_by', width: 22 },
    { header: 'กิจกรรม (Action Type)', key: 'action_type', width: 18 },
    { header: 'ประเภทกิจกรรม (Activity)', key: 'details', width: 30 },
    { header: 'อุปกรณ์ / IP Address / ข้อมูลเพิ่มเติม', key: 'meta', width: 45 }
  ];

  await createExcelHeader(workbook, sheet, title, reporterName, cols.length);

  const headerRow = sheet.getRow(6);
  headerRow.height = 26;
  cols.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 11, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyCellBorders(cell);
  });

  logs.forEach((log, idx) => {
    const row = sheet.getRow(7 + idx);
    row.height = 22;
    const vals = [
      log.timestamp,
      log.ref_id || 'N/A',
      log.action_by,
      log.action_type || 'SYSTEM',
      log.details || 'บันทึกระบบ',
      `IP: ${log.ip_address || 'N/A'} | Browser: ${log.browser || 'N/A'} | OS: ${log.os || 'N/A'}`
    ];

    vals.forEach((v, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 10 };
      applyCellBorders(cell);
      
      // Zebra striping
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }
      
      if (colIdx === 0 || colIdx === 1 || colIdx === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: cols.length } };
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(sheet, 6);

  await downloadWorkbook(workbook, `O-Key_Audit_Trail_Report`);
}

/**
 * 4. EXPORT ACCOUNTING LEDGER & JOURNAL ENTRIES
 */
export async function exportAccountingLedgerToExcel(
  entries: JournalEntry[],
  title: string,
  reporterName: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'O-Key ERP Excel Service';

  const sheet = workbook.addWorksheet('General Ledger', { views: [{ showGridLines: true }] });
  const cols = [
    { header: 'เลขที่ผ่านบัญชี (GL ID)', key: 'journal_id' },
    { header: 'เลขที่เอกสารขอเบิก', key: 'ref_id' },
    { header: 'วันที่บันทึกบัญชี', key: 'date' },
    { header: 'รหัสคู่บัญชี (Accounts)', key: 'account_code' },
    { header: 'เดบิต (Debit - ฿)', key: 'debit' },
    { header: 'เครดิต (Credit - ฿)', key: 'credit' },
    { header: 'คำอธิบายรายการสมุดรายวัน', key: 'description' }
  ];

  await createExcelHeader(workbook, sheet, title, reporterName, cols.length);

  const headerRow = sheet.getRow(6);
  headerRow.height = 26;
  cols.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 11, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 4 || idx === 5 ? 'right' : 'center' };
    applyCellBorders(cell);
  });

  let writeRowIndex = 7;
  entries.forEach((entry, entryIdx) => {
    // We render side-by-side rows for Debit and Credit just like standard ledger!
    const useZebra = entryIdx % 2 === 1;
    
    // Debit Row
    const rowDeb = sheet.getRow(writeRowIndex++);
    rowDeb.height = 20;
    const debVals = [
      entry.journal_id,
      entry.ref_id || 'SYSTEM_AUTO',
      entry.date,
      `Dr. ${entry.debit_account}`,
      entry.amount,
      0,
      entry.description
    ];
    debVals.forEach((v, colIdx) => {
      const cell = rowDeb.getCell(colIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 10 };
      applyCellBorders(cell);

      if (useZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }
      
      if (colIdx === 4 || colIdx === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"฿"#,##0.00';
      } else if (colIdx === 0 || colIdx === 1 || colIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });

    // Credit Row
    const rowCred = sheet.getRow(writeRowIndex++);
    rowCred.height = 20;
    const credVals = [
      entry.journal_id,
      entry.ref_id || 'SYSTEM_AUTO',
      entry.date,
      `   Cr. ${entry.credit_account}`,
      0,
      entry.amount,
      entry.description
    ];
    credVals.forEach((v, colIdx) => {
      const cell = rowCred.getCell(colIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 10, italic: colIdx === 3 };
      applyCellBorders(cell);

      if (useZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }
      
      if (colIdx === 4 || colIdx === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"฿"#,##0.00';
      } else if (colIdx === 0 || colIdx === 1 || colIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // Totals Row
  const totalIdx = writeRowIndex;
  const totalRow = sheet.getRow(totalIdx);
  totalRow.height = 24;
  for (let i = 1; i <= cols.length; i++) {
    const cell = totalRow.getCell(i);
    applyCellBorders(cell);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }
  const labelCell = totalRow.getCell(1);
  labelCell.value = ' รวมยอดงบทดลอง (Trial Balance) ';
  labelCell.font = { name: 'Inter', size: 11, bold: true };
  sheet.mergeCells(totalIdx, 1, totalIdx, 4);

  // Debit sum
  const debSum = totalRow.getCell(5);
  debSum.value = { formula: `=SUM(E7:E${totalIdx - 1})`, date1904: false };
  debSum.font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FF137333' } };
  debSum.numFmt = '"฿"#,##0.00';
  debSum.alignment = { vertical: 'middle', horizontal: 'right' };

  // Credit sum
  const credSum = totalRow.getCell(6);
  credSum.value = { formula: `=SUM(F7:F${totalIdx - 1})`, date1904: false };
  credSum.font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FFC5221F' } };
  credSum.numFmt = '"฿"#,##0.00';
  credSum.alignment = { vertical: 'middle', horizontal: 'right' };

  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: cols.length } };
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(sheet, 6);

  await downloadWorkbook(workbook, `O-Key_General_Ledger`);
}

/**
 * 5. MASTER ALL-IN-ONE MULTI-SHEET ENTERPRISE BACKUP
 */
export async function exportCompleteERPBackupToExcel(
  data: {
    requests: ExpenseRequest[];
    users: UserProfile[];
    departments: Department[];
    auditLogs: EnterpriseAuditLog[];
    journalEntries: JournalEntry[];
    budgets: DepartmentBudget[];
  },
  reporterName: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'O-Key ERP Corporate Excel Engine';
  workbook.lastModifiedBy = reporterName;
  workbook.created = new Date();

  // SHEETS LIST:
  // 1. Dashboard Summary Dashboard Info
  // 2. Expense Requests Master
  // 3. User Directories & Roles
  // 4. Department Financials
  // 5. Accounting General Ledger
  // 6. Security Audit Trail

  // Sheet 1: Executive Dashboard
  const dashSheet = workbook.addWorksheet('Executive Dashboard', { views: [{ showGridLines: true }] });
  await createExcelHeader(workbook, dashSheet, 'O-KEY SYSTEM ERP: EXECUTIVE DATA CONSOLIDATION SUMMARY', reporterName, 6);

  dashSheet.addRow([]);
  dashSheet.addRow(['สรุปภาพรวมทางการเงินและการจัดการระบบ (ERP Overview Stats)']).font = { name: 'Inter', size: 12, bold: true };
  dashSheet.addRow([]);

  // Setup Key Value summaries in visual grid
  const addKpiRow = (label: string, value: any, subtext: string) => {
    const row = dashSheet.addRow(['', label, value, subtext]);
    row.height = 24;
    row.getCell(2).font = { name: 'Inter', size: 10, bold: true, color: { argb: 'FF475569' } };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    row.getCell(2).border = { left: { style: 'medium', color: { argb: 'FF1B4332' } }, top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };

    row.getCell(3).font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(3).border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };

    row.getCell(4).font = { name: 'Inter', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
    row.getCell(4).border = { right: { style: 'thin', color: { argb: 'FFE2E8F0' } }, top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  };

  const totalReqVal = data.requests.reduce((acc, r) => acc + r.amount, 0);
  const clearedVal = data.requests.filter(r => r.status?.toLowerCase() === 'cleared' || r.status?.toLowerCase() === 'paid').reduce((acc, r) => acc + r.amount, 0);
  const pendingVal = data.requests.filter(r => r.status?.toLowerCase() === 'pending').reduce((acc, r) => acc + r.amount, 0);

  addKpiRow('จำนวนใบเบิกทั้งหมดในระบบ', `${data.requests.length} ใบเสร็จ`, 'ครอบคลุมทุกหมวดหมู่สินค้าและบริการ');
  addKpiRow('มูลค่าคำขอเบิกเงินสะสมทั้งหมด', `฿${totalReqVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'ยอดเบิกรวมสะสมทั้งสิ้น');
  addKpiRow('ตัดจ่ายสำเร็จและปิดงบบัญชีแล้ว', `฿${clearedVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'สถานะชำระเงินโอนบัญชีเสร็จสิ้น');
  addKpiRow('รอตรวจพิจารณาลายเซ็นอนุมัติ (Pending Queue)', `฿${pendingVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'อยู่ในขั้นตอนพิจารณาในระบบอนุมัติ');
  addKpiRow('พนักงานผู้ลงทะเบียนใช้งานในระบบ', `${data.users.length} บัญชีรายชื่อ`, 'ผู้ใช้งานระบบที่มีบทบาทต่างๆ');
  addKpiRow('ฝ่าย/แผนกภายในบริษัท', `${data.departments.length} แผนกหลัก`, 'ที่มีงบประมาณแยกควบคุมเฉพาะตัว');
  addKpiRow('บันทึกความปลอดภัยระบบ (Audit Logs)', `${data.auditLogs.length} ประวัติ`, 'ประวัติกิจกรรมการใช้งานในระบบเพื่อการตรวจสอบความโปร่งใส');

  dashSheet.getColumn(2).width = 35;
  dashSheet.getColumn(3).width = 25;
  dashSheet.getColumn(4).width = 45;

  // Sheet 2: Expense Requests
  const reqSheet = workbook.addWorksheet('Expense Requests', { views: [{ showGridLines: true }] });
  const reqCols = [
    { header: 'เลขที่ใบเบิก', key: 'id' },
    { header: 'ประเภท', key: 'type' },
    { header: 'วันที่ทำรายการ', key: 'date' },
    { header: 'ชื่อพนักงาน', key: 'employeeName' },
    { header: 'แผนก/ฝ่าย', key: 'department' },
    { header: 'หัวข้อการเบิก', key: 'title' },
    { header: 'หมวดหมู่', key: 'category' },
    { header: 'จำนวนเงินเบิก (฿)', key: 'amount' },
    { header: 'สถานะ', key: 'status' },
    { header: 'ผู้ตรวจสอบ', key: 'current_approver' },
    { header: 'VAT Amount', key: 'vatAmount' },
    { header: 'Net Amount', key: 'netAmount' }
  ];
  await createExcelHeader(workbook, reqSheet, 'บันทึกประวัติการเบิกค่าใช้จ่าย (Expense Requests Module)', reporterName, reqCols.length);
  const rHeader = reqSheet.getRow(6); rHeader.height = 26;
  reqCols.forEach((col, idx) => {
    const cell = rHeader.getCell(idx + 1);
    cell.value = col.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 10, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 7 || idx === 10 || idx === 11 ? 'right' : 'center' };
    applyCellBorders(cell);
  });
  data.requests.forEach((req, idx) => {
    const row = reqSheet.getRow(7 + idx);
    row.height = 22;
    const vals = [
      req.id,
      req.expense_type?.toUpperCase() || req.type || 'REIMBURSEMENT',
      req.date,
      req.employeeName,
      req.department,
      req.title,
      req.category,
      req.amount,
      req.status,
      req.current_approver || 'อนุมัติเรียบร้อย/สิ้นสุดสายงาน',
      req.vat_amount || 0,
      req.amount - (req.vat_amount || 0)
    ];
    vals.forEach((v, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 9 };
      applyCellBorders(cell);
      
      // Zebra striping
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      if (colIdx === 7 || colIdx === 10 || colIdx === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"฿"#,##0.00';
      } else if (colIdx === 0 || colIdx === 1 || colIdx === 2 || colIdx === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
      if (colIdx === 8) {
        applyStatusBadgeStyle(cell, String(v));
      }
    });
  });
  const rTotalIdx = 7 + data.requests.length;
  const rTotalRow = reqSheet.getRow(rTotalIdx);
  rTotalRow.height = 24;
  for (let i = 1; i <= reqCols.length; i++) {
    applyCellBorders(rTotalRow.getCell(i));
    rTotalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }
  rTotalRow.getCell(1).value = ' ยอดรวมสะสม ';
  rTotalRow.getCell(1).font = { name: 'Inter', size: 10, bold: true };
  reqSheet.mergeCells(rTotalIdx, 1, rTotalIdx, 7);
  rTotalRow.getCell(8).value = { formula: `=SUM(H7:H${rTotalIdx - 1})`, date1904: false };
  rTotalRow.getCell(8).font = { name: 'Inter', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
  rTotalRow.getCell(8).numFmt = '"฿"#,##0.00';
  rTotalRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
  
  reqSheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: reqCols.length } };
  reqSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(reqSheet, 6);

  // Sheet 3: Users
  const userSheet = workbook.addWorksheet('Employee Master', { views: [{ showGridLines: true }] });
  await createExcelHeader(workbook, userSheet, 'ทะเบียนรายชื่อพนักงานและผู้ใช้งาน (User & Employees Directory)', reporterName, 8);
  const uHeader = userSheet.getRow(6); uHeader.height = 26;
  ['User ID', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'แผนก', 'สิทธิ์ระบบ', 'อีเมล', 'Username', 'สถานะ'].forEach((lbl, i) => {
    const cell = uHeader.getCell(i + 1);
    cell.value = lbl;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 10, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyCellBorders(cell);
  });
  data.users.forEach((usr, idx) => {
    const row = userSheet.getRow(7 + idx);
    row.height = 22;
    const isActStr = usr.is_active ? 'Active' : 'Disabled';
    const vals = [usr.user_id, usr.name, usr.position || 'N/A', usr.department || 'N/A', usr.role || 'Employee', usr.email || 'N/A', usr.username || 'N/A', isActStr];
    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 9 };
      applyCellBorders(cell);
      
      // Zebra striping
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      if (cIdx === 0 || cIdx === 4 || cIdx === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
      if (cIdx === 7) {
        applyStatusBadgeStyle(cell, String(v));
      }
    });
  });
  userSheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 8 } };
  userSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(userSheet, 6);

  // Sheet 4: Department Financial Budgets
  const deptSheet = workbook.addWorksheet('Department Budgets', { views: [{ showGridLines: true }] });
  await createExcelHeader(workbook, deptSheet, 'โครงสร้างแผนกและงบประมาณการเงินเฉพาะแผนก (Department Budgets)', reporterName, 6);
  const dHeader = deptSheet.getRow(6); dHeader.height = 26;
  ['รหัสแผนก', 'ชื่อแผนก', 'ผู้จัดการ (Head)', 'งบประมาณที่จัดสรร (Budget)', 'สถานะ'].forEach((lbl, i) => {
    const cell = dHeader.getCell(i + 1);
    cell.value = lbl;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 10, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: i === 3 ? 'right' : 'center' };
    applyCellBorders(cell);
  });
  data.departments.forEach((dept, idx) => {
    const row = deptSheet.getRow(7 + idx);
    row.height = 22;
    const vals = [
      dept.department_id || `DEPT-${idx + 1}`,
      dept.department_name,
      dept.head_of_department || 'ไม่ได้ระบุ',
      dept.budget || 0,
      dept.status || 'active'
    ];
    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 9 };
      applyCellBorders(cell);
      
      // Zebra striping
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      if (cIdx === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"฿"#,##0.00';
      } else if (cIdx === 0 || cIdx === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
      if (cIdx === 4) {
        applyStatusBadgeStyle(cell, String(v) === 'active' ? 'Approved' : 'Rejected');
      }
    });
  });
  const dTIdx = 7 + data.departments.length;
  const dTRow = deptSheet.getRow(dTIdx);
  dTRow.height = 24;
  for (let i = 1; i <= 5; i++) {
    applyCellBorders(dTRow.getCell(i));
    dTRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }
  dTRow.getCell(1).value = ' งบประมาณรวมทุกแผนก ';
  dTRow.getCell(1).font = { name: 'Inter', size: 10, bold: true };
  deptSheet.mergeCells(dTIdx, 1, dTIdx, 3);
  dTRow.getCell(4).value = { formula: `=SUM(D7:D${dTIdx - 1})`, date1904: false };
  dTRow.getCell(4).font = { name: 'Inter', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
  dTRow.getCell(4).numFmt = '"฿"#,##0.00';
  dTRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };

  deptSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(deptSheet, 6);

  // Sheet 5: Accounting Journal entries
  const acctSheet = workbook.addWorksheet('Accounting General Ledger', { views: [{ showGridLines: true }] });
  const acctCols = ['ID บันทึก', 'เอกสารเบิก', 'วันที่บันทึก', 'ผังบัญชีคู่ค้า', 'เดบิต Debit (฿)', 'เครดิต Credit (฿)', 'คำอธิบายรายการ'];
  await createExcelHeader(workbook, acctSheet, 'บัญชีแยกประเภทสมุดรายวันทั่วไป (General Ledger Journal Entries)', reporterName, acctCols.length);
  const aHeader = acctSheet.getRow(6); aHeader.height = 26;
  acctCols.forEach((lbl, idx) => {
    const cell = aHeader.getCell(idx + 1);
    cell.value = lbl;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 10, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 4 || idx === 5 ? 'right' : 'center' };
    applyCellBorders(cell);
  });
  
  let wRowIdx = 7;
  data.journalEntries.forEach((entry, entryIdx) => {
    const useZebra = entryIdx % 2 === 1;
    // Dr. Row
    const rowDeb = acctSheet.getRow(wRowIdx++);
    rowDeb.height = 20;
    const debVals = [entry.journal_id, entry.ref_id || 'SYSTEM', entry.date, `Dr. ${entry.debit_account}`, entry.amount, 0, entry.description];
    debVals.forEach((v, cIdx) => {
      const cell = rowDeb.getCell(cIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 9 };
      applyCellBorders(cell);
      
      if (useZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      if (cIdx === 4 || cIdx === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"฿"#,##0.00';
      } else if (cIdx === 0 || cIdx === 1 || cIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });

    // Cr. Row
    const rowCred = acctSheet.getRow(wRowIdx++);
    rowCred.height = 20;
    const credVals = [entry.journal_id, entry.ref_id || 'SYSTEM', entry.date, `   Cr. ${entry.credit_account}`, 0, entry.amount, entry.description];
    credVals.forEach((v, cIdx) => {
      const cell = rowCred.getCell(cIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 9, italic: cIdx === 3 };
      applyCellBorders(cell);

      if (useZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      if (cIdx === 4 || cIdx === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"฿"#,##0.00';
      } else if (cIdx === 0 || cIdx === 1 || cIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  const aTIdx = wRowIdx;
  const aTRow = acctSheet.getRow(aTIdx);
  aTRow.height = 24;
  for (let i = 1; i <= acctCols.length; i++) {
    applyCellBorders(aTRow.getCell(i));
    aTRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }
  aTRow.getCell(1).value = ' ยอดรวมบัญชีสะสม ';
  aTRow.getCell(1).font = { name: 'Inter', size: 10, bold: true };
  acctSheet.mergeCells(aTIdx, 1, aTIdx, 4);
  aTRow.getCell(5).value = { formula: `=SUM(E7:E${aTIdx - 1})`, date1904: false };
  aTRow.getCell(5).font = { name: 'Inter', size: 10, bold: true, color: { argb: 'FF137333' } };
  aTRow.getCell(5).numFmt = '"฿"#,##0.00';
  aTRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
  aTRow.getCell(6).value = { formula: `=SUM(F7:F${aTIdx - 1})`, date1904: false };
  aTRow.getCell(6).font = { name: 'Inter', size: 10, bold: true, color: { argb: 'FFC5221F' } };
  aTRow.getCell(6).numFmt = '"฿"#,##0.00';
  aTRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };

  acctSheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: acctCols.length } };
  acctSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(acctSheet, 6);

  // Sheet 6: Audit trail security logs
  const logSheet = workbook.addWorksheet('Audit Log Security', { views: [{ showGridLines: true }] });
  const logCols = ['วันที่และเวลา', 'ข้อมูลอ้างอิง', 'ผู้ดำเนินการ', 'รายละเอียดกิจกรรม', 'รายละเอียดระบบเพิ่มเติม'];
  await createExcelHeader(workbook, logSheet, 'บันทึกประวัติการตรวจสอบความโปร่งใสระบบ (Enterprise Security Audit Logs)', reporterName, logCols.length);
  const lHeader = logSheet.getRow(6); lHeader.height = 26;
  logCols.forEach((lbl, idx) => {
    const cell = lHeader.getCell(idx + 1);
    cell.value = lbl;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 10, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyCellBorders(cell);
  });
  data.auditLogs.forEach((log, idx) => {
    const row = logSheet.getRow(7 + idx);
    row.height = 22;
    const vals = [
      log.timestamp, 
      log.ref_id || 'N/A', 
      log.action_by, 
      log.details || 'ระบบ ERP', 
      `IP: ${log.ip_address || 'N/A'} | Browser: ${log.browser || 'N/A'} | OS: ${log.os || 'N/A'}`
    ];
    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = { name: 'Inter', size: 9 };
      applyCellBorders(cell);
      
      // Zebra striping
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      if (cIdx === 0 || cIdx === 1 || cIdx === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });
  logSheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: logCols.length } };
  logSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(logSheet, 6);

  await downloadWorkbook(workbook, 'O-Key_ERP_Comprehensive_Consolidated_Master_Backup');
}

/**
 * 6. EXPORT DYNAMIC DRILL-DOWN TABLES (GOOGLE SHEETS STYLE)
 */
export async function exportDrillDownToExcel(
  title: string,
  headers: string[],
  rows: any[][],
  reporterName: string,
  filename: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'O-Key ERP Corporate Excel Engine';
  workbook.lastModifiedBy = reporterName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Report Data', { views: [{ showGridLines: true }] });

  await createExcelHeader(workbook, sheet, title, reporterName, headers.length);

  // Add Table Headers (Row 6)
  const headerRowIndex = 6;
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.height = 28;

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { name: 'Inter', size: 11, bold: true, color: { argb: COLORS.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyCellBorders(cell);
  });

  // Add Data Rows
  const startDataRow = 7;
  rows.forEach((rowVals, index) => {
    const rowNum = startDataRow + index;
    const row = sheet.getRow(rowNum);
    row.height = 22;

    rowVals.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Inter', size: 10 };
      applyCellBorders(cell);

      // Zebra striping
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraRowBg } };
      }

      // Check if value is a number and represents amount/currency (e.g., if header name contains 'เงิน', 'งบ', 'บาท', 'amount', 'budget', 'spent', 'balance', etc.)
      const hLower = String(headers[colIdx] || '').toLowerCase();
      const isCurrencyHeader = hLower.includes('เงิน') || hLower.includes('งบ') || hLower.includes('บาท') || hLower.includes('amount') || hLower.includes('budget') || hLower.includes('spent') || hLower.includes('ยอดรวม') || hLower.includes('คงเหลือ') || hLower.includes('เดบิต') || hLower.includes('เครดิต');
      
      if (typeof val === 'number') {
        if (isCurrencyHeader) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '"฿"#,##0.00';
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      } else if (colIdx === 0 && String(val).match(/^[A-Z0-9-]{4,}$/i)) {
        // Looks like an ID code
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Format badges for status values
      if (typeof val === 'string' && (val === 'Cleared' || val === 'Paid' || val === 'Pending' || val === 'Rejected' || val === 'Approved')) {
        applyStatusBadgeStyle(cell, val);
      }
    });
  });

  sheet.autoFilter = { from: { row: headerRowIndex, column: 1 }, to: { row: headerRowIndex, column: headers.length } };
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIndex, activeCell: 'A7', showGridLines: true }];
  autoFitColumns(sheet, headerRowIndex);

  await downloadWorkbook(workbook, filename);
}
