import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  UserCheck, 
  User, 
  Mail, 
  Award, 
  PenTool, 
  Eraser, 
  Key, 
  Upload, 
  Info, 
  UserPlus, 
  Shuffle, 
  Check, 
  X, 
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { UserProfile, Department } from '../types';
import { getDbUsers, saveDbUsers, getDbDepartments, hashPassword, validateThaiNationalID, calculateAge, addEnterpriseAuditLog } from '../data/db';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Database state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // -----------------------------------------
  // 1. LOGIN STATE
  // -----------------------------------------
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // -----------------------------------------
  // 2. FORCE PASSWORD CHANGE STATE
  // -----------------------------------------
  const [forceChangeUser, setForceChangeUser] = useState<UserProfile | null>(null);
  const [newForcedPassword, setNewForcedPassword] = useState('');
  const [confirmForcedPassword, setConfirmForcedPassword] = useState('');

  // -----------------------------------------
  // 3. REGISTRATION (ONBOARD) STATE
  // -----------------------------------------
  const [regTitle, setRegTitle] = useState('นาย');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regIdCard, setRegIdCard] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regGender, setRegGender] = useState('male');
  const [regAddress, setRegAddress] = useState('');
  const [regProvince, setRegProvince] = useState('กรุงเทพมหานคร');
  const [regElectricityRegion, setRegElectricityRegion] = useState('สำนักงานใหญ่ (กฟผ.)');
  const [regStartDate, setRegStartDate] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regPosition, setRegPosition] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regProfilePic, setRegProfilePic] = useState<string>('');
  const [usernameStatus, setUsernameStatus] = useState<'empty' | 'available' | 'taken' | 'invalid_format'>('empty');

  // Signature Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string>('');
  const [signaturePoints, setSignaturePoints] = useState<any[]>([]);

  // -----------------------------------------
  // 4. FORGOT PASSWORD STATE
  // -----------------------------------------
  const [forgotMethod, setForgotMethod] = useState<'sms' | 'email' | 'admin'>('sms');
  // SMS Reset State
  const [resetPhone, setResetPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [enteredSmsCode, setEnteredSmsCode] = useState('');
  const [smsNewPassword, setSmsNewPassword] = useState('');
  
  // Email Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailResetToken, setEmailResetToken] = useState('');
  const [emailNewPassword, setEmailNewPassword] = useState('');

  // Admin Request Reset State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminRequestSuccess, setAdminRequestSuccess] = useState(false);

  // -----------------------------------------
  // INITIAL LOAD
  // -----------------------------------------
  const loadAuthData = () => {
    const dbUsers = getDbUsers();
    setUsers(dbUsers);
    const dbDepts = getDbDepartments();
    setDepartments(dbDepts);
    if (dbDepts.length > 0) {
      setRegDepartment(dbDepts[0].department_name);
    }
  };

  useEffect(() => {
    loadAuthData();
  }, []);

  // Live validate username uniqueness and pattern for registration
  useEffect(() => {
    if (!regUsername) {
      setUsernameStatus('empty');
      return;
    }
    const pattern = /^Okay\d+$/;
    if (!pattern.test(regUsername)) {
      setUsernameStatus('invalid_format');
      return;
    }

    const isDuplicate = users.some(u => u.username?.toLowerCase() === regUsername.toLowerCase());
    if (isDuplicate) {
      setUsernameStatus('taken');
    } else {
      setUsernameStatus('available');
    }
  }, [regUsername, users]);

  // Handle auto-suggest next username OkayXXXX
  const suggestNextUsername = () => {
    const pattern = /^Okay(\d+)$/;
    let maxNum = 0;
    users.forEach(u => {
      const match = u.username?.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNumString = String(maxNum + 1).padStart(4, '0');
    setRegUsername(`Okay${nextNumString}`);
  };

  // Profile Picture Upload Handler
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Signature Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#2563eb'; // blue-600
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);

    const point = { x, y, t: Date.now(), type: 'start' };
    setSignaturePoints(prev => [...prev, point]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    const point = { x, y, t: Date.now(), type: 'move' };
    setSignaturePoints(prev => [...prev, point]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureImage(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureImage('');
    setSignaturePoints([]);
  };

  // -----------------------------------------
  // SUBMIT HANDLERS
  // -----------------------------------------

  // A. LOGIN SUBMIT
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!loginPhone.trim()) {
      errors.loginPhone = 'กรุณากรอก Username, อีเมล หรือเบอร์โทรศัพท์';
    }
    if (!loginPassword) {
      errors.loginPassword = 'กรุณากรอกรหัสผ่าน';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMsg('กรุณากรอกข้อมูลบัญชีและรหัสผ่านให้ครบถ้วน');
      const keyToId: Record<string, string> = {
        loginPhone: 'login-phone',
        loginPassword: 'login-password'
      };
      const firstId = keyToId[Object.keys(errors)[0]];
      if (firstId) {
        document.getElementById(firstId)?.focus();
      }
      return;
    }

    const identifier = loginPhone.trim().toLowerCase();
    const matchedUser = users.find(u => {
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uPhoneClean = (u.phone || '').replace(/[-\s]/g, '');
      const cleanInput = identifier.replace(/[-\s]/g, '');
      
      const isUsernameMatch = uUsername === identifier;
      const isEmailMatch = uEmail === identifier;
      const isPhoneMatch = uPhoneClean && cleanInput && uPhoneClean === cleanInput;
      
      const hashedEntered = hashPassword(loginPassword);
      const isPasswordMatch = u.password === loginPassword || u.password === hashedEntered;
      
      return (isUsernameMatch || isEmailMatch || isPhoneMatch) && isPasswordMatch;
    });

    if (!matchedUser) {
      addEnterpriseAuditLog(
        'System_Guest',
        'Guest User',
        'None',
        'Auth_Fail',
        `ความพยายามลงชื่อเข้าใช้ล้มเหลวสำหรับบัญชี: ${loginPhone}`
      );
      setErrorMsg('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง (ตรวจสอบ Username / อีเมล / เบอร์โทรศัพท์ และรหัสผ่าน)');
      return;
    }

    if (!matchedUser.is_active) {
      addEnterpriseAuditLog(
        matchedUser.user_id,
        matchedUser.name,
        matchedUser.approval_level,
        'Auth_Suspended',
        `ความพยายามเข้าใช้บัญชีที่ถูกระงับ: ${matchedUser.username}`
      );
      setErrorMsg('บัญชีนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อแอดมิน');
      return;
    }

    // Check if password change is forced
    if (matchedUser.force_password_change) {
      setForceChangeUser(matchedUser);
      setSuccessMsg('โปรดทำการเปลี่ยนรหัสผ่านเพื่อความปลอดภัยในการเริ่มเข้าสู่ระบบครั้งแรก');
      return;
    }

    addEnterpriseAuditLog(
      matchedUser.user_id,
      matchedUser.name,
      matchedUser.approval_level,
      'Auth_Login',
      'ผู้ใช้งานลงชื่อเข้าสู่ระบบ ERP สำเร็จ'
    );

    setSuccessMsg(`ยินดีต้อนรับกลับมา, คุณ${matchedUser.name}!`);
    setTimeout(() => {
      onLoginSuccess(matchedUser);
    }, 1000);
  };

  // B. FORCED PASSWORD CHANGE SUBMIT
  const handleForcedPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newForcedPassword || !confirmForcedPassword) {
      setErrorMsg('กรุณากรอกรหัสผ่านใหม่ให้ครบถ้วน');
      return;
    }

    if (newForcedPassword !== confirmForcedPassword) {
      setErrorMsg('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    if (newForcedPassword.length < 6) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (!forceChangeUser) return;

    // Securely hash and update
    const updatedUsers = users.map(u => {
      if (u.user_id === forceChangeUser.user_id) {
        return {
          ...u,
          password: hashPassword(newForcedPassword),
          force_password_change: false
        };
      }
      return u;
    });

    saveDbUsers(updatedUsers);
    setSuccessMsg('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย! กำลังนำคุณเข้าสู่ระบบ...');

    const fullyUpdatedUser = updatedUsers.find(u => u.user_id === forceChangeUser.user_id)!;
    setTimeout(() => {
      setForceChangeUser(null);
      onLoginSuccess(fullyUpdatedUser);
    }, 1200);
  };

  // C. SHORTCUT LOGIN FOR TESTING
  const handleShortcutLogin = (user: UserProfile) => {
    setLoginPhone(user.phone || '');
    setLoginPassword('password123'); // Default plain-text representation
    setSuccessMsg(`ยินดีต้อนรับกลับมา, คุณ${user.name}!`);
    setTimeout(() => {
      onLoginSuccess(user);
    }, 1000);
  };

  // D. REGISTRATION SUBMIT (Onboarding)
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setFormErrors({});

    const errors: Record<string, string> = {};

    if (!regFirstName.trim()) {
      errors.regFirstName = 'กรุณากรอกชื่อจริง';
    }
    if (!regLastName.trim()) {
      errors.regLastName = 'กรุณากรอกนามสกุล';
    }
    if (!regUsername.trim()) {
      errors.regUsername = 'กรุณากรอกรหัสพนักงาน (Username)';
    } else if (usernameStatus === 'taken') {
      errors.regUsername = 'รหัสพนักงานนี้ถูกใช้งานแล้วในระบบ';
    } else if (usernameStatus === 'invalid_format') {
      errors.regUsername = 'รหัสพนักงานต้องเป็นรูปแบบ Okay และตามด้วยรหัส เช่น Okay0001';
    }
    if (!regPhone.trim()) {
      errors.regPhone = 'กรุณากรอกเบอร์โทรศัพท์';
    }
    if (!regPosition.trim()) {
      errors.regPosition = 'กรุณากรอกตำแหน่งงาน';
    }
    if (!regPassword || regPassword.length < 6) {
      errors.regPassword = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    }

    // Extended validations
    const cleanIdCard = regIdCard.replace(/\D/g, '');
    if (!cleanIdCard) {
      errors.regIdCard = 'กรุณากรอกเลขบัตรประจำตัวประชาชน 13 หลัก';
    } else if (!validateThaiNationalID(cleanIdCard)) {
      errors.regIdCard = 'เลขบัตรประจำตัวประชาชนไม่ถูกต้องตามหลักการคำนวณ Check Digit (ตรวจสอบเลขบัตรอีกครั้ง)';
    } else {
      const isIdCardTaken = users.some(u => (u.idCard || '').replace(/\D/g, '') === cleanIdCard);
      if (isIdCardTaken) {
        errors.regIdCard = 'เลขบัตรประจำตัวประชาชนนี้ได้รับการลงทะเบียนแล้วในระบบ';
      }
    }

    if (!regBirthDate) {
      errors.regBirthDate = 'กรุณาเลือกวันเดือนปีเกิด';
    }

    if (!regStartDate) {
      errors.regStartDate = 'กรุณาเลือกวันเริ่มงาน';
    }

    if (!signatureImage) {
      errors.signature = 'กรุณาเซ็นชื่อลายมือชื่อดิจิทัล';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMsg('กรุณากรอกข้อมูลและวาดลายมือชื่อให้ครบถ้วนและถูกต้อง');
      const keyToId: Record<string, string> = {
        regFirstName: 'reg-firstName',
        regLastName: 'reg-lastName',
        regUsername: 'reg-username',
        regPhone: 'reg-phone',
        regPosition: 'reg-position',
        regPassword: 'reg-password',
        regIdCard: 'reg-idcard',
        regBirthDate: 'reg-birthdate',
        regStartDate: 'reg-startdate',
        signature: 'reg-signature'
      };
      const firstId = keyToId[Object.keys(errors)[0]];
      if (firstId) {
        const element = document.getElementById(firstId);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    const newUserId = `user-${Date.now()}`;
    const metadataObj = {
      device: navigator.userAgent,
      timestamp: new Date().toISOString(),
      platform: navigator.platform
    };

    const newUser: UserProfile = {
      user_id: newUserId,
      username: regUsername,
      name: `${regTitle}${regFirstName} ${regLastName}`,
      email: regEmail || `${regUsername.toLowerCase()}@okey.com`,
      phone: regPhone,
      password: hashPassword(regPassword), // HASH SECURELY
      department: regDepartment,
      position: regPosition,
      is_active: true,
      approval_level: 'Level 1', // Automatic Role assignment to Employee (Level 1)
      signatureUrl: signatureImage,
      signature_vector: JSON.stringify(signaturePoints),
      signature_metadata: JSON.stringify(metadataObj),
      profilePictureUrl: regProfilePic || undefined,

      // Extended Profile Attributes
      title: regTitle,
      nickname: regNickname,
      idCard: cleanIdCard,
      birthDate: regBirthDate,
      age: calculateAge(regBirthDate),
      gender: regGender,
      address: regAddress,
      province: regProvince,
      electricityRegion: regElectricityRegion,
      startDate: regStartDate,
      employmentStatus: 'active',
      role: 'Employee'
    };

    const updatedUsers = [...users, newUser];
    saveDbUsers(updatedUsers);

    // Write enterprise audit log
    addEnterpriseAuditLog(
      newUserId,
      newUser.name,
      newUser.approval_level,
      'User_Create',
      `พนักงานลงทะเบียนบัญชีใหม่สำเร็จ สังกัดแผนก ${newUser.department}`
    );

    // Auto-create workflow approval rule to prevent being stranded
    const currentRules = JSON.parse(localStorage.getItem('okey_db_rules') || '[]');
    currentRules.push({
      rule_id: `rule-auto-${Date.now()}`,
      requester_user_id: newUserId,
      approver_user_id: 'user-admin', // Default flow to Admin
      level: 1,
      next_approver_id: null
    });
    localStorage.setItem('okey_db_rules', JSON.stringify(currentRules));

    setSuccessMsg(`ลงทะเบียนพนักงานเสร็จสิ้น! รหัสพนักงานของคุณคือ: ${regUsername} บทบาท: Employee (พนักงานทั่วไป)`);
    
    // Clear registration fields
    setRegFirstName('');
    setRegLastName('');
    setRegUsername('');
    setRegPosition('');
    setRegPhone('');
    setRegEmail('');
    setRegPassword('');
    setRegProfilePic('');
    setRegNickname('');
    setRegIdCard('');
    setRegBirthDate('');
    setRegAddress('');
    setRegStartDate('');
    setSignatureImage('');
    setSignaturePoints([]);
    clearCanvas();

    // Re-sync database and switch back to login mode
    setTimeout(() => {
      loadAuthData();
      setMode('login');
      setLoginPhone(newUser.phone || '');
    }, 1500);
  };

  // E. FORGOT PASSWORD SUITE SUBMITS
  // SMS Reset Trigger
  const triggerSmsReset = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!resetPhone) {
      setErrorMsg('กรุณากรอกเบอร์โทรศัพท์เคลื่อนที่');
      return;
    }
    const user = users.find(u => u.phone?.replace(/[-\s]/g, '') === resetPhone.replace(/[-\s]/g, ''));
    if (!user) {
      setErrorMsg('ไม่พบเบอร์โทรศัพท์นี้ในฐานข้อมูลพนักงาน');
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSmsCode(code);
    setSmsSent(true);
    setSuccessMsg(`[SMS Simulator] ส่งรหัส OTP เรียบร้อย! สำหรับทดสอบให้พิมพ์รหัส: ${code}`);
  };

  const handleSmsResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (enteredSmsCode !== smsCode) {
      setErrorMsg('รหัส OTP ไม่ถูกต้อง กรุณากรอกรหัสตามกล่องแจ้งเตือน');
      return;
    }

    if (smsNewPassword.length < 6) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    const updated = users.map(u => {
      if (u.phone?.replace(/[-\s]/g, '') === resetPhone.replace(/[-\s]/g, '')) {
        return {
          ...u,
          password: hashPassword(smsNewPassword)
        };
      }
      return u;
    });

    saveDbUsers(updated);
    setSuccessMsg('รีเซ็ตรหัสผ่านของคุณผ่าน SMS เรียบร้อย! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
    setTimeout(() => {
      setMode('login');
      setLoginPhone(resetPhone);
      setLoginPassword('');
      setResetPhone('');
      setSmsSent(false);
      setSmsCode('');
      setEnteredSmsCode('');
    }, 1500);
  };

  // Email Reset Trigger
  const triggerEmailReset = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!resetEmail) {
      setErrorMsg('กรุณากรอกอีเมลของพนักงาน');
      return;
    }
    const user = users.find(u => u.email?.toLowerCase().trim() === resetEmail.toLowerCase().trim());
    if (!user) {
      setErrorMsg('ไม่พบที่อยู่อีเมลนี้ในฐานข้อมูลระบบ');
      return;
    }
    const token = 'token_' + Math.random().toString(36).substr(2, 8);
    setEmailResetToken(token);
    setEmailSent(true);
    setSuccessMsg(`[Email Simulator] ส่งอีเมลลิงก์กู้คืนเรียบร้อย! ลิงก์กู้คืนจำลอง: http://okey.com/reset?token=${token}`);
  };

  const handleEmailResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (emailNewPassword.length < 6) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    const updated = users.map(u => {
      if (u.email?.toLowerCase().trim() === resetEmail.toLowerCase().trim()) {
        return { ...u, password: hashPassword(emailNewPassword) };
      }
      return u;
    });

    saveDbUsers(updated);
    setSuccessMsg('รีเซ็ตรหัสผ่านจากลิงก์อีเมลสำเร็จแล้ว! กรุณาเข้าสู่ระบบด้วยรหัสใหม่');
    setTimeout(() => {
      setMode('login');
      setEmailSent(false);
      setResetEmail('');
      setResetEmail('');
    }, 1500);
  };

  // Admin Request Reset Trigger
  const triggerAdminReset = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!adminUsername) {
      setErrorMsg('กรุณาเลือกหรือระบุรหัสพนักงาน OkayXXXX');
      return;
    }

    const user = users.find(u => u.username?.toLowerCase().trim() === adminUsername.toLowerCase().trim());
    if (!user) {
      setErrorMsg('ไม่พบรหัสพนักงาน OkayXXXX นี้ในระบบ');
      return;
    }

    // Force password change & Set temporary password
    const updated = users.map(u => {
      if (u.username?.toLowerCase().trim() === adminUsername.toLowerCase().trim()) {
        return {
          ...u,
          password: hashPassword('OkayTemp123!'),
          force_password_change: true
        };
      }
      return u;
    });

    saveDbUsers(updated);
    setAdminRequestSuccess(true);
    setSuccessMsg(`✓ ส่งคำขอเรียบร้อย! แอดมินทำการรีเซ็ตรหัสผ่านเป็นรหัสผ่านเริ่มต้น: "OkayTemp123!" และเปิดโหมด Force Change เมื่อเข้าสู่ระบบครั้งแรก`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 text-white p-4 font-sans" id="auth-root">
      
      {/* Auth Container Panel */}
      <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-500/20 text-white font-black text-lg tracking-wider">
            O-KEY
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-3">ระบบเบิกเงินองค์กรอัจฉริยะ</h2>
          <p className="text-xs text-slate-400 font-medium">OKEY Expense Management Enterprise Suite 2026</p>
        </div>

        {/* Mode Selector Tabs (Before logging in, users can switch easily) */}
        {!forceChangeUser && (
          <div className="grid grid-cols-3 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2 rounded-lg transition-all ${mode === 'login' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2 rounded-lg transition-all ${mode === 'register' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              สมัครพนักงานใหม่
            </button>
            <button
              onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`py-2 rounded-lg transition-all ${mode === 'forgot' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              ลืมรหัสผ่าน
            </button>
          </div>
        )}

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-950/30 text-rose-400 rounded-xl border border-rose-900/40 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/30 text-emerald-400 rounded-xl border border-emerald-900/40 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold">{successMsg}</p>
          </div>
        )}

        {/* -----------------------------------------
            A. FORCED PASSWORD CHANGE FLOW
            ----------------------------------------- */}
        {forceChangeUser ? (
          <div className="space-y-4">
            <div className="bg-primary-950/20 border border-primary-900/40 p-4 rounded-2xl text-xs space-y-2">
              <span className="font-extrabold text-primary-400 block flex items-center gap-1">
                <Sparkles className="h-4 w-4" /> แอดมินบังคับให้เปลี่ยนรหัสผ่านเพื่อความปลอดภัย
              </span>
              <p className="text-slate-300">
                เนื่องจากเป็นการเข้าใช้งานบัญชีครั้งแรก หรือได้รับการกู้คืนรหัสผ่านจากผู้ดูแลระบบ กรุณากำหนดรหัสผ่านส่วนตัวใหม่ที่คาดเดาได้ยากเพื่อผูกบัญชีถาวร
              </p>
            </div>

            <form onSubmit={handleForcedPasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="ป้อนรหัสผ่านใหม่"
                    value={newForcedPassword}
                    onChange={e => setNewForcedPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-950/80 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-white font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block">ยืนยันรหัสผ่านใหม่</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                    value={confirmForcedPassword}
                    onChange={e => setConfirmForcedPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-950/80 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-white font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForceChangeUser(null);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black font-extrabold rounded-xl text-xs transition-all shadow-md shadow-green-500/20"
                >
                  บันทึกรหัสใหม่และเข้าสู่ระบบ
                </button>
              </div>
            </form>
          </div>
        ) : mode === 'login' ? (
          
          /* -----------------------------------------
              B. MAIN LOGIN VIEW
             ----------------------------------------- */
          <div className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block">Username (รหัสพนักงาน) / อีเมล / เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    required
                    id="login-phone"
                    placeholder="เช่น Okay0001, somsri@okey.com หรือ 08x-xxx-xxxx"
                    value={loginPhone || ''}
                    onChange={e => setLoginPhone(e.target.value)}
                    className={`w-full pl-10 pr-3 py-2.5 text-xs bg-slate-950/50 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-slate-600 font-medium ${
                      formErrors.loginPhone ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                    }`}
                  />
                </div>
                {formErrors.loginPhone && (
                  <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.loginPhone}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block">รหัสผ่าน (Password) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    id="login-password"
                    placeholder="••••••••"
                    value={loginPassword || ''}
                    onChange={e => setLoginPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2.5 text-xs bg-slate-950/50 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-slate-600 font-medium ${
                      formErrors.loginPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 dark:text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.loginPassword && (
                  <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.loginPassword}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 mt-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>เข้าสู่ระบบรักษาความปลอดภัย</span>
              </button>
            </form>

            {/* Quick Simulators switching block for testers */}
            <div className="border-t border-slate-800/80 pt-5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                <UserCheck size={14} className="text-amber-500" />
                <span>ทางลัดสวมบทบาทสลับหน้าจอ (Quick Simulators):</span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {users.slice(0, 4).map(u => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => handleShortcutLogin(u)}
                    className="p-2 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-[11px] flex justify-between items-center group text-left"
                  >
                    <div>
                      <span className="font-bold text-slate-300 block group-hover:text-white transition-colors">{u.name}</span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold block">{u.position} • {u.department}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-primary-500 font-bold block">{u.phone}</span>
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">{u.approval_level || 'Staff'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : mode === 'register' ? (
          
          /* -----------------------------------------
              C. REGISTRATION (ONBOARD) VIEW
             ----------------------------------------- */
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            
            {/* Header info badge */}
            <div className="bg-primary-950/10 border border-primary-900/20 p-3 rounded-xl flex items-start gap-2.5">
              <Info className="h-4.5 w-4.5 text-primary-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-300 leading-relaxed">
                การสมัครบัญชีเริ่มต้น ระบบจะกำหนดสิทธิ์และเส้นทางอนุมัติเป็น <strong className="text-primary-400">Employee (พนักงานทั่วไป)</strong> ให้โดยอัตโนมัติ 
                สิทธิ์ระดับผู้อนุมัติหรือสายการอนุมัติจะถูกบริหารแยกส่วนโดยแอดมินระบบหลักผ่านเมนู User Management ภายหลัง
              </p>
            </div>

            {/* Profile image picker & Preview */}
            <div className="flex items-center gap-4 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
              <div className="relative shrink-0">
                <div className="h-14 w-14 rounded-full bg-slate-800 border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center">
                  {regProfilePic ? (
                    <img src={regProfilePic} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                  )}
                </div>
                <label className="absolute -bottom-1.5 -right-1.5 bg-primary-600 hover:bg-primary-700 rounded-full h-6 w-6 flex items-center justify-center cursor-pointer border border-slate-900 shadow">
                  <Upload className="h-3 w-3 text-white" />
                  <input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
                </label>
              </div>
              <div>
                <span className="font-bold text-slate-300 block">อัปโหลดรูปโปรไฟล์พนักงาน</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400">รองรับไฟล์ภาพเพื่อยืนยันตัวตนในระบบเบิกจ่าย</span>
              </div>
            </div>

            {/* Title / First Name / Last Name / Nickname */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1 col-span-1">
                <label className="font-bold text-slate-400 block text-xs">คำนำหน้า <span className="text-rose-500">*</span></label>
                <select
                  value={regTitle}
                  onChange={e => setRegTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white text-xs"
                >
                  <option value="นาย">นาย (Mr.)</option>
                  <option value="นาง">นาง (Mrs.)</option>
                  <option value="นางสาว">นางสาว (Miss)</option>
                </select>
              </div>
              <div className="space-y-1 col-span-3">
                <label className="font-bold text-slate-400 block text-xs">ชื่อจริง <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  id="reg-firstName"
                  placeholder="เช่น สมชาย"
                  value={regFirstName || ''}
                  onChange={e => setRegFirstName(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white placeholder-slate-700 text-xs focus:ring-1 focus:ring-primary-500 ${
                    formErrors.regFirstName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                  }`}
                />
                {formErrors.regFirstName && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regFirstName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">นามสกุล <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  id="reg-lastName"
                  placeholder="เช่น รักชาติ"
                  value={regLastName || ''}
                  onChange={e => setRegLastName(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white placeholder-slate-700 text-xs focus:ring-1 focus:ring-primary-500 ${
                    formErrors.regLastName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                  }`}
                />
                {formErrors.regLastName && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regLastName}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">ชื่อเล่น <span className="text-slate-500 dark:text-slate-400">(ถ้ามี)</span></label>
                <input
                  type="text"
                  placeholder="เช่น ต้น"
                  value={regNickname || ''}
                  onChange={e => setRegNickname(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white placeholder-slate-700 text-xs focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* National ID, Birthdate & Gender */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">เลขบัตรประจำตัวประชาชน 13 หลัก <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  id="reg-idcard"
                  maxLength={13}
                  placeholder="เลขบัตรประชาชน 13 หลัก"
                  value={regIdCard || ''}
                  onChange={e => setRegIdCard(e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white font-mono text-xs focus:ring-1 focus:ring-primary-500 ${
                    formErrors.regIdCard ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                  }`}
                />
                {formErrors.regIdCard && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regIdCard}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">วันเดือนปีเกิด <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  id="reg-birthdate"
                  value={regBirthDate || ''}
                  onChange={e => setRegBirthDate(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white text-xs focus:ring-1 focus:ring-primary-500 ${
                    formErrors.regBirthDate ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                  }`}
                />
                {formErrors.regBirthDate && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regBirthDate}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">เพศ <span className="text-rose-500">*</span></label>
                <select
                  value={regGender}
                  onChange={e => setRegGender(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white text-xs"
                >
                  <option value="male">ชาย (Male)</option>
                  <option value="female">หญิง (Female)</option>
                </select>
              </div>
            </div>

            {/* Address & Province */}
            <div className="space-y-1">
              <label className="font-bold text-slate-400 block text-xs">ที่อยู่ปัจจุบันสำหรับการส่งเอกสาร <span className="text-slate-500 dark:text-slate-400">(ถ้ามี)</span></label>
              <textarea
                rows={2}
                placeholder="เช่น บ้านเลขที่ 12/3 ถนนสุขุมวิท..."
                value={regAddress || ''}
                onChange={e => setRegAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white placeholder-slate-700 text-xs focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">จังหวัดที่พำนัก <span className="text-rose-500">*</span></label>
                <select
                  value={regProvince}
                  onChange={e => setRegProvince(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white text-xs"
                >
                  {['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'นครปฐม', 'สมุทรสาคร', 'เชียงใหม่', 'ขอนแก่น', 'ชลบุรี', 'นครราชสีมา', 'ภูเก็ต', 'สงขลา', 'ระยอง', 'ประจวบคีรีขันธ์'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">เขตการไฟฟ้าที่รับผิดชอบ <span className="text-rose-500">*</span></label>
                <select
                  value={regElectricityRegion}
                  onChange={e => setRegElectricityRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white text-xs"
                >
                  <option value="สำนักงานใหญ่ (กฟผ.)">สำนักงานใหญ่ (กฟผ.)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคเหนือ)">การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคเหนือ)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคเหนือ)">การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคเหนือ)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคเหนือ)">การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคเหนือ)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคกลาง)">การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคกลาง)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคกลาง)">การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคกลาง)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคกลาง)">การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคกลาง)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคตะวันออกเฉียงเหนือ)">การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคตะวันออกเฉียงเหนือ)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคตะวันออกเฉียงเหนือ)">การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคตะวันออกเฉียงเหนือ)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคตะวันออกเฉียงเหนือ)">การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคตะวันออกเฉียงเหนือ)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคใต้)">การไฟฟ้าส่วนภูมิภาค เขต 1 (ภาคใต้)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคใต้)">การไฟฟ้าส่วนภูมิภาค เขต 2 (ภาคใต้)</option>
                  <option value="การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคใต้)">การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคใต้)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-400 block text-xs">วันที่เริ่มทำงาน (Start Date) <span className="text-rose-500">*</span></label>
              <input
                type="date"
                required
                id="reg-startdate"
                value={regStartDate || ''}
                onChange={e => setRegStartDate(e.target.value)}
                className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white text-xs focus:ring-1 focus:ring-primary-500 ${
                  formErrors.regStartDate ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                }`}
              />
              {formErrors.regStartDate && (
                <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regStartDate}</p>
              )}
            </div>

            {/* Username / Employee ID OkayXXXX pattern */}
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-400 text-xs">รหัสพนักงาน ERP (Username) <span className="text-rose-500">*</span></label>
                {usernameStatus === 'available' && (
                  <span className="text-[9px] text-emerald-500 font-extrabold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/50">✓ รหัสไม่ซ้ำ</span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-[9px] text-rose-500 font-extrabold bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/50">✗ รหัสซ้ำ</span>
                )}
                {usernameStatus === 'invalid_format' && (
                  <span className="text-[9px] text-amber-500 font-extrabold bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/50">⚠ รูปแบบ: OkayXXXX</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  id="reg-username"
                  placeholder="เช่น Okay0011"
                  value={regUsername || ''}
                  onChange={e => setRegUsername(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white font-mono placeholder-slate-700 font-semibold text-xs focus:ring-1 focus:ring-primary-500 ${
                    formErrors.regUsername ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={suggestNextUsername}
                  className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold flex items-center gap-1 shrink-0 text-xs"
                >
                  <Shuffle className="h-3 w-3" />
                  <span>สุ่มรหัส</span>
                </button>
              </div>
              {formErrors.regUsername && (
                <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regUsername}</p>
              )}
            </div>

            {/* Department & Position */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">แผนกงาน <span className="text-rose-500">*</span></label>
                <select
                  value={regDepartment || ''}
                  onChange={e => setRegDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white text-xs"
                >
                  {departments.map(d => (
                    <option key={d.department_id} value={d.department_name}>{d.department_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">ตำแหน่งงาน <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  id="reg-position"
                  placeholder="เช่น Developer, Specialist"
                  value={regPosition || ''}
                  onChange={e => setRegPosition(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white placeholder-slate-700 text-xs focus:ring-1 focus:ring-primary-500 ${
                    formErrors.regPosition ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                  }`}
                />
                {formErrors.regPosition && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regPosition}</p>
                )}
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  id="reg-phone"
                  placeholder="08x-xxx-xxxx"
                  value={regPhone || ''}
                  onChange={e => setRegPhone(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white placeholder-slate-700 text-xs focus:ring-1 focus:ring-primary-500 ${
                    formErrors.regPhone ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                  }`}
                />
                {formErrors.regPhone && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regPhone}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 block text-xs">อีเมลติดต่อ <span className="text-slate-500 dark:text-slate-400">(ถ้ามี)</span></label>
                <input
                  type="email"
                  placeholder="employee@okey.com"
                  value={regEmail || ''}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white placeholder-slate-700 text-xs focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="font-bold text-slate-400 block text-xs">รหัสผ่านสำหรับเข้าใช้ระบบ <span className="text-rose-500">*</span></label>
              <input
                type="password"
                required
                id="reg-password"
                placeholder="ป้อนรหัสผ่านความยาวอย่างน้อย 6 ตัว"
                value={regPassword || ''}
                onChange={e => setRegPassword(e.target.value)}
                className={`w-full px-3 py-2 bg-slate-950 rounded-lg border text-white placeholder-slate-700 text-xs focus:ring-1 focus:ring-primary-500 ${
                  formErrors.regPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-800'
                }`}
              />
              {formErrors.regPassword && (
                <p className="text-rose-500 text-[10px] font-bold mt-1">⚠️ {formErrors.regPassword}</p>
              )}
            </div>

            {/* Signature Drawing Board Canvas (Required!) */}
            <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 block flex items-center gap-1">
                  <PenTool className="h-3.5 w-3.5 text-primary-500" />
                  วาดลายมือชื่อดิจิทัล (Master Digital Signature)
                </span>
                {signatureImage && (
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                  >
                    <Eraser className="h-3 w-3" />
                    <span>ล้างกระดาน</span>
                  </button>
                )}
              </div>

              <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[110px] flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[110px] cursor-crosshair touch-none"
                />
                {!signatureImage && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 p-2 text-center">
                    <PenTool className="h-5 w-5 text-slate-700 dark:text-slate-200 mb-1 animate-pulse" />
                    <span className="text-[10px] font-bold">ใช้นิ้วหรือเมาส์จรดลายเซ็นของคุณภายในกรอบนี้</span>
                    <span className="text-[8px] text-slate-600 dark:text-slate-300 mt-0.5">ระบบจะจัดเก็บลายเซ็นนี้ลงใบสำคัญจ่ายทุกใบอย่างเป็นทางการ</span>
                  </div>
                )}
              </div>

              {signatureImage && (
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                  <span className="text-[9px] text-emerald-500 font-extrabold flex items-center gap-1">✓ บันทึกเวกเตอร์พิกัด {signaturePoints.length} จุดสำเร็จ</span>
                  <div className="h-8 bg-slate-950 border border-slate-800 px-2 rounded-md flex items-center">
                    <img src={signatureImage} alt="Preview" className="h-6 object-contain" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl font-extrabold transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>ยืนยันข้อมูลและสมัคร</span>
              </button>
            </div>

          </form>
        ) : (
          
          /* -----------------------------------------
              D. FORGOT PASSWORD VIEW
             ----------------------------------------- */
          <div className="space-y-4 text-xs">
            
            {/* Reset Sub-tabs */}
            <div className="grid grid-cols-3 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
              <button
                onClick={() => { setForgotMethod('sms'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-1.5 rounded-lg transition-all ${forgotMethod === 'sms' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                OTP ผ่าน SMS
              </button>
              <button
                onClick={() => { setForgotMethod('email'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-1.5 rounded-lg transition-all ${forgotMethod === 'email' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                กู้คืนผ่าน Email
              </button>
              <button
                onClick={() => { setForgotMethod('admin'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-1.5 rounded-lg transition-all ${forgotMethod === 'admin' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                แจ้งแอดมินโดยตรง
              </button>
            </div>

            {/* METHOD 1: SMS RESET */}
            {forgotMethod === 'sms' && (
              <form onSubmit={handleSmsResetSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 block">ป้อนเบอร์โทรศัพท์มือถือที่ผูกกับบัญชี</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      disabled={smsSent}
                      placeholder="เช่น 081-111-1111"
                      value={resetPhone}
                      onChange={e => setResetPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={triggerSmsReset}
                      className="px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg font-extrabold shrink-0 transition-all shadow-md shadow-green-500/20"
                    >
                      {smsSent ? 'ส่งอีกครั้ง' : 'รับ OTP'}
                    </button>
                  </div>
                </div>

                {smsSent && (
                  <div className="space-y-3 border-t border-slate-800/80 pt-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">กรอกรหัส OTP 6 หลัก</label>
                      <input
                        type="text"
                        required
                        placeholder="กรอกรหัส 6 หลักที่แสดงด้านบน"
                        value={enteredSmsCode}
                        onChange={e => setEnteredSmsCode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white font-mono text-center font-bold tracking-widest text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">กำหนดรหัสผ่านใหม่</label>
                      <input
                        type="password"
                        required
                        placeholder="ระบุรหัสผ่านใหม่ความยาวอย่างน้อย 6 ตัว"
                        value={smsNewPassword}
                        onChange={e => setSmsNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white placeholder-slate-800"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg font-extrabold shadow-md shadow-green-500/20 transition-all"
                    >
                      ยืนยันตั้งค่ารหัสผ่านใหม่
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* METHOD 2: EMAIL RESET */}
            {forgotMethod === 'email' && (
              <form onSubmit={handleEmailResetSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 block">ป้อนอีเมลพนักงานที่ต้องการกู้คืน</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="employee@okey.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white"
                    />
                    <button
                      type="button"
                      onClick={triggerEmailReset}
                      className="px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg font-extrabold shrink-0 transition-all shadow-md shadow-green-500/20"
                    >
                      {emailSent ? 'ส่งใหม่' : 'ส่งลิงก์'}
                    </button>
                  </div>
                </div>

                {emailSent && (
                  <div className="space-y-3 border-t border-slate-800/80 pt-3">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60 font-mono text-[9px] text-primary-400">
                      <strong>Simulator Recovery-Link:</strong> Click Link to Reset
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">ป้อนรหัสผ่านใหม่โดยตรงที่นี่</label>
                      <input
                        type="password"
                        required
                        placeholder="ป้อนรหัสผ่านส่วนตัวใหม่"
                        value={emailNewPassword}
                        onChange={e => setEmailNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg font-extrabold shadow-md shadow-green-500/20 transition-all"
                    >
                      รีเซ็ตรหัสผ่านพนักงาน
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* METHOD 3: ADMIN REQUEST RESET */}
            {forgotMethod === 'admin' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 block">เลือกรหัสพนักงาน OkayXXXX หรือพิมพ์เพื่อส่งคำขอ</label>
                  <div className="flex gap-2">
                    <select
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-white font-mono"
                    >
                      <option value="">-- เลือกพนักงาน --</option>
                      {users.map(u => (
                        <option key={u.user_id} value={u.username}>
                          {u.username} • {u.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={triggerAdminReset}
                      className="px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-lg font-extrabold shrink-0 transition-all shadow-md shadow-green-500/20"
                    >
                      ส่งคำขอรีเซ็ต
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                  <span className="font-bold text-rose-400 block mb-1">การล้างรหัสโดยแอดมินองค์กร:</span>
                  แอดมินองค์กรจะทำการรีเซ็ตรหัสผ่านกลับไปเป็นค่าเริ่มต้นและเปิดโหมดบังคับเปลี่ยนรหัสผ่านทันทีในการเข้าใช้งานครั้งแรกเพื่อป้องกันความปลอดภัยของเอกสารบัญชี
                </div>
              </div>
            )}

            <button
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold mt-2.5 flex items-center justify-center gap-1 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>กลับสู่หน้าหลัก</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
