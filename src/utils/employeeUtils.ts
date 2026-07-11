import { UserProfile } from '../types';

// Calculate work tenure / work age (Years, Months, Days) in Thai format
export function calculateWorkTenure(startDateStr: string | undefined): string {
  if (!startDateStr) return 'N/A';
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return 'N/A';
  
  const now = new Date();
  if (start > now) return 'ยังไม่เริ่มงาน';

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months--;
    // Get last day of previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} ปี`);
  if (months > 0) parts.push(`${months} เดือน`);
  if (days > 0 || parts.length === 0) parts.push(`${days} วัน`);
  return parts.join(' ');
}

// Automatically generate next Employee ID with pattern EMP-00X
export function generateNextEmployeeId(users: UserProfile[]): string {
  const pattern = /^EMP-(\d+)$/i;
  let maxNum = 0;
  
  users.forEach(u => {
    if (u.employee_id) {
      const match = u.employee_id.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `EMP-${String(nextNum).padStart(3, '0')}`;
}

// Default corporate profile photo presets
export const AVATAR_PRESETS = [
  { id: 'f1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', gender: 'female', label: 'ผู้หญิง (สุภาพ)' },
  { id: 'm1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', gender: 'male', label: 'ผู้ชาย (สุภาพ)' },
  { id: 'f2', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', gender: 'female', label: 'ผู้หญิง (เป็นกันเอง)' },
  { id: 'm2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', gender: 'male', label: 'ผู้ชาย (สากล)' }
];

// List of official Thai banks
export const THAI_BANKS = [
  'ธนาคารกสิกรไทย (KBank)',
  'ธนาคารไทยพาณิชย์ (SCB)',
  'ธนาคารกรุงเทพ (BBL)',
  'ธนาคารกรุงไทย (KTB)',
  'ธนาคารทหารไทยธนชาต (ttb)',
  'ธนาคารออมสิน (GSB)',
  'ธนาคารกรุงศรีอยุธยา (BAY)',
  'ธนาคารอาคารสงเคราะห์ (GHB)',
  'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)',
  'ธนาคารยูโอบี (UOB)',
  'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
  'ธนาคารซีไอเอ็มบี ไทย (CIMBT)',
  'ธนาคารเกียรตินาคินภัทร (KKP)'
];

// Target fields available in UserProfile mapping
export const TARGET_FIELDS = [
  { key: 'username', label: 'Username (รหัสเข้าใช้ขึ้นต้นด้วย Okay)', required: true },
  { key: 'employee_id', label: 'รหัสพนักงาน (ใช้ข้อมูลเดียวกันกับ Username)', required: true },
  { key: 'name', label: 'ชื่อ-นามสกุลจริง', required: true },
  { key: 'title', label: 'คำนำหน้า (นาย/นาง/นางสาว)', required: false },
  { key: 'firstName', label: 'ชื่อจริง', required: false },
  { key: 'lastName', label: 'นามสกุล', required: false },
  { key: 'nickname', label: 'ชื่อเล่น', required: false },
  { key: 'idCard', label: 'เลขประจำตัวประชาชน (13 หลัก)', required: true },
  { key: 'birthDate', label: 'วันเดือนปีเกิด (YYYY-MM-DD)', required: false },
  { key: 'gender', label: 'เพศ (male/female/other)', required: false },
  { key: 'phone', label: 'เบอร์โทรศัพท์', required: true },
  { key: 'email', label: 'อีเมล', required: false },
  { key: 'address', label: 'ที่อยู่ปัจจุบัน', required: false },
  { key: 'startDate', label: 'วันที่เริ่มงาน (YYYY-MM-DD)', required: false },
  { key: 'department', label: 'แผนก (Department)', required: true },
  { key: 'position', label: 'ตำแหน่งงาน (Position)', required: true },
  { key: 'approval_level', label: 'ระดับสิทธิ์ผู้อนุมัติ (Level 1-4/Finance/Admin)', required: false },
  { key: 'bankName', label: 'ชื่อธนาคาร', required: false },
  { key: 'bankAccount', label: 'เลขที่บัญชีธนาคาร', required: false },
  { key: 'emergencyContact', label: 'ผู้ติดต่อฉุกเฉิน', required: false },
  { key: 'emergencyPhone', label: 'เบอร์ติดต่อฉุกเฉิน', required: false },
];

// Synonym map for automatic header auto-mapping
export const FIELD_SYNONYMS: Record<string, string[]> = {
  username: ['username', 'ยูสเซอร์', 'ชื่อผู้ใช้', 'บัญชีผู้ใช้', 'รหัสเข้าใช้'],
  employee_id: ['employee_id', 'employeeid', 'รหัสพนักงาน', 'รหัสตัว', 'emp_id', 'empid', 'รหัส'],
  name: ['name', 'ชื่อ-นามสกุล', 'ชื่อ นามสกุล', 'ชื่อและนามสกุล', 'fullname', 'full name', 'ชื่อสกุล', 'ชื่อพนักงาน'],
  title: ['title', 'คำนำหน้า', 'คำนำหน้าชื่อ', 'prefix'],
  firstName: ['firstname', 'first name', 'ชื่อ', 'ชื่อจริง'],
  lastName: ['lastname', 'last name', 'นามสกุล', 'สกุล'],
  nickname: ['nickname', 'nick name', 'ชื่อเล่น'],
  idCard: ['idcard', 'id card', 'national id', 'เลขประจำตัวประชาชน', 'เลขบัตรประชาชน', 'เลขบัตร', 'บัตรประชาชน', 'เลข 13 หลัก', 'citizen_id', 'เลขบัตรประจำตัวประชาชน'],
  birthDate: ['birthdate', 'birth date', 'dob', 'วันเกิด', 'วันเดือนปีเกิด', 'วัน/เดือน/ปีเกิด'],
  gender: ['gender', 'sex', 'เพศ'],
  phone: ['phone', 'mobile', 'telephone', 'เบอร์โทร', 'เบอร์โทรศัพท์', 'เบอร์มือถือ', 'เบอร์ติดต่อ'],
  email: ['email', 'e-mail', 'เมล', 'อีเมล', 'อีเมล์'],
  address: ['address', 'ที่อยู่', 'ที่อยู่ปัจจุบัน', 'ที่พักอาศัย', 'ที่อยู่ตามทะเบียนบ้าน'],
  startDate: ['startdate', 'start date', 'วันที่เริ่มงาน', 'วันเริ่มงาน', 'เริ่มงานเมื่อ', 'วันที่เริ่มงาน'],
  department: ['department', 'dept', 'แผนก', 'ฝ่าย', 'แผนกงาน'],
  position: ['position', 'ตำแหน่ง', 'ตำแหน่งงาน'],
  approval_level: ['approval_level', 'role', 'สิทธิ์', 'ระดับสิทธิ์', 'สิทธิ์ผู้อนุมัติ', 'ระดับพนักงาน'],
  bankName: ['bankname', 'bank', 'ธนาคาร', 'ชื่อธนาคาร', 'บัญชีธนาคาร'],
  bankAccount: ['bankaccount', 'accountno', 'accountnumber', 'เลขบัญชี', 'เลขที่บัญชี', 'เลขบัญชีธนาคาร'],
  emergencyContact: ['emergencycontact', 'emergency contact', 'ติดต่อฉุกเฉิน', 'ผู้ติดต่อฉุกเฉิน', 'คนติดต่อฉุกเฉิน', 'บุคคลติดต่อฉุกเฉิน'],
  emergencyPhone: ['emergencyphone', 'emergency phone', 'เบอร์ติดต่อฉุกเฉิน', 'เบอร์ฉุกเฉิน', 'โทรฉุกเฉิน', 'เบอร์ผู้ติดต่อฉุกเฉิน'],
};

// Automatic header mapping logic
export function findAutoMapHeader(fieldKey: string, headers: string[]): string {
  const synonyms = FIELD_SYNONYMS[fieldKey] || [];
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-zA-Z0-9ก-๙]/g, ''));
  
  for (const synonym of synonyms) {
    const normSyn = synonym.toLowerCase().replace(/[^a-zA-Z0-9ก-๙]/g, '');
    const foundIdx = normalizedHeaders.findIndex(nh => nh === normSyn || nh.includes(normSyn) || normSyn.includes(nh));
    if (foundIdx !== -1) {
      return headers[foundIdx];
    }
  }
  return '';
}

// Basic parsed CSV parser
export function parseCSV(text: string): { headers: string[]; rows: any[] } {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] || '';
    });
    return rowObj;
  });
  
  return { headers, rows };
}

// Basic JSON parser
export function parseJSON(text: string): { headers: string[]; rows: any[] } {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(arr[0]);
  return { headers, rows: arr };
}
