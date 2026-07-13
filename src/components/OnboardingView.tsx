import React, { useState, useEffect, useRef } from 'react';
import { uploadToStorage } from '../lib/storage';
import { 
  UserPlus, 
  Check, 
  X, 
  FolderPlus, 
  Users, 
  Shuffle, 
  AlertCircle,
  HelpCircle,
  Phone,
  Lock,
  User,
  Layers,
  Award,
  Eraser,
  PenTool,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle,
  FileText,
  Building,
  CreditCard,
  MapPin,
  Mail,
  Calendar,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { UserProfile, Department } from '../types';
import { 
  getDbUsers, 
  saveDbUsers, 
  getDbDepartments, 
  addDepartment,
  hashPassword,
  validateThaiNationalID,
  calculateAge,
  addEnterpriseAuditLog
} from '../data/db';
import { uploadUserSignature } from '../lib/googleDriveService';

// Custom Sub-components and Utilities
import { 
  calculateWorkTenure, 
  generateNextEmployeeId, 
  AVATAR_PRESETS, 
  THAI_BANKS 
} from '../utils/employeeUtils';
import EmployeeImportTab from './EmployeeImportTab';
import EmployeeReportTab from './EmployeeReportTab';

interface OnboardingViewProps {
  onRefreshData: () => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
}

type ActiveTab = 'list' | 'form' | 'import' | 'report';

export default function OnboardingView({ onRefreshData, currentUser, setCurrentUser }: OnboardingViewProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');

  // Database states
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Selected Employee for Editing
  const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);

  // Form states for onboarding/editing
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('password123');
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('นาย');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [idCard, setIdCard] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState(0);
  const [gender, setGender] = useState('male');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [approvalLevel, setApprovalLevel] = useState('Level 1');
  const [isActive, setIsActive] = useState(true);
  
  // Banking, Emergency Contact, Profile Pic
  const [bankName, setBankName] = useState('ธนาคารกสิกรไทย (KBank)');
  const [bankAccount, setBankAccount] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'probation' | 'active' | 'suspended' | 'resigned'>('active');
  const [profilePic, setProfilePic] = useState('');

  const [customDept, setCustomDept] = useState('');
  const [username, setUsername] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);

  // Directory Search/Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Canvas states for Signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string>('');
  const [signaturePoints, setSignaturePoints] = useState<any[]>([]);

  // New Department creator state
  const [newDeptName, setNewDeptName] = useState('');

  // Admin Reset Password States
  const [resetPwUser, setResetPwUser] = useState<UserProfile | null>(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [resetPwSuccess, setResetPwSuccess] = useState('');

  // Form Validation Warnings & Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Uniqueness warnings
  const [usernameStatus, setUsernameStatus] = useState<'empty' | 'available' | 'taken' | 'invalid_format'>('empty');
  const [idCardStatus, setIdCardStatus] = useState<'empty' | 'valid' | 'invalid' | 'taken'>('empty');
  const [empIdStatus, setEmpIdStatus] = useState<'empty' | 'available' | 'taken'>('empty');

  // Load from local DB
  const loadOnboardingData = () => {
    const users = getDbUsers();
    setEmployees(users);
    const depts = getDbDepartments();
    setDepartments(depts);

    if (depts.length > 0 && !department) {
      setDepartment(depts[0].department_name);
    }
  };

  useEffect(() => {
    loadOnboardingData();
    window.addEventListener('okey-sync', loadOnboardingData);
    return () => window.removeEventListener('okey-sync', loadOnboardingData);
  }, []);

  // Set default start date and suggest next Username when in Creation Mode
  useEffect(() => {
    if (!selectedEmployee && activeTab === 'form') {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      suggestNextUsername(employees);
    }
  }, [selectedEmployee, activeTab, employees]);

  // Sync Employee ID with Username
  useEffect(() => {
    setEmployeeId(username);
  }, [username]);

  // Handle Birth Date Age Auto-calculation
  useEffect(() => {
    if (birthDate) {
      setAge(calculateAge(birthDate));
    }
  }, [birthDate]);

  // Sync Names: FirstName + LastName to full Name
  useEffect(() => {
    if (firstName || lastName) {
      setName(`${firstName} ${lastName}`.trim());
    }
  }, [firstName, lastName]);

  // Canvas drawing handlers
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
    setSignaturePoints([]);
  };

  // Auto Username Generator: "OkayXXXX" pattern
  const suggestNextUsername = (usersList: UserProfile[]) => {
    const pattern = /^Okay(\d+)$/;
    let maxNum = 0;
    usersList.forEach(u => {
      const match = u.username?.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNumString = String(maxNum + 1).padStart(4, '0');
    setUsername(`Okay${nextNumString}`);
  };

  // Live validate Username, ID Card, Employee ID uniqueness
  useEffect(() => {
    if (!username) {
      setUsernameStatus('empty');
      return;
    }
    const pattern = /^Okay\d+$/;
    if (!pattern.test(username)) {
      setUsernameStatus('invalid_format');
      return;
    }

    const isDuplicate = employees.some(e => e.username?.toLowerCase() === username.toLowerCase() && e.user_id !== selectedEmployee?.user_id);
    if (isDuplicate) {
      setUsernameStatus('taken');
    } else {
      setUsernameStatus('available');
    }
  }, [username, employees, selectedEmployee]);

  useEffect(() => {
    const cleanId = idCard?.replace(/[^0-9]/g, '');
    if (!cleanId) {
      setIdCardStatus('empty');
      return;
    }
    if (cleanId.length !== 13) {
      setIdCardStatus('invalid');
      return;
    }
    if (!validateThaiNationalID(cleanId)) {
      setIdCardStatus('invalid');
      return;
    }

    const isDuplicate = employees.some(e => e.idCard === cleanId && e.user_id !== selectedEmployee?.user_id);
    if (isDuplicate) {
      setIdCardStatus('taken');
    } else {
      setIdCardStatus('valid');
    }
  }, [idCard, employees, selectedEmployee]);

  useEffect(() => {
    if (!employeeId) {
      setEmpIdStatus('empty');
      return;
    }
    const isDuplicate = employees.some(e => e.employee_id?.toLowerCase() === employeeId.toLowerCase() && e.user_id !== selectedEmployee?.user_id);
    if (isDuplicate) {
      setEmpIdStatus('taken');
    } else {
      setEmpIdStatus('available');
    }
  }, [employeeId, employees, selectedEmployee]);

  // Handle Profile Picture Custom Upload
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadToStorage('uploads/' + Date.now() + '_' + file.name, file).then((dataUrl) => {
      
        if (dataUrl) {
          setProfilePic(dataUrl);
        }
      
    });
    }
  };

  // Admin Reset Password Submission
  const handleAdminResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwUser || !resetPwValue.trim()) return;

    if (resetPwValue.length < 6) {
      alert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      const dbUsers = getDbUsers();
      const updatedUsers = dbUsers.map(u => {
        if (u.user_id === resetPwUser.user_id) {
          return {
            ...u,
            password: hashPassword(resetPwValue),
            force_password_change: true
          };
        }
        return u;
      });

      saveDbUsers(updatedUsers);
      setEmployees(updatedUsers);
      
      // Audit trail logging
      addEnterpriseAuditLog(
        currentUser.user_id,
        currentUser.name,
        currentUser.approval_level || 'Administrator',
        'Permission_Change',
        `Reset password for employee ${resetPwUser.name} (${resetPwUser.username})`
      );

      setResetPwSuccess(`รีเซ็ตรหัสผ่านพนักงาน ${resetPwUser.name} สำเร็จ! (บังคับเปลี่ยนเมื่อเข้าใช้งานครั้งแรก)`);
      setResetPwValue('');
      
      setTimeout(() => {
        setResetPwUser(null);
        setResetPwSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    }
  };

  // Soft Delete and Restore Actions
  const handleSoftDelete = (emp: UserProfile) => {
    const confirmText = emp.deleted 
      ? `คุณแน่ใจหรือไม่ที่จะกู้คืนข้อมูลพนักงานคุณ ${emp.name}?` 
      : `คุณต้องการลบข้อมูลพนักงานคุณ ${emp.name} หรือไม่? (ข้อมูลจะยังถูกรักษาอยู่ในสายอนุมัติย้อนหลัง)`;
    
    if (confirm(confirmText)) {
      const updated = employees.map(u => {
        if (u.user_id === emp.user_id) {
          return {
            ...u,
            deleted: !u.deleted,
            is_active: u.deleted ? true : false // Disable if deleted, active if restored
          };
        }
        return u;
      });

      saveDbUsers(updated);
      setEmployees(updated);

      addEnterpriseAuditLog(
        currentUser.user_id,
        currentUser.name,
        currentUser.approval_level || 'Administrator',
        'Delete',
        `${emp.deleted ? 'Restored' : 'Soft-deleted'} employee profile for ${emp.name} (${emp.username})`
      );

      alert(`${emp.deleted ? 'กู้คืน' : 'ระงับ/ลบ'}ข้อมูลสำเร็จ`);
      loadOnboardingData();
      onRefreshData();
    }
  };

  // Trigger Edit Mode and switch to Form Tab
  const handleEditTrigger = (emp: UserProfile) => {
    setSelectedEmployee(emp);
    
    // Populate form states
    setName(emp.name || '');
    setPhone(emp.phone || '');
    setUsername(emp.username || '');
    setEmployeeId(emp.employee_id || '');
    setTitle(emp.title || 'นาย');
    setFirstName(emp.firstName || '');
    setLastName(emp.lastName || '');
    setNickname(emp.nickname || '');
    setIdCard(emp.idCard || '');
    setBirthDate(emp.birthDate || '');
    setAge(emp.age || 0);
    setGender(emp.gender || 'male');
    setEmail(emp.email || '');
    setAddress(emp.address || '');
    setStartDate(emp.startDate || '');
    setDepartment(emp.department || '');
    setPosition(emp.position || '');
    setApprovalLevel(emp.approval_level || 'Level 1');
    setIsActive(emp.is_active);
    setBankName(emp.bankName || 'ธนาคารกสิกรไทย (KBank)');
    setBankAccount(emp.bankAccount || '');
    setEmergencyContact(emp.emergencyContact || '');
    setEmergencyPhone(emp.emergencyPhone || '');
    setEmploymentStatus(emp.employmentStatus || 'active');
    setProfilePic(emp.profilePictureUrl || '');
    setSignatureImage(emp.signatureUrl || '');

    setActiveTab('form');
  };

  // Reset Form Field states
  const handleClearForm = () => {
    setSelectedEmployee(null);
    setName('');
    setPhone('');
    setPassword('password123');
    setConfirmPassword('password123');
    setEmployeeId('');
    setTitle('นาย');
    setFirstName('');
    setLastName('');
    setNickname('');
    setIdCard('');
    setBirthDate('');
    setAge(0);
    setGender('male');
    setEmail('');
    setAddress('');
    setStartDate('');
    setPosition('');
    setIsActive(true);
    setBankName('ธนาคารกสิกรไทย (KBank)');
    setBankAccount('');
    setEmergencyContact('');
    setEmergencyPhone('');
    setEmploymentStatus('active');
    setProfilePic('');
    setSignatureImage('');
    clearCanvas();
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Submit Handler for Onboard & Update Form
  const handleOnboardEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Field Validations
    if (!firstName || !lastName || !phone || !position || (!department && !customDept)) {
      setErrorMsg('กรุณากรอกข้อมูลส่วนบุคคลและตำแหน่งงานที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (!selectedEmployee && password !== confirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMsg('รหัส Username เข้าสู่ระบบซ้ำในระบบ O-Key ERP');
      return;
    }

    if (usernameStatus === 'invalid_format') {
      setErrorMsg('Username ต้องถูกต้องตามมาตรฐาน (ขึ้นต้นด้วย Okay และตามด้วยรหัสตัวเลข เช่น Okay0001)');
      return;
    }

    if (idCardStatus === 'taken') {
      setErrorMsg('เลขบัตรประจำตัวประชาชนซ้ำกับบุคลากรในบริษัท');
      return;
    }

    if (idCardStatus === 'invalid') {
      setErrorMsg('เลขบัตรประจำตัวประชาชนไม่ถูกต้องตามหลักกระทรวงมหาดไทย');
      return;
    }

    if (empIdStatus === 'taken') {
      setErrorMsg('รหัสประจำตัวพนักงาน (Employee ID) ซ้ำในบริษัท');
      return;
    }

    // Resolve Custom Department
    let finalDept = department;
    if (isCustomDept && customDept.trim()) {
      finalDept = customDept.trim();
      const depts = getDbDepartments();
      if (!depts.some(d => d.department_name === finalDept)) {
        addDepartment(finalDept);
      }
    }

    // Signature uploads
    let finalSignatureUrl = signatureImage;
    let finalSignatureId = selectedEmployee?.signature_id || '';
    const token = localStorage.getItem('okey_google_drive_token');

    if (token && signatureImage && signatureImage.startsWith('data:image/')) {
      try {
        setSuccessMsg('กำลังตรวจสอบและอัปโหลดไฟล์ลายเซ็นดิจิทัลไปยัง Google Drive...');
        const result = await uploadUserSignature(token, username, signatureImage);
        finalSignatureUrl = result.url;
        finalSignatureId = result.id;
      } catch (err: any) {
        console.error('Drive upload failed, falling back to local storage:', err);
      }
    }

    const metadataObj = {
      device: navigator.userAgent,
      timestamp: new Date().toISOString(),
      platform: navigator.platform
    };

    // Construct profile picture fallback if empty
    let finalProfilePic = profilePic;
    if (!finalProfilePic) {
      const matchPreset = AVATAR_PRESETS.find(p => p.gender === gender);
      finalProfilePic = matchPreset ? matchPreset.url : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';
    }

    const dbUsers = getDbUsers();

    if (selectedEmployee) {
      // Edit mode: Update existing
      const updatedUsers = dbUsers.map(u => {
        if (u.user_id === selectedEmployee.user_id) {
          return {
            ...u,
            username,
            employee_id: employeeId,
            name: `${firstName} ${lastName}`.trim(),
            phone,
            department: finalDept,
            position,
            is_active: isActive,
            approval_level: approvalLevel,
            profilePictureUrl: finalProfilePic,
            signatureUrl: finalSignatureUrl,
            signature_id: finalSignatureId,
            signature_vector: signaturePoints.length > 0 ? JSON.stringify(signaturePoints) : u.signature_vector,
            signature_metadata: JSON.stringify(metadataObj),
            title,
            firstName,
            lastName,
            nickname,
            idCard,
            birthDate,
            age,
            gender,
            email,
            address,
            startDate,
            bankName,
            bankAccount,
            emergencyContact,
            emergencyPhone,
            employmentStatus
          };
        }
        return u;
      });

      saveDbUsers(updatedUsers);
      
      // Audit trail
      addEnterpriseAuditLog(
        currentUser.user_id,
        currentUser.name,
        currentUser.approval_level || 'Administrator',
        'Edit',
        `Updated detailed employee record for ${firstName} ${lastName} (${username})`
      );

      setSuccessMsg(`อัปเดตข้อมูลพนักงานคุณ ${firstName} ${lastName} สำเร็จ!`);
    } else {
      // Create mode: Onboard New Employee
      const newUserId = `user-${Date.now()}`;
      const newUser: UserProfile = {
        user_id: newUserId,
        username,
        employee_id: employeeId,
        name: `${firstName} ${lastName}`.trim(),
        phone,
        password: hashPassword(password),
        department: finalDept,
        position,
        is_active: isActive,
        approval_level: approvalLevel,
        profilePictureUrl: finalProfilePic,
        signatureUrl: finalSignatureUrl,
        signature_id: finalSignatureId,
        signature_vector: JSON.stringify(signaturePoints),
        signature_metadata: JSON.stringify(metadataObj),
        title,
        firstName,
        lastName,
        nickname,
        idCard,
        birthDate,
        age,
        gender,
        email,
        address,
        startDate,
        bankName,
        bankAccount,
        emergencyContact,
        emergencyPhone,
        employmentStatus,
        deleted: false
      };

      const updatedUsers = [...dbUsers, newUser];
      saveDbUsers(updatedUsers);

      // Auto-assign default Approval Rule
      const currentRules = JSON.parse(localStorage.getItem('okey_db_rules') || '[]');
      currentRules.push({
        rule_id: `rule-auto-${Date.now()}`,
        requester_user_id: newUserId,
        approver_user_id: 'user-admin', // Default flow
        level: 1,
        next_approver_id: null
      });
      localStorage.setItem('okey_db_rules', JSON.stringify(currentRules));

      // Audit trail
      addEnterpriseAuditLog(
        currentUser.user_id,
        currentUser.name,
        currentUser.approval_level || 'Administrator',
        'Master_Change',
        `Registered and onboarded new employee ${firstName} ${lastName} (${username})`
      );

      setSuccessMsg(`ลงทะเบียนและเปิดบัญชีให้พนักงานคุณ ${firstName} ${lastName} เรียบร้อยแล้ว!`);
    }

    // Refresh data and reset form
    setTimeout(() => {
      handleClearForm();
      setActiveTab('list');
      loadOnboardingData();
      onRefreshData();
    }, 2000);
  };

  // Switch simulated session
  const handleSwitchSession = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('okey_simulated_user_id', user.user_id);
    onRefreshData();
  };

  // Add Department directly
  const handleAddDeptDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    const depts = getDbDepartments();
    if (depts.some(d => (d.department_name || '').toLowerCase() === (newDeptName.trim() || '').toLowerCase())) {
      alert('แผนกนี้มีอยู่ในระบบแล้ว');
      return;
    }

    addDepartment(newDeptName.trim());
    
    addEnterpriseAuditLog(
      currentUser.user_id,
      currentUser.name,
      currentUser.approval_level || 'Administrator',
      'Master_Change',
      `Created new enterprise department: ${newDeptName.trim()}`
    );

    setNewDeptName('');
    loadOnboardingData();
    onRefreshData();
  };

  // Directory Filter Logic
  const getFilteredEmployees = () => {
    return employees.filter(emp => {
      // Base search queries
      const matchesSearch = 
        (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.idCard || '').includes(searchQuery) ||
        (emp.phone || '').includes(searchQuery) ||
        (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.position || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase());

      // Department filter
      const matchesDept = deptFilter === 'all' || emp.department === deptFilter;

      // Role filter
      const matchesRole = roleFilter === 'all' || emp.approval_level === roleFilter;

      // Status filters (soft-delete toggled here)
      let matchesStatus = true;
      if (statusFilter === 'all') {
        matchesStatus = !emp.deleted; // By default exclude deleted
      } else if (statusFilter === 'deleted') {
        matchesStatus = !!emp.deleted; // Show specifically deleted
      } else {
        matchesStatus = !emp.deleted && emp.employmentStatus === statusFilter;
      }

      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });
  };

  const filteredEmployees = getFilteredEmployees();

  // Handle successful file import callback
  const handleImportSuccess = (imported: UserProfile[]) => {
    const dbUsers = getDbUsers();
    
    // Save to database
    const updatedUsers = [...dbUsers, ...imported];
    saveDbUsers(updatedUsers);

    // Auto generate approval rules
    const currentRules = JSON.parse(localStorage.getItem('okey_db_rules') || '[]');
    imported.forEach(emp => {
      currentRules.push({
        rule_id: `rule-auto-import-${emp.user_id}-${Date.now()}`,
        requester_user_id: emp.user_id,
        approver_user_id: 'user-admin',
        level: 1,
        next_approver_id: null
      });
    });
    localStorage.setItem('okey_db_rules', JSON.stringify(currentRules));

    // Audit Log
    addEnterpriseAuditLog(
      currentUser.user_id,
      currentUser.name,
      currentUser.approval_level || 'Administrator',
      'Upload',
      `Imported and registered ${imported.length} employee records from custom flat file`
    );

    alert(`นำเข้าข้อมูลบุคลากรจำนวน ${imported.length} คน สำเร็จเสร็จสิ้น!`);
    loadOnboardingData();
    onRefreshData();
    setActiveTab('list');
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100" id="employee-management-root">
      
      {/* Dynamic Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute right-0 bottom-0 opacity-15 transform translate-x-12 translate-y-12 scale-150">
          <Users size={240} className="text-indigo-400" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-2">
          <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-500/20">
            คอนโซลบริหารจัดการทรัพยากรบุคคล (Enterprise HR System Console)
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            ศูนย์กลางทะเบียนประวัติและบัญชีบุคลากร O-Key ERP
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            ลงทะเบียนข้อมูลประวัติพนักงาน ผูกโยงเบอร์ล็อกอิน รักษารูปโปรไฟล์ดิจิทัล บันทึกลายมือชื่อเพื่อผูกงบการเบิกจ่าย 
            และอิมพอร์ตเอกสารแบบรวมศูนย์ (Bulk Onboarding)
          </p>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => { setActiveTab('list'); handleClearForm(); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'list' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>ทำเนียบพนักงาน ({employees.filter(e => !e.deleted).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('form')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'form' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>{selectedEmployee ? `แก้ไขข้อมูล: ${firstName || 'พนักงาน'}` : 'เพิ่มพนักงานใหม่'}</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'import' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>นำเข้าข้อมูลผ่านไฟล์ (Bulk Import)</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'report' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>รายงานทะเบียนประวัติพนักงาน</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        
        {/* TAB 1: EMPLOYEE DIRECTORY LIST */}
        {activeTab === 'list' && (
          <div className="space-y-6">
            
            {/* Searching Filters Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h2 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-indigo-500" />
                  <span>ตัวคัดกรองข้อมูลบุคลากรและค้นหาทำเนียบ</span>
                </h2>
                
                {searchQuery || statusFilter !== 'all' || deptFilter !== 'all' || roleFilter !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setDeptFilter('all');
                      setRoleFilter('all');
                    }}
                    className="text-[10px] text-rose-500 hover:underline font-bold flex items-center gap-1 self-end md:self-auto cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>ล้างตัวกรองทั้งหมด</span>
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search query box */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นตาม ชื่อ, รหัส, เบอร์โทร, เลขบัตร..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {/* Status filter dropdown */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="all">🟢 พนักงานปัจจุบันทั้งหมด (ปกติ)</option>
                  <option value="probation">🟡 ทดลองงาน (Probation)</option>
                  <option value="active">🟢 บรรจุประจำ (Active)</option>
                  <option value="suspended">🔴 ระงับบัญชี (Suspended)</option>
                  <option value="resigned">⚪ พ้นสภาพพนักงาน (Resigned)</option>
                  <option value="deleted">🗑 รายการที่ลบ (Soft-Deleted)</option>
                </select>

                {/* Department filter dropdown */}
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="all">🏢 ทุกแผนกงาน ({departments.length})</option>
                  {departments.map(d => (
                    <option key={d.department_id} value={d.department_name}>{d.department_name}</option>
                  ))}
                </select>

                {/* Role filter dropdown */}
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="all">👑 ทุกระดับสิทธิ์ผู้อนุมัติ</option>
                  <option value="Level 1">Level 1 (Staff)</option>
                  <option value="Level 2">Level 2 (Team Lead)</option>
                  <option value="Level 3">Level 3 (Manager)</option>
                  <option value="Level 4">Level 4 (Director)</option>
                  <option value="Finance">Finance (บัญชีและการเงิน)</option>
                  <option value="Administrator">Administrator (แอดมินสูงสุด)</option>
                </select>
              </div>
            </div>

            {/* Employee Data Grid / Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  ตารางแสดงข้อมูลทะเบียนประวัติ ({filteredEmployees.length} คน)
                </span>
                
                <button
                  onClick={() => { handleClearForm(); setActiveTab('form'); }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>เพิ่มคนใหม่</span>
                </button>
              </div>

              {filteredEmployees.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Users className="h-12 w-12 text-slate-300 mx-auto animate-bounce" />
                  <p className="text-xs font-bold text-slate-500">ไม่พบบุคลากรตามเงื่อนไขการค้นหาที่เลือก</p>
                  <p className="text-[11px] text-slate-400">กรุณาปรับปรุงพารามิเตอร์การค้นหา หรือเพิ่มพนักงานใหม่ผ่านปุ่มด้านบน</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200/60 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5">พนักงาน (Profile)</th>
                        <th className="p-3.5">รหัสพนักงาน</th>
                        <th className="p-3.5">เบอร์โทร & เลขบัตร ปชช</th>
                        <th className="p-3.5">วันที่เริ่มงาน & อายุงาน</th>
                        <th className="p-3.5 text-center">สถานะ</th>
                        <th className="p-3.5 text-right">การจัดการพนักงาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                      {filteredEmployees.map(emp => {
                        const isActiveUser = emp.user_id === currentUser.user_id;
                        return (
                          <tr key={emp.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <img 
                                    src={emp.profilePictureUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'} 
                                    alt="Profile" 
                                    className="h-10 w-10 rounded-full object-crop border border-slate-200 dark:border-slate-700" 
                                    referrerPolicy="no-referrer"
                                  />
                                  {isActiveUser && (
                                    <span className="absolute -bottom-1 -right-1 bg-emerald-500 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs">{emp.name}</span>
                                    {emp.nickname && <span className="text-[10px] text-slate-400 font-normal">({emp.nickname})</span>}
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    🏢 {emp.department} • 💼 {emp.position}
                                  </p>
                                  <p className="text-[9px] text-indigo-500 font-bold uppercase mt-0.5">
                                    สิทธิ์: {emp.approval_level}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 font-mono font-bold text-slate-600 dark:text-slate-300 text-xs">
                              {emp.employee_id || 'N/A'} <br/>
                              <span className="text-[9px] text-slate-400 font-normal">({emp.username})</span>
                            </td>

                            <td className="p-3.5 space-y-0.5">
                              <p className="font-mono text-slate-700 dark:text-slate-300">📞 {emp.phone || 'N/A'}</p>
                              <p className="font-mono text-[10px] text-slate-400">💳 ID: {emp.idCard || 'N/A'}</p>
                            </td>

                            <td className="p-3.5 space-y-0.5">
                              <p className="font-mono text-slate-700 dark:text-slate-300">📅 {emp.startDate || 'N/A'}</p>
                              <p className="text-[10px] text-slate-500 font-semibold bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md inline-block">
                                ⏳ {calculateWorkTenure(emp.startDate)}
                              </p>
                            </td>

                            <td className="p-3.5 text-center">
                              {emp.deleted ? (
                                <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200/40">
                                  Deleted
                                </span>
                              ) : emp.employmentStatus === 'resigned' ? (
                                <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200/40">
                                  Resigned
                                </span>
                              ) : emp.is_active ? (
                                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/40">
                                  Active
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200/40">
                                  Suspended
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isActiveUser ? (
                                  <button
                                    onClick={() => handleSwitchSession(emp)}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-md text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                    title="สวมบทบาทเข้าระบบเป็นพนักงานท่านนี้เพื่อทดสอบ"
                                  >
                                    <span>สวมบท</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md mr-1 border border-emerald-100 dark:border-emerald-900/30">
                                    Current
                                  </span>
                                )}

                                <button
                                  onClick={() => handleEditTrigger(emp)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md transition-colors"
                                  title="แก้ไขทะเบียนประวัติพนักงาน"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => { setResetPwUser(emp); setResetPwValue(''); }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-md transition-colors"
                                  title="รีเซ็ทรหัสผ่านผู้ดูแลระบบ"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => handleSoftDelete(emp)}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    emp.deleted 
                                      ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400' 
                                      : 'text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/10'
                                  }`}
                                  title={emp.deleted ? 'กู้คืนพนักงานกลับระบบ' : 'ถอดถอนและย้ายพนักงานออกจากทำเนียบ'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Simple Department Manager Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <h2 className="text-md font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-indigo-500" />
                <span>สร้างแผนกการทำงานแยกงบการเงินพนักงาน (Corporate Departments)</span>
              </h2>

              <form onSubmit={handleAddDeptDirect} className="flex gap-2 max-w-xl">
                <input
                  type="text"
                  required
                  placeholder="ชื่อแผนกใหม่ เช่น ฝ่ายจัดซื้อและซัพพลายเชน (Procurement)"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  เพิ่มแผนก
                </button>
              </form>

              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">แผนกที่มีอยู่ในปัจจุบันทั้งหมด ({departments.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {departments.map(d => (
                    <span key={d.department_id} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-200/40 dark:border-slate-800">
                      🏢 {d.department_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER / EDIT FORM */}
        {activeTab === 'form' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-500" />
                <span>{selectedEmployee ? `แก้ไขรายละเอียดประวัติพนักงาน: ${name}` : 'ลงทะเบียนบัญชีประวัติพนักงานใหม่ (Onboard User Form)'}</span>
              </h2>
              {selectedEmployee && (
                <button
                  onClick={handleClearForm}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  ยกเลิกแก้ไข / ล้างฟอร์ม
                </button>
              )}
            </div>

            {successMsg && (
              <div className="mb-5 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 flex items-start gap-3 text-xs font-bold">
                <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                <p>{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="mb-5 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 rounded-xl border border-rose-200/50 dark:border-rose-900/50 flex items-start gap-3 text-xs font-bold">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleOnboardEmployee} className="space-y-6">
              
              {/* SECTION A: AUTH ACCOUNT DETAILS */}
              <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  <span>ข้อมูลบัญชีผู้ใช้งานและการเข้าใช้ระบบ (System Authentication)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  
                  {/* Photo picker & Crop */}
                  <div className="md:col-span-4 flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3 text-center">
                    <span className="text-[10px] font-bold text-slate-500">รูปภาพโปรไฟล์พนักงาน</span>
                    
                    <div className="relative">
                      <img 
                        src={profilePic || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'} 
                        alt="Preview Avatar" 
                        className="h-20 w-20 rounded-full object-cover border-2 border-indigo-100 dark:border-indigo-900"
                        referrerPolicy="no-referrer"
                      />
                      <label className="absolute bottom-0 right-0 h-6 w-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md text-xs">
                        +
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleProfilePicChange} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400">อัปโหลดภาพ หรือเลือกรูปพรีเซ็ตสำเร็จรูป:</p>
                      <div className="flex gap-1 justify-center pt-1">
                        {AVATAR_PRESETS.map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setProfilePic(preset.url)}
                            className="h-7 w-7 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-transform"
                            title={preset.label}
                          >
                            <img src={preset.url} alt="preset" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rest of Auth field forms */}
                  <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Username */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Username ล็อกอิน</label>
                        {usernameStatus === 'available' && <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded-full">พร้อมใช้!</span>}
                        {usernameStatus === 'taken' && <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1.5 rounded-full">ซ้ำ!</span>}
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold font-mono bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="เช่น Okay0007"
                        />
                        <button
                          type="button"
                          onClick={() => suggestNextUsername(employees)}
                          className="px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                          title="คำนวณรันเลขพนักงานถัดไปให้อัตโนมัติ"
                        >
                          รันเลข
                        </button>
                      </div>
                    </div>

                    {/* Employee ID */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">รหัสประจำตัวพนักงาน (ข้อมูลเดียวกับ Username)</label>
                        {empIdStatus === 'taken' && <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1.5 rounded-full">รหัสพนักงานซ้ำ!</span>}
                      </div>
                      <input
                        type="text"
                        required
                        readOnly
                        value={employeeId}
                        className="w-full px-3 py-2 text-xs font-semibold font-mono bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        placeholder="เช่น Okay000"
                      />
                    </div>

                    {/* Passwords */}
                    {!selectedEmployee && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">กำหนดรหัสผ่านเข้าใช้ระบบ</label>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ยืนยันรหัสผ่านเข้าใช้ระบบ</label>
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                      </>
                    )}

                    {/* Role / Level */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ระดับสิทธิ์ผู้อนุมัติ (Workflow Role)</label>
                      <select
                        value={approvalLevel}
                        onChange={e => setApprovalLevel(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="Level 1">Level 1: พนักงานทั่วไป (Staff)</option>
                        <option value="Level 2">Level 2: หัวหน้าทีม (Team Lead)</option>
                        <option value="Level 3">Level 3: ผู้จัดการ (Manager)</option>
                        <option value="Level 4">Level 4: ผู้อำนวยการ (Director)</option>
                        <option value="Finance">Finance: บัญชีและการเงิน (Finance)</option>
                        <option value="Administrator">Administrator: ผู้ดูแลสูงสุด (Admin)</option>
                      </select>
                    </div>

                    {/* Status Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">สถานะจ้างงาน ERP</label>
                      <select
                        value={employmentStatus}
                        onChange={e => setEmploymentStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                      >
                        <option value="active">🟢 พนักงานประจำ (Active)</option>
                        <option value="probation">🟡 ทดลองงาน (Probation)</option>
                        <option value="suspended">🔴 ระงับบัญชีชั่วคราว (Suspended)</option>
                        <option value="resigned">⚪ พ้นสภาพพนักงาน (Resigned)</option>
                      </select>
                    </div>

                  </div>
                </div>
              </div>

              {/* SECTION B: PERSONAL DETAILS */}
              <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>ข้อมูลประวัติส่วนบุคคล (Personal Information)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Title prefix */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">คำนำหน้า</label>
                    <select
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="ดร.">ดร.</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>

                  {/* First name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อจริง (ภาษาไทย)</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="เช่น สมศักดิ์"
                    />
                  </div>

                  {/* Last name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">นามสกุล (ภาษาไทย)</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="เช่น รักชาติ"
                    />
                  </div>

                  {/* Nickname */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อเล่น</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="เช่น บอย"
                    />
                  </div>

                  {/* National ID */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">เลขบัตรประจำตัวประชาชน</label>
                      {idCardStatus === 'valid' && <span className="text-[9px] text-emerald-600 font-bold">ถูกต้อง ✓</span>}
                      {idCardStatus === 'invalid' && <span className="text-[9px] text-rose-500 font-bold">ไม่ผ่าน ❌</span>}
                      {idCardStatus === 'taken' && <span className="text-[9px] text-rose-600 font-bold">เลขซ้ำ! ❌</span>}
                    </div>
                    <input
                      type="text"
                      required
                      value={idCard}
                      onChange={e => setIdCard(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold font-mono bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="เลข 13 หลัก เช่น 1200901234563"
                    />
                  </div>

                  {/* Birth date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">วันเดือนปีเกิด</label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {/* Age (Auto calculated) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">อายุพนักงาน (คำนวณอัตโนมัติ)</label>
                    <input
                      type="number"
                      readOnly
                      value={age}
                      className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 font-bold"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">เพศสภาพ</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="male">ชาย (Male)</option>
                      <option value="female">หญิง (Female)</option>
                      <option value="other">อื่นๆ (Other)</option>
                    </select>
                  </div>

                  {/* Mobile phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">เบอร์โทรศัพท์มือถือ</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="เช่น 081-234-5678"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">อีเมลองค์กร/อีเมลติดต่อ</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="เช่น employee@company.com"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ที่อยู่จดทะเบียนปัจจุบัน</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="ระบุเลขที่ ถนน ซอย แขวง เขต จังหวัด..."
                    />
                  </div>

                </div>
              </div>

              {/* SECTION C: EMPLOYMENT AND DEPARTMENT */}
              <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  <span>ข้อมูลการดำรงตำแหน่งและสังกัดแผนกงาน (Employment & Departments)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">วันที่เข้าทำงาน</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {/* Calculated Tenure */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">อายุงานสะสม (คำนวณอัตโนมัติ)</label>
                    <input
                      type="text"
                      readOnly
                      value={calculateWorkTenure(startDate)}
                      className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-800 dark:text-indigo-400 font-bold"
                    />
                  </div>

                  {/* Position */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ตำแหน่งงานพนักงาน (Position)</label>
                    <input
                      type="text"
                      required
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="เช่น Senior Finance Executive"
                    />
                  </div>

                  {/* Department selection */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">แผนกประจำสังกัด</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomDept(!isCustomDept)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      >
                        {isCustomDept ? 'เลือกสังกัดเดิม' : 'สร้างแผนกใหม่'}
                      </button>
                    </div>

                    {isCustomDept ? (
                      <input
                        type="text"
                        required
                        value={customDept}
                        onChange={e => setCustomDept(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        placeholder="พิมพ์ชื่อแผนกใหม่เพื่อแอดเข้าตาราง"
                      />
                    ) : (
                      <select
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                      >
                        {departments.map(d => (
                          <option key={d.department_id} value={d.department_name}>{d.department_name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                </div>
              </div>

              {/* SECTION D: FINANCIAL ACCOUNT AND BANKS */}
              <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  <span>ข้อมูลบัญชีโอนรับเงินเดือนและเงินชดเชย (Financial Banking details)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Name Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ธนาคารปลายทาง</label>
                    <select
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    >
                      {THAI_BANKS.map((bank, bIdx) => (
                        <option key={bIdx} value={bank}>{bank}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bank Account Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">เลขที่บัญชีธนาคาร (10-12 หลัก)</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={e => setBankAccount(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                      placeholder="เช่น 1234567890"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION E: EMERGENCY CONTACTS */}
              <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>ข้อมูลติดต่อผู้ประสานงานกรณีฉุกเฉิน (Emergency Contacts)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อผู้ติดต่อฉุกเฉิน (และความสัมพันธ์)</label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={e => setEmergencyContact(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      placeholder="เช่น นางพรศิริ รักชาติ (มารดา)"
                    />
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">เบอร์โทรศัพท์ผู้ติดต่อกรณีฉุกเฉิน</label>
                    <input
                      type="text"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                      placeholder="เช่น 089-999-9999"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION F: DIGITAL SIGNATURE */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <PenTool className="h-4 w-4" />
                  <span>ลายมือชื่อดิจิทัลรับรองการเบิกจ่าย (Digital Signature Authorization)</span>
                </h3>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      * ลายเซ็นจะถูกจัดเก็บเป็นรูปโปร่งใสความละเอียดสูง เพื่อพิมพ์สแตมป์รับทราบหนี้และเบิกจ่ายเงินทดรององค์กรโดยอัตโนมัติ
                    </p>
                    {signatureImage && (
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Eraser className="h-3.5 w-3.5" />
                        <span>ล้างลายเซ็น</span>
                      </button>
                    )}
                  </div>

                  <div className="relative bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl min-h-[140px] flex items-center justify-center overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[140px] cursor-crosshair touch-none"
                    />
                    {!signatureImage && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-center p-4">
                        <PenTool className="h-6 w-6 text-slate-300 mb-1 animate-pulse" />
                        <span className="text-[11px] font-bold">ใช้เมาส์หรือการทัชสกรีนวาดลายมือชื่อของคุณลงในกรอบนี้</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">ระบบจะจัดเก็บ Coordinates และค่าสัมพัทธ์เพื่อเป็น Master Data</span>
                      </div>
                    )}
                  </div>

                  {signatureImage && (
                    <div className="p-2.5 bg-slate-150/40 dark:bg-slate-800/30 rounded-lg flex items-center justify-between border border-slate-200/50 dark:border-slate-800/60">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ บันทึกภาพจำลองและถอดพิกัดทางกายภาพ {signaturePoints.length} จุด เรียบร้อย</span>
                      <div className="h-10 bg-white dark:bg-slate-950 px-2 rounded-md border border-slate-200 dark:border-slate-800 flex items-center shadow-xs">
                        <img src={signatureImage} alt="Signature Preview" className="h-8 object-contain" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="flex-1 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ล้างข้อมูลและยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>{selectedEmployee ? 'บันทึกการแก้ไขข้อมูลพนักงาน' : 'ยืนยันลงทะเบียนพนักงานและผูกบัญชี'}</span>
                </button>
              </div>

            </form>
          </div>
        )}

        {/* TAB 3: DATA IMPORT HUB */}
        {activeTab === 'import' && (
          <EmployeeImportTab 
            existingEmployees={employees}
            departments={departments}
            onImportSuccess={handleImportSuccess}
            onCancel={() => setActiveTab('list')}
          />
        )}

        {/* TAB 4: ENTERPRISE REPORTS */}
        {activeTab === 'report' && (
          <EmployeeReportTab 
            employees={employees}
            departments={departments}
            currentUser={currentUser}
          />
        )}

      </div>

      {/* Admin Reset Password Modal */}
      {resetPwUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <Lock className="h-6 w-6" />
              <h3 className="text-lg font-extrabold">รีเซ็ตรหัสผ่านโดยแอดมิน (Admin PW Reset)</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              คุณกำลังล้างรหัสผ่านให้กับคุณ <strong className="text-slate-800 dark:text-slate-200">{resetPwUser.name}</strong> ({resetPwUser.username}) รหัสใหม่นี้จะถูกบังคับให้เปลี่ยนในการเข้าใช้ระบบครั้งแรกเพื่อความปลอดภัย
            </p>

            {resetPwSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl">
                {resetPwSuccess}
              </div>
            )}

            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ระบุรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
                <input
                  type="text"
                  required
                  placeholder="ป้อนรหัสผ่านใหม่ เช่น Pass9988!"
                  value={resetPwValue}
                  onChange={e => setResetPwValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPwUser(null)}
                  className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold transition-all shadow-md shadow-green-500/20"
                >
                  ยืนยันรีเซ็ตรหัส
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
