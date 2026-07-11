import React, { useState } from 'react';
import { 
  Building, 
  UserCheck, 
  Lock, 
  Phone, 
  Mail, 
  ShieldCheck, 
  FileText,
  CreditCard,
  CheckCircle2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { CompanyMasterData, UserProfile } from '../types';
import { saveDbCompanyData, getDbUsers, saveDbUsers, hashPassword } from '../data/db';

interface InitialSetupViewProps {
  onSetupCompleted: () => void;
}

export default function InitialSetupView({ onSetupCompleted }: InitialSetupViewProps) {
  // 1. Company Profile Form States
  const [companyName, setCompanyName] = useState('บริษัท โอเค เอ็กซ์เพนส์ แมเนจเมนท์ จำกัด');
  const [taxId, setTaxId] = useState('0-1055-66000-11-2');
  const [address, setAddress] = useState('99/9 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310');
  const [companyPhone, setCompanyPhone] = useState('02-123-4567');
  const [companyEmail, setCompanyEmail] = useState('finance@okay.com');
  const [bankInfo, setBankInfo] = useState('ธนาคารกสิกรไทย สาขาพระราม 9 เลขที่บัญชี 123-4-56789-0');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60');

  // 2. First Administrator Form States
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!companyName.trim() || !taxId.trim() || !address.trim() || !companyPhone.trim() || !companyEmail.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลบริษัทที่จำเป็นให้ครบถ้วน');
      return;
    }
    setStep(2);
  };

  const handleCompleteSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!adminName.trim() || !adminEmail.trim() || !adminPhone.trim() || !adminPassword.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลผู้ดูแลระบบให้ครบถ้วน');
      return;
    }

    if (adminPassword.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (adminPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    try {
      // 1. Build and save Company Profile Master Data
      const companyProfile: CompanyMasterData = {
        companyName: companyName.trim(),
        logoUrl: logoUrl.trim(),
        address: address.trim(),
        taxId: taxId.trim(),
        phone: companyPhone.trim(),
        email: companyEmail.trim(),
        bankInfo: bankInfo.trim()
      };
      saveDbCompanyData(companyProfile);

      // 2. Build and save Administrator user
      const dbUsers = getDbUsers();
      
      // Remove any existing user-admin to prevent duplicate primary keys
      const filteredUsers = dbUsers.filter(u => u.user_id !== 'user-admin');

      const adminUser: UserProfile = {
        user_id: 'user-admin',
        username: 'Okay0000',
        name: adminName.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim(),
        password: hashPassword(adminPassword), // Secure hash
        department: 'บัญชีและการเงิน (Finance)',
        position: 'System Administrator (CFO)',
        is_active: true,
        approval_level: 'Administrator',
        signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png' // default sig
      };

      const updatedUsers = [adminUser, ...filteredUsers];
      saveDbUsers(updatedUsers);

      // Set initial setup completed flags in storage
      localStorage.setItem('okey_initial_setup_completed', 'true');
      localStorage.setItem('okey_initial_company_data_filled', 'true');

      setSuccessMsg('ตั้งค่าระบบ O-Key Expense สำเร็จ! กำลังพาคุณไปยังหน้าลงชื่อเข้าใช้...');
      
      setTimeout(() => {
        onSetupCompleted();
      }, 2000);

    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden animate-fade-in">
        
        {/* Top visual accent */}
        <div className="bg-gradient-to-r from-primary-600 to-indigo-700 p-8 text-white relative">
          <div className="absolute right-6 top-6 opacity-10">
            <Building size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-bold tracking-wider uppercase text-primary-100">O-Key Expense System Setup</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">ตั้งค่าระบบเริ่มต้นครั้งแรก</h1>
            <p className="text-sm text-primary-100 mt-2 leading-relaxed">
              ยินดีต้อนรับสู่ระบบบริหารจัดการค่าใช้จ่าย O-Key Expense สำหรับวิสาหกิจแบบไดนามิก 
              กรุณากรอกข้อมูลโปรไฟล์บริษัทและกำหนดบัญชีผู้ดูแลระบบ (Administrator) เพื่อเริ่มต้นใช้งาน
            </p>
          </div>

          {/* Stepper Progress bar */}
          <div className="flex items-center gap-3 mt-8">
            <div className="flex-1 h-1.5 rounded-full bg-white/20 relative overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-white dark:bg-slate-900 transition-all duration-300"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
            <span className="text-xs font-bold tracking-wider shrink-0 text-primary-500 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-full shadow-xs">
              ขั้นตอนที่ {step} / 2
            </span>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          
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

          {step === 1 ? (
            /* STEP 1: Company Profile Configuration */
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h2 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <span>1. ข้อมูลรายละเอียดบริษัท (Company Profile)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ข้อมูลในส่วนนี้จะใช้สำหรับจัดทำหัวเอกสาร PDF ใบเบิกจ่าย/ใบแทนใบเสร็จต่างๆ ที่เป็นทางการ</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Company Name */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ชื่อบริษัท (ไทย)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น บริษัท แสนดี คอร์ปอเรชัน จำกัด"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Tax ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">เลขประจำตัวผู้เสียภาษีอากร (Tax ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 0-1055-66000-11-2"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">เบอร์โทรศัพท์ติดต่อบริษัท</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 02-123-4567"
                    value={companyPhone}
                    onChange={e => setCompanyPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">อีเมลติดต่อฝ่ายบัญชี</label>
                  <input
                    type="email"
                    required
                    placeholder="เช่น accounting@company.com"
                    value={companyEmail}
                    onChange={e => setCompanyEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Logo URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">รูปโลโก้บริษัท (Image Logo URL)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ที่อยู่สำนักงานใหญ่</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="99/9 ถนนวิภาวดีรังสิต แขวงลาดยาว..."
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                {/* Bank Info */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ข้อมูลบัญชีเงินฝากบริษัท (สำหรับโอนจ่ายเบิกและรับเงินคืน)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ธนาคารกสิกรไทย เลขที่บัญชี 123-4-56789-0"
                    value={bankInfo}
                    onChange={e => setBankInfo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                  />
                </div>

              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    // Bypass with default data to avoid getting stuck
                    localStorage.setItem('okey_initial_setup_completed', 'true');
                    localStorage.setItem('okey_initial_company_data_filled', 'true');
                    onSetupCompleted();
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  ← ย้อนกลับ (ใช้ค่าเริ่มต้นระบบ)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ขั้นตอนถัดไป (กำหนดสิทธิ์ผู้ดูแล) →
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Administrator Creation */
            <form onSubmit={handleCompleteSetup} className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h2 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-indigo-600" />
                  <span>2. บัญชีผู้ดูแลระบบคนแรก (Primary Administrator)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ผู้ใช้รายนี้จะมีระดับสิทธิ์เป็น "Administrator" สามารถอนุมัติ Workflow จัดสรรสิทธิ์พนักงาน และแก้ไขบริษัทได้ทั้งหมด</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Admin Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ชื่อ-นามสกุลจริง</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สิรินธร รัตนสกุล"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Admin Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">เบอร์โทรศัพท์ (ใช้สำหรับเข้าสู่ระบบ)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="เช่น 080-000-0000"
                      value={adminPhone}
                      onChange={e => setAdminPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Admin Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">อีเมลประจำตัว (Email)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="เช่น admin@okey.com"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Preset ID Warning */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">รหัสพนักงานประจำตัว (Username)</label>
                  <input
                    type="text"
                    disabled
                    value="Okay0000 (ถูกกำหนดอัตโนมัติ)"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-400 rounded-lg border border-slate-200 dark:border-slate-800 cursor-not-allowed font-semibold"
                  />
                </div>

                {/* Admin Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">รหัสผ่านสำหรับลงชื่อเข้าใช้ (Password)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Confirm Admin Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ยืนยันรหัสผ่านอีกครั้ง (Confirm Password)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="ระบุรหัสผ่านเดิมให้ตรงกัน"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold transition-all shadow-md shadow-green-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>บันทึกและเปิดใช้งานระบบ O-Key Expense</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
