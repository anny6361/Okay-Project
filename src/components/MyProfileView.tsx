import React, { useState, useRef, useEffect } from 'react';
import { uploadToStorage } from '../lib/storage';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  PenTool, 
  Eraser, 
  Image as ImageIcon, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';
import { getDbUsers, saveDbUsers, hashPassword, addEnterpriseAuditLog, THAI_PROVINCES } from '../data/db';

interface MyProfileViewProps {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  onRefreshData: () => void;
  themeColor?: string;
  setThemeColor?: (color: string) => void;
}

export default function MyProfileView({ currentUser, setCurrentUser, onRefreshData, themeColor = 'blue', setThemeColor }: MyProfileViewProps) {
  // Check if current user is an admin
  const isAdmin = currentUser.approval_level === 'Administrator';
  const isHR = currentUser.role === 'HR';

  // 1. Employee Edit Form States
  const [profilePic, setProfilePic] = useState(currentUser.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80');
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [department, setDepartment] = useState(currentUser.department || '');
  const [position, setPosition] = useState(currentUser.position || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [province, setProvince] = useState(currentUser.province || 'กรุงเทพมหานคร');
  
  // Restricted Fields
  const [employeeId, setEmployeeId] = useState(currentUser.username || currentUser.employee_id || '');
  const [approvalLevel, setApprovalLevel] = useState(currentUser.approval_level || 'General Employee');

  // Password States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sync employeeId with username to ensure they are always the same
  useEffect(() => {
    setEmployeeId(username);
  }, [username]);

  // Signature States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string>(currentUser.signatureUrl || '');

  // Status logs
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Sync canvas with existing signature
  useEffect(() => {
    if (signatureImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = signatureImage;
      }
    }
  }, [signatureImage]);

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e3a8a'; // dark-blue
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
  };

  const stopDrawing = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = await uploadToStorage('signatures/' + Date.now() + '.png', canvas.toDataURL('image/png'));
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
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then((dataUrl) => {
      
        setProfilePic(dataUrl);
      
    });
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then((dataUrl) => {
      
        setSignatureImage(dataUrl);
      
    });
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setFormErrors({});

    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'กรุณากรอกชื่อ-นามสกุลจริง';
    }
    if (!username.trim()) {
      errors.username = 'กรุณากรอกชื่อผู้ใช้งาน (Username)';
    }

    if (password) {
      if (password.length < 6) {
        errors.password = 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'รหัสผ่านยืนยันไม่ตรงกัน กรุณาตรวจสอบรหัสผ่านอีกครั้ง';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      
      const keyToId: Record<string, string> = {
        name: 'profile-name',
        username: 'profile-username',
        password: 'profile-password',
        confirmPassword: 'profile-confirm-password'
      };
      
      const firstInvalidId = keyToId[Object.keys(errors)[0]];
      if (firstInvalidId) {
        const element = document.getElementById(firstInvalidId);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    try {
      const dbUsers = getDbUsers();
      
      // Check if username has been taken by other users
      const isUsernameTaken = dbUsers.some(u => (u.username || '').toLowerCase() === (username || '').toLowerCase() && u.user_id !== currentUser.user_id);
      if (isUsernameTaken) {
        setFormErrors({ username: 'ชื่อผู้ใช้งานนี้ถูกใช้โดยพนักงานคนอื่นแล้ว กรุณาเลือกชื่ออื่น' });
        const element = document.getElementById('profile-username');
        if (element) element.focus();
        return setErrorMsg('ชื่อผู้ใช้งานนี้ถูกใช้โดยพนักงานคนอื่นแล้ว กรุณาเลือกชื่ออื่น');
      }

      // Find the logged-in user and update properties
      const updatedUsers = dbUsers.map(u => {
        if (u.user_id === currentUser.user_id) {
          const updated: UserProfile = {
            ...u,
            name: name.trim(),
            username: username.trim(),
            email: email.trim(),
            phone: phone.trim(),
            profilePictureUrl: profilePic,
            signatureUrl: signatureImage,
            department: department,
            position: position,
            address: address.trim(),
            province: province
          };

          // If password was input, hash and save it
          if (password) {
            updated.password = hashPassword(password);
            updated.force_password_change = false; // reset force flag if any
          }

          // Ensure employee_id matches username
          updated.employee_id = username.trim();

          // If the editor is admin, they can edit approval_level
          if (isAdmin) {
            updated.approval_level = approvalLevel;
          }

          return updated;
        }
        return u;
      });

      addEnterpriseAuditLog(
        currentUser.user_id,
        currentUser.name,
        currentUser.approval_level,
        'User_Change',
        `พนักงานอัปเดตข้อมูลส่วนตัว/ลายเซ็นของตนเองสำเร็จ`
      );

      // Save updated users list back to local DB
      saveDbUsers(updatedUsers);

      // Save updated user state in UI
      const foundNewUser = updatedUsers.find(u => u.username === username.trim());
      if (foundNewUser) {
        setCurrentUser(foundNewUser);
        localStorage.setItem('okey_simulated_user_id', foundNewUser.user_id);
      }

      setSuccessMsg('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว!');
      setPassword('');
      setConfirmPassword('');
      onRefreshData();

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);

    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">ข้อมูลส่วนตัวพนักงาน</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">จัดการข้อมูลประวัติตนเอง ภาพถ่าย ลายเซ็นดิจิทัลสำหรับลงนามความรับผิดชอบ และรหัสผ่าน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Profile Image & Signature */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Profile Pic Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs text-center flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 block w-full text-left">รูปโปรไฟล์</h3>
            <div className="relative group">
              <img 
                src={profilePic} 
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800 shadow-md"
                alt="profile portrait"
              />
              <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold">
                <ImageIcon className="h-4 w-4 mr-1.5" />
                <span>เปลี่ยนรูป</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleProfilePicUpload} 
                  className="hidden" 
                />
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-3">รองรับไฟล์ภาพ JPG, PNG ขนาดไม่เกิน 2MB</p>
          </div>

          {/* Signature Preview Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ลายมือชื่อปัจจุบัน</h3>
            <p className="text-xs text-slate-400 mb-4">ลายเซ็นของท่านจะปรากฏในรายงาน PDF ที่ผ่านการอนุมัติความถูกต้อง</p>
            
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-950 p-4 h-32 flex items-center justify-center overflow-hidden">
              {signatureImage ? (
                <img 
                  src={signatureImage} 
                  className="max-h-24 max-w-full object-contain" 
                  alt="Current Signature" 
                />
              ) : (
                <span className="text-xs text-slate-400 font-mono">ไม่มีลายมือชื่อบันทึกในฐานข้อมูล</span>
              )}
            </div>
          </div>

        </div>

        {/* Right Section: Form Fields & Interactive Canvas Signature */}
        <div className="lg:col-span-2 space-y-6">
          
          <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
            
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">จัดการแก้ไขรายละเอียดบัญชี</h3>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 rounded-xl border border-rose-200/50 dark:border-rose-900/50 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                <p className="text-xs font-bold">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs font-bold">{successMsg}</p>
              </div>
            )}

            {/* 1. HR Corporate Information Grid (Read-Only) */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">ข้อมูลจากทะเบียนฝ่ายบุคคล (HR Corporate Details - Read Only)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">เลขบัตรประจำตัวประชาชน</span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {currentUser.idCard ? currentUser.idCard.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5') : 'n/a'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">วันเดือนปีเกิด</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {currentUser.birthDate ? new Date(currentUser.birthDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'n/a'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">อายุ (คำนวณอัตโนมัติ)</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{currentUser.age ? `${currentUser.age} ปี` : 'n/a'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">เพศ</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{currentUser.gender === 'female' ? 'หญิง' : 'ชาย'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">เขตการไฟฟ้าที่รับผิดชอบ</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{currentUser.electricityRegion || 'สำนักงานใหญ่ (กฟผ.)'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">วันที่เริ่มงาน</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {currentUser.startDate ? new Date(currentUser.startDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'n/a'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">สถานะพนักงาน</span>
                  <span className={`text-xs font-bold capitalize ${currentUser.employmentStatus === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {currentUser.employmentStatus === 'active' ? 'ทำงานปกติ (Active)' : currentUser.employmentStatus || 'active'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">ระดับสิทธิ์ (Role)</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{currentUser.role || 'Employee'}</span>
                </div>
              </div>
            </div>

            {/* 2. Editable Profile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Employee Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block flex items-center justify-between">
                  <span>ชื่อ-นามสกุลจริง <span className="text-rose-500">*</span></span>
                  {!isAdmin && !isHR && <span className="text-[10px] text-slate-400 font-medium">(ติดต่อ HR เพื่อแก้ไขชื่อ)</span>}
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin && !isHR}
                  id="profile-name"
                  value={name || ''}
                  onChange={e => setName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary-500 ${
                    !isAdmin && !isHR ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.name}</p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block flex items-center justify-between">
                  <span>ชื่อผู้ใช้งาน (Username) <span className="text-rose-500">*</span></span>
                  {!isAdmin && !isHR && <span className="text-[10px] text-slate-400 font-medium">(ติดต่อ HR เพื่อแก้ไข Username)</span>}
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin && !isHR}
                  id="profile-username"
                  value={username || ''}
                  onChange={e => setUsername(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary-500 ${
                    !isAdmin && !isHR ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'
                  }`}
                />
                {formErrors.username && (
                  <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.username}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">อีเมลติดต่อ (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="เช่น email@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">เบอร์โทรศัพท์ (Phone)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="เช่น 089-123-4567"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Address (Editable Self-Service) */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ที่อยู่ปัจจุบันสำหรับการจัดส่งเอกสาร</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="เช่น บ้านเลขที่ 123/45 ถนนพัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Province (Editable Self-Service) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">จังหวัดที่พำนัก</label>
                <select
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {THAI_PROVINCES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Employee ID (Derived from Username) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                  <span>รหัสพนักงาน (Employee ID)</span>
                  <span className="text-[9px] text-primary-600 bg-primary-50 dark:bg-primary-950/30 dark:text-primary-400 px-1.5 py-0.5 rounded font-medium">(ใช้ตามชื่อผู้ใช้งาน / Same as Username)</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={username}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 cursor-not-allowed border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

            </div>

            {/* Change Password Block */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-indigo-600" />
                <span>เปลี่ยนรหัสผ่าน (หากไม่ต้องการเปลี่ยน ให้เว้นว่างไว้)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">รหัสผ่านใหม่</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="profile-password"
                      value={password || ''}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="ป้อนรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
                      className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary-500 ${
                        formErrors.password ? 'border-rose-500 focus:ring-rose-500 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="profile-confirm-password"
                    value={confirmPassword || ''}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="ระบุรหัสผ่านใหม่เดิมให้ตรงกัน"
                    className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-primary-500 ${
                      formErrors.confirmPassword ? 'border-rose-500 focus:ring-rose-500 text-rose-950 dark:text-rose-200' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1">⚠️ {formErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Draw Signature Pad block */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <PenTool className="h-4 w-4 text-emerald-600" />
                <span>ลงลายมือชื่อดิจิทัล (Draw or Upload Signature)</span>
              </h4>

              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Pad */}
                <div className="flex-1">
                  <div className="text-xs text-slate-400 mb-2 flex justify-between">
                    <span>วาดด้วยเม้าส์หรือนิ้วสัมผัสในกรอบสี่เหลี่ยมนี้:</span>
                    <button 
                      type="button"
                      onClick={clearCanvas}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
                    >
                      <Eraser className="h-3 w-3" />
                      <span>ล้างลายเส้น (Reset)</span>
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    width={500}
                    height={160}
                    className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-2xl h-36 cursor-crosshair touch-none"
                  />
                </div>

                {/* File upload replacement */}
                <div className="w-full md:w-60 flex flex-col justify-end">
                  <span className="text-xs text-slate-400 block mb-2">หรืออัปโหลดรูปภาพลายเซ็น:</span>
                  <div className="border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-center bg-slate-50/20">
                    <label className="cursor-pointer text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex flex-col items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                      <span>อัปโหลดรูปภาพลายเซ็น (PNG)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleSignatureUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

              </div>
            </div>

            {/* Form actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold transition-all shadow-md shadow-green-500/20 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShieldCheck className="h-4.5 w-4.5" />
                <span>บันทึกข้อมูลส่วนตัวของฉัน</span>
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
