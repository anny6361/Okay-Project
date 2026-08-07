const fs = require('fs');

// 1. Clean src/data/db.ts
let dbFile = fs.readFileSync('src/data/db.ts', 'utf8');

const strStart = "export const INITIAL_USERS: UserProfile[] = [";
const strEnd = "];\n\nexport const INITIAL_DEPARTMENTS";
const i = dbFile.indexOf(strStart);
const j = dbFile.indexOf(strEnd);

if (i !== -1 && j !== -1) {
  const superAdminOnly = `export const INITIAL_USERS: UserProfile[] = [
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
  dbFile = dbFile.substring(0, i) + superAdminOnly + dbFile.substring(j);
  fs.writeFileSync('src/data/db.ts', dbFile);
  console.log("Updated db.ts INITIAL_USERS successfully");
} else {
  console.log("Could not find start/end indices in db.ts", i, j);
}

