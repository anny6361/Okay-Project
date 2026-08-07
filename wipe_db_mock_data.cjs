const fs = require('fs');
let file = fs.readFileSync('src/data/db.ts', 'utf8');

// Wipe INITIAL_DEPARTMENTS
file = file.replace(/export const INITIAL_DEPARTMENTS: Department\[\] = \[\s*\{[^\}]+\},[^\]]+\];/, 'export const INITIAL_DEPARTMENTS: Department[] = [];');

// Wipe INITIAL_USERS except Okay9999
const usersStartStr = "export const INITIAL_USERS: UserProfile[] = [";
const usersStart = file.indexOf(usersStartStr);
const usersEnd = file.indexOf("];\nexport const INITIAL_DEPARTMENTS");
if (usersStart !== -1 && usersEnd !== -1) {
  const superadminOnly = `export const INITIAL_USERS: UserProfile[] = [
  {
    user_id: 'user-superadmin',
    employee_id: 'Okay9999',
    username: 'Okay9999',
    name: 'Super Administrator',
    email: 'superadmin@okey.com',
    phone: '099-999-9999',
    password: 'Okay.co.ltd',
    department: 'ผู้ดูแลระบบสูงสุด',
    position: 'Super Administrator',
    role: 'Administrator',
    is_active: true,
    approval_level: 'Administrator',
    force_password_change: true,
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png',
    title: 'นาย',
    firstName: 'Super',
    lastName: 'Administrator',
    nickname: 'Super',
    idCard: '1200901234999',
    birthDate: '1990-01-01',
    age: calculateAge('1990-01-01'),
    gender: 'male',
    address: 'สำนักงานใหญ่',
    province: 'กรุงเทพมหานคร',
    electricityRegion: 'สำนักงานใหญ่ (กฟผ.)',
    startDate: '2020-01-01',
    employmentStatus: 'active'
  }
`;
  file = file.substring(0, usersStart) + superadminOnly + file.substring(usersEnd);
}

fs.writeFileSync('src/data/db.ts', file);
