import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Database,
  X,
  AlertTriangle,
  Info
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { UserProfile, Department } from '../types';
import { 
  TARGET_FIELDS, 
  findAutoMapHeader, 
  parseCSV, 
  parseJSON 
} from '../utils/employeeUtils';
import { validateThaiNationalID, calculateAge, hashPassword } from '../data/db';

interface EmployeeImportTabProps {
  existingEmployees: UserProfile[];
  departments: Department[];
  onImportSuccess: (imported: UserProfile[]) => void;
  onCancel: () => void;
}

export default function EmployeeImportTab({ 
  existingEmployees, 
  departments, 
  onImportSuccess, 
  onCancel 
}: EmployeeImportTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'xlsx' | 'csv' | 'json' | null>(null);
  
  // Data parsed from file
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  
  // Header Mapping state: targetFieldKey -> selectedFileHeader
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  // Parsing/loading states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Main file processing engine
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    setFileName(file.name);
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (extension === 'xlsx') {
        setFileType('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet) {
          throw new Error('ไม่พบข้อมูลแผ่นงาน (Worksheet) ในไฟล์ Excel');
        }

        const fileHeaders: string[] = [];
        const fileRows: any[] = [];

        worksheet.eachRow((row, rowNumber) => {
          // ExcelJS row values can be an array where index 0 is empty (1-indexed)
          const rawVals = Array.isArray(row.values) ? row.values : [];
          const rowValues = rawVals.slice(1); // Shift out first index
          
          if (rowNumber === 1) {
            rowValues.forEach(val => {
              const strVal = val !== undefined && val !== null ? String(val).trim() : '';
              if (strVal) fileHeaders.push(strVal);
            });
          } else {
            const rowObj: Record<string, any> = {};
            fileHeaders.forEach((h, idx) => {
              let cellVal = rowValues[idx];
              // Handle ExcelJS rich values or formulas
              if (cellVal && typeof cellVal === 'object') {
                if ('result' in cellVal) cellVal = cellVal.result;
                else if ('text' in cellVal) cellVal = cellVal.text;
              }
              rowObj[h] = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
            });
            if (Object.values(rowObj).some(v => v !== '')) {
              fileRows.push(rowObj);
            }
          }
        });

        if (fileHeaders.length === 0) {
          throw new Error('ไม่พบแถวหัวตาราง (Header Row) ในไฟล์ Excel');
        }

        setHeaders(fileHeaders);
        setRawRows(fileRows);
        autoMapHeaders(fileHeaders);
        setSuccessMsg(`อ่านไฟล์ Excel สำเร็จ! พบหัวตาราง ${fileHeaders.length} คอลัมน์ และข้อมูล ${fileRows.length} รายการ`);
      } else if (extension === 'csv') {
        setFileType('csv');
        const text = await file.text();
        const { headers: csvHeaders, rows: csvRows } = parseCSV(text);
        
        if (csvHeaders.length === 0) {
          throw new Error('ไม่พบข้อมูลแถวหัวตารางในไฟล์ CSV');
        }

        setHeaders(csvHeaders);
        setRawRows(csvRows);
        autoMapHeaders(csvHeaders);
        setSuccessMsg(`อ่านไฟล์ CSV สำเร็จ! พบหัวตาราง ${csvHeaders.length} คอลัมน์ และข้อมูล ${csvRows.length} รายการ`);
      } else if (extension === 'json') {
        setFileType('json');
        const text = await file.text();
        const { headers: jsonHeaders, rows: jsonRows } = parseJSON(text);
        
        if (jsonHeaders.length === 0) {
          throw new Error('ไม่พบออบเจกต์ข้อมูลในอาร์เรย์ไฟล์ JSON');
        }

        setHeaders(jsonHeaders);
        setRawRows(jsonRows);
        autoMapHeaders(jsonHeaders);
        setSuccessMsg(`อ่านไฟล์ JSON สำเร็จ! พบคอลัมน์จากคีย์ ${jsonHeaders.length} รายการ และข้อมูล ${jsonRows.length} แถว`);
      } else {
        throw new Error('ไม่รองรับรูปแบบไฟล์ที่อัปโหลด กรุณาใช้ไฟล์ .xlsx, .csv หรือ .json เท่านั้น');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการโหลดไฟล์');
      setFileType(null);
      setHeaders([]);
      setRawRows([]);
      setMapping({});
    } finally {
      setIsProcessing(false);
    }
  };

  // Perform synonyms matching
  const autoMapHeaders = (fileHeaders: string[]) => {
    const initialMapping: Record<string, string> = {};
    TARGET_FIELDS.forEach(field => {
      const match = findAutoMapHeader(field.key, fileHeaders);
      if (match) {
        initialMapping[field.key] = match;
      } else {
        initialMapping[field.key] = ''; // No match
      }
    });
    setMapping(initialMapping);
  };

  const handleMappingChange = (fieldKey: string, fileHeader: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: fileHeader
    }));
  };

  // Run full validation on mapped rows
  const validateMappedRows = () => {
    const validatedRows: Array<{
      raw: any;
      mapped: Partial<UserProfile> & { passwordConfirm?: string };
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }> = [];

    rawRows.forEach((row, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const mapped: Record<string, any> = {};

      TARGET_FIELDS.forEach(field => {
        const fileHeader = mapping[field.key];
        let val = fileHeader ? row[fileHeader] : '';
        
        // Trim and clean val
        if (typeof val === 'string') val = val.trim();
        mapped[field.key] = val || '';
      });

      // Enforce Employee ID to be identical to Username
      if (mapped.username) {
        mapped.employee_id = mapped.username;
      }

      // 1. Validate Username (Required, Pattern "OkayXXXX", Unique)
      const uName = mapped.username;
      if (!uName) {
        errors.push('จำเป็นต้องมี Username');
      } else {
        const pattern = /^Okay\d+$/i;
        if (!pattern.test(uName)) {
          errors.push('Username ต้องขึ้นต้นด้วย Okay และตามด้วยเลขลำดับ (เช่น Okay0001)');
        }
        const duplicateInDb = existingEmployees.some(u => u.username?.toLowerCase() === uName.toLowerCase());
        const duplicateInBatch = validatedRows.some(vr => vr.mapped.username?.toLowerCase() === uName.toLowerCase());
        if (duplicateInDb || duplicateInBatch) {
          errors.push(`Username '${uName}' ซ้ำกับข้อมูลในฐานข้อมูลหรือข้อมูลนำเข้าแถวอื่น`);
        }
      }

      // 2. Validate Employee ID (Required, Unique)
      const empId = mapped.employee_id;
      if (!empId) {
        errors.push('จำเป็นต้องระบุรหัสพนักงาน');
      } else {
        const duplicateInDb = existingEmployees.some(u => u.employee_id?.toLowerCase() === empId.toLowerCase());
        const duplicateInBatch = validatedRows.some(vr => vr.mapped.employee_id?.toLowerCase() === empId.toLowerCase());
        if (duplicateInDb || duplicateInBatch) {
          errors.push(`รหัสพนักงาน '${empId}' ซ้ำกับที่มีอยู่แล้ว`);
        }
      }

      // 3. Validate National ID Card (13-digit, unique)
      const idCard = mapped.idCard?.replace(/[^0-9]/g, '');
      mapped.idCard = idCard; // Save cleaned
      if (!idCard) {
        errors.push('จำเป็นต้องระบุเลขบัตรประชาชน 13 หลัก');
      } else {
        if (idCard.length !== 13) {
          errors.push('เลขบัตรประชาชนต้องมีครบ 13 หลัก');
        } else if (!validateThaiNationalID(idCard)) {
          warnings.push('เลขบัตรประชาชนตรวจสอบหลักตรวจสอบ (Check Digit) ไม่ผ่านหลักคณิตศาสตร์สากล (แต่สามารถฝืนเซฟได้)');
        }
        
        const duplicateInDb = existingEmployees.some(u => u.idCard === idCard);
        const duplicateInBatch = validatedRows.some(vr => vr.mapped.idCard === idCard);
        if (duplicateInDb || duplicateInBatch) {
          errors.push(`เลขบัตรประชาชน '${idCard}' ซ้ำกับบุคลากรในบริษัท`);
        }
      }

      // 4. Validate Basic Info (Name, Phone, Department, Position)
      if (!mapped.name && (!mapped.firstName || !mapped.lastName)) {
        errors.push('จำเป็นต้องระบุ ชื่อ-นามสกุลจริง');
      }
      if (!mapped.phone) {
        errors.push('จำเป็นต้องระบุเบอร์โทรศัพท์');
      }
      if (!mapped.department) {
        errors.push('จำเป็นต้องระบุแผนก');
      }
      if (!mapped.position) {
        errors.push('จำเป็นต้องระบุตำแหน่ง');
      }

      // Sync and structure Names if separated
      if (!mapped.name && mapped.firstName && mapped.lastName) {
        mapped.name = `${mapped.firstName} ${mapped.lastName}`;
      } else if (mapped.name && (!mapped.firstName || !mapped.lastName)) {
        const parts = mapped.name.split(/\s+/);
        mapped.firstName = parts[0] || '';
        mapped.lastName = parts.slice(1).join(' ') || '';
      }

      // Default title prefix
      if (!mapped.title) {
        mapped.title = mapped.gender === 'female' ? 'นางสาว' : 'นาย';
      }

      // Auto age calculation
      if (mapped.birthDate) {
        mapped.age = calculateAge(mapped.birthDate);
      }

      // Default passwords
      mapped.password = 'password123'; // Default secure initial password
      mapped.force_password_change = true; // Force change password on first login
      mapped.is_active = true;

      validatedRows.push({
        raw: row,
        mapped,
        isValid: errors.length === 0,
        errors,
        warnings
      });
    });

    return validatedRows;
  };

  const processedRows = validateMappedRows();
  const validRows = processedRows.filter(r => r.isValid);
  const invalidRows = processedRows.filter(r => !r.isValid);

  const handleCommitImport = () => {
    if (validRows.length === 0) {
      alert('ไม่มีแถวข้อมูลที่ผ่านการตรวจสอบ กรุณาจับคู่คอลัมน์ให้ตรงหลักเกณฑ์');
      return;
    }

    const newEmployees = validRows.map(vr => {
      const u = vr.mapped;
      
      // Structure profile picture or use generic fallback
      let pic = '';
      if (u.gender === 'female') {
        pic = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';
      } else {
        pic = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';
      }

      const builtUser: UserProfile = {
        user_id: `user-import-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: u.username!,
        employee_id: u.employee_id!,
        name: u.name!,
        phone: u.phone!,
        password: hashPassword('password123'),
        department: u.department!,
        position: u.position!,
        is_active: true,
        approval_level: u.approval_level || 'Level 1',
        profilePictureUrl: pic,
        force_password_change: true,
        title: u.title || 'นาย',
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        nickname: u.nickname || '',
        idCard: u.idCard || '',
        birthDate: u.birthDate || '',
        age: u.age || 0,
        gender: u.gender || 'male',
        address: u.address || 'สำนักงานใหญ่องค์กร',
        startDate: u.startDate || new Date().toISOString().split('T')[0],
        employmentStatus: 'active',
        bankName: u.bankName || 'ธนาคารกสิกรไทย (KBank)',
        bankAccount: u.bankAccount || '',
        emergencyContact: u.emergencyContact || '',
        emergencyPhone: u.emergencyPhone || '',
        deleted: false
      };

      return builtUser;
    });

    onImportSuccess(newEmployees);
  };

  const handleClear = () => {
    setFileName('');
    setFileType(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6" id="import-hub-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-500" />
            <span>เครื่องมืออิมพอร์ตข้อมูลพนักงาน (Enterprise Auto-Mapper)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            นำเข้าไฟล์ข้อมูลบุคลากรแบบกลุ่มในรูปแบบ Excel (.xlsx), CSV, หรือ JSON พร้อมกลไกถอดคำและจับคู่ฟิลด์อัจฉริยะอัตโนมัติ
          </p>
        </div>
        {fileType && (
          <button
            onClick={handleClear}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/40"
          >
            เลือกไฟล์ใหม่
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-start gap-3">
          <Check className="h-5 w-5 mt-0.5 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* STEP 1: Upload box */}
      {!fileType && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragActive 
              ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10' 
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,.json"
            onChange={handleFileInput}
            className="hidden"
          />
          {isProcessing ? (
            <div className="space-y-3">
              <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">กำลังอ่านข้อมูลและวิเคราะห์โครงสร้างไฟล์...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-14 w-14 bg-indigo-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-slate-700 text-indigo-500">
                <Upload className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  ลากไฟล์ Excel, CSV หรือ JSON มาวางที่นี่
                </p>
                <p className="text-[11px] text-slate-400">
                  หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์ของคุณ (ขนาดสูงสุด 10MB)
                </p>
              </div>
              <div className="flex justify-center gap-4 text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 max-w-sm mx-auto">
                <span className="flex items-center gap-1">🟢 Excel (.xlsx)</span>
                <span className="flex items-center gap-1">🟢 Flat CSV (.csv)</span>
                <span className="flex items-center gap-1">🟢 Standard JSON (.json)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Mapping and Setup Dashboard */}
      {fileType && headers.length > 0 && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-500" />
                <span>การจัดวางโครงสร้างคอลัมน์และจับคู่ฟิลด์ข้อมูล (Auto Schema Matching)</span>
              </h3>
              <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Synonym-Engine: Active
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              * ระบบจำลองการจับคู่คอลัมน์อัตโนมัติโดยวิเคราะห์รากคำทั้งภาษาไทยและอังกฤษ หากคอลัมน์ในไฟล์สะกดแตกต่างออกไป คุณสามารถปรับเปลี่ยนคู่ความสัมพันธ์ให้ถูกต้องแมนนวลได้ทันทีในหน้าจอนี้
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TARGET_FIELDS.map(field => {
                const isMapped = !!mapping[field.key];
                return (
                  <div 
                    key={field.key} 
                    className={`p-3 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                      isMapped 
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
                        : 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-200/50 dark:border-amber-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {field.label}
                        {field.required && <strong className="text-rose-500 ml-0.5">*</strong>}
                      </span>
                      {isMapped ? (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/25 px-1.5 py-0.2 rounded-full">
                          จับคู่แล้ว
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/25 px-1.5 py-0.2 rounded-full">
                          ข้ามฟิลด์
                        </span>
                      )}
                    </div>
                    
                    <select
                      value={mapping[field.key] || ''}
                      onChange={e => handleMappingChange(field.key, e.target.value)}
                      className="w-full text-[11px] px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- ไม่จับคู่ (ข้ามคอลัมน์นี้) --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          📁 {h}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Validation and Row Summary Box */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>ตารางตรวจสอบความถูกต้องของรายการ ({processedRows.length} แถวข้อมูล)</span>
            </h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse bg-slate-50/50 dark:bg-slate-950/10">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3">ลำดับ</th>
                      <th className="p-3">Username</th>
                      <th className="p-3">รหัสพนักงาน</th>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">เลขบัตรประชาชน</th>
                      <th className="p-3">แผนก & ตำแหน่ง</th>
                      <th className="p-3 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {processedRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/20 ${
                          !row.isValid ? 'bg-rose-50/10' : ''
                        }`}
                      >
                        <td className="p-3 text-slate-400 font-mono font-bold">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">
                          {row.mapped.username || <span className="text-rose-500">ว่าง</span>}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold font-mono">
                          {row.mapped.employee_id || <span className="text-rose-500">ว่าง</span>}
                        </td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                          {row.mapped.name || <span className="text-slate-400">{row.mapped.firstName} {row.mapped.lastName}</span> || <span className="text-rose-500">ว่าง</span>}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {row.mapped.idCard || <span className="text-rose-500">ว่าง</span>}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          🏢 {row.mapped.department || <span className="text-rose-500">ว่าง</span>} <br/> 
                          💼 {row.mapped.position || <span className="text-rose-500">ว่าง</span>}
                        </td>
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="bg-emerald-100 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/40 dark:border-emerald-800/30">
                                ผ่าน (Valid)
                              </span>
                              {row.warnings.length > 0 && (
                                <span className="text-[8px] text-amber-500 font-bold flex items-center gap-0.5" title={row.warnings.join(', ')}>
                                  ⚠ มีคำเตือน
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="group relative inline-block">
                              <span className="bg-rose-100 dark:bg-rose-950/45 text-rose-800 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200/40 dark:border-rose-800/30 cursor-help flex items-center gap-1 justify-center mx-auto">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span>ไม่ผ่าน</span>
                              </span>
                              
                              <div className="absolute right-0 bottom-full mb-1 bg-slate-950 text-white p-2.5 rounded-lg text-[9px] w-56 hidden group-hover:block z-50 shadow-2xl border border-slate-800 text-left space-y-1">
                                <span className="font-extrabold text-rose-400 block border-b border-slate-800 pb-1 mb-1">รายการข้อผิดพลาด:</span>
                                {row.errors.map((err, eIdx) => (
                                  <p key={eIdx} className="leading-relaxed text-slate-300">• {err}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* STEP 4: Submit section */}
          <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                สรุปภาพรวมการนำเข้าพนักงานรายกลุ่ม
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">
                  ทั้งหมด: <strong className="text-slate-900 dark:text-white">{processedRows.length} คน</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  ✓ พร้อมเซฟเข้าระบบ: <strong className="text-emerald-700 dark:text-emerald-300">{validRows.length} คน</strong>
                </span>
                {invalidRows.length > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    ❌ ตกหล่น/ไม่ผ่านเกณฑ์: <strong className="text-rose-700 dark:text-rose-300">{invalidRows.length} คน</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={validRows.length === 0}
                className="px-6 py-2.5 bg-green-400 hover:bg-green-300 disabled:bg-slate-200 disabled:text-slate-400 active:bg-green-500 text-black rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-green-500/20"
              >
                <Check className="h-4 w-4" />
                <span>ยืนยันบันทึกพนักงานจำนวน {validRows.length} ท่าน</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
