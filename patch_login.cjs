const fs = require('fs');
let content = fs.readFileSync('src/components/LoginView.tsx', 'utf8');

content = content.replace(
"import { getDbUsers, saveDbUsers, getDbDepartments, hashPassword, comparePassword, validateThaiNationalID, calculateAge, addEnterpriseAuditLog } from '../data/db';",
`import { getDbUsers, saveDbUsers, getDbDepartments, hashPassword, comparePassword, validateThaiNationalID, calculateAge, addEnterpriseAuditLog } from '../data/db';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';`
);

const loginFnStart = content.indexOf('const handleLogin = (e: React.FormEvent) => {');
const formRenderStart = content.indexOf('return (', loginFnStart);

const newLoginFn = 
`const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!loginPhone.trim()) errors.loginPhone = 'กรุณากรอก Username, อีเมล หรือเบอร์โทรศัพท์';
    if (!loginPassword) errors.loginPassword = 'กรุณากรอกรหัสผ่าน';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMsg('กรุณากรอกข้อมูลบัญชีและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const dbUsers = getDbUsers();
      const userLower = loginPhone.trim().toLowerCase();
      
      const userAccount = dbUsers.find(u => 
        (u.username && u.username.toLowerCase() === userLower) ||
        (u.email && u.email.toLowerCase() === userLower) ||
        (u.phone && u.phone === userLower)
      );

      if (!userAccount) {
        throw new Error('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ');
      }

      if (!userAccount.is_active || userAccount.deleted) {
        throw new Error('บัญชีนี้ถูกระงับการใช้งาน โปรดติดต่อผู้ดูแลระบบ');
      }

      if (userAccount.password_hash) {
        if (!comparePassword(loginPassword, userAccount.password_hash)) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }
      } else {
        if (loginPassword !== userAccount.password) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }
      }

      // Sync to Firebase Auth
      const loginEmail = userAccount.email || (userAccount.username + '@okey.com').toLowerCase();
      try {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          // Create user in Firebase Auth transparently
          const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        } else {
          throw authError;
        }
      }

      onLoginSuccess(userAccount, rememberMe);
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsSubmitting(false);
    }
  };

  `;

content = content.substring(0, loginFnStart) + newLoginFn + content.substring(formRenderStart);

fs.writeFileSync('src/components/LoginView.tsx', content);
