import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GitBranch, 
  Plus, 
  Trash2, 
  Edit2, 
  ShieldCheck, 
  UserPlus, 
  X, 
  Save, 
  UserCheck, 
  ArrowRight,
  RefreshCw,
  Sliders,
  Layers,
  AlertCircle,
  Building,
  Phone,
  Mail,
  CreditCard,
  Lock,
  FileSpreadsheet
} from 'lucide-react';
import { UserProfile, ApprovalRule, CompanyMasterData, ReplacementPolicy } from '../types';
import { 
  getDbUsers, 
  saveDbUsers, 
  getDbRules, 
  saveDbRules,
  getDbCompanyData,
  saveDbCompanyData,
  addEnterpriseAuditLog,
  getDbDepartments,
  saveDbDepartments,
  getDbCategories,
  saveDbCategories,
  getDbExpenseTypes,
  saveDbExpenseTypes,
  getDbRoles,
  saveDbRoles,
  getDbReplacementPolicy,
  saveDbReplacementPolicy,
  calculateAge,
  validateThaiNationalID,
  hashPassword
} from '../data/db';
import { DEPARTMENTS } from '../data/masterData';
import { exportUsersToExcel } from '../utils/excelExport';

interface AdminConfigViewProps {
  onRefreshData?: () => void;
  currentUser?: UserProfile | null;
}

export default function AdminConfigView({ onRefreshData, currentUser }: AdminConfigViewProps) {
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'workflows' | 'company' | 'departments' | 'categories' | 'expenseTypes' | 'roles' | 'replacementPolicy'>('users');
  
  // Database States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  
  // Master Data States
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Replacement Receipt Policy States
  const [maxAmount, setMaxAmount] = useState<number>(2000);
  const [maxTimesPerMonth, setMaxTimesPerMonth] = useState<number>(5);
  const [allowedCats, setAllowedCats] = useState<string[]>([]);
  const [forbiddenCats, setForbiddenCats] = useState<string[]>([]);
  const [additionalApprovers, setAdditionalApprovers] = useState<string[]>([]);

  // Department CRUD states
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptHead, setDeptHead] = useState('');
  const [deptBudget, setDeptBudget] = useState<number>(100000);
  const [deptStatus, setDeptStatus] = useState<'active' | 'disabled'>('active');

  // Category CRUD states
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [catName, setCatName] = useState('');
  const [catLimit, setCatLimit] = useState<number>(10000);
  const [catRequiresReceipt, setCatRequiresReceipt] = useState<boolean>(true);
  const [catColor, setCatColor] = useState('bg-primary-100 text-primary-800');
  const [catIsActive, setCatIsActive] = useState<boolean>(true);
  const [catOrder, setCatOrder] = useState<number>(1);

  // ExpenseType CRUD states
  const [editingExpType, setEditingExpType] = useState<any | null>(null);
  const [expTypeName, setExpTypeName] = useState('');
  const [expTypeDesc, setExpTypeDesc] = useState('');
  const [expTypeIsActive, setExpTypeIsActive] = useState<boolean>(true);
  const [expTypeOrder, setExpTypeOrder] = useState<number>(1);

  // Role CRUD states
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState<string[]>(['create_request']);
  const [roleSequence, setRoleSequence] = useState<number>(1);

  // User Form States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({});
  const [adminFormErrors, setAdminFormErrors] = useState<Record<string, string>>({});
  
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uDepartment, setUDepartment] = useState(departments[0]?.department_name || "");
  const [uIsActive, setUIsActive] = useState(true);
  const [uLevel, setULevel] = useState('Level 1');
  const [uUsername, setUUsername] = useState('');
  const [uTitle, setUTitle] = useState('นาย');
  const [uFirstName, setUFirstName] = useState('');
  const [uLastName, setULastName] = useState('');
  const [uNickname, setUNickname] = useState('');
  const [uIdCard, setUIdCard] = useState('');
  const [uBirthDate, setUBirthDate] = useState('');
  const [uGender, setUGender] = useState('male');
  const [uPhone, setUPhone] = useState('');
  const [uAddress, setUAddress] = useState('');
  const [uProvince, setUProvince] = useState('กรุงเทพมหานคร');
  const [uElectricityRegion, setUElectricityRegion] = useState('สำนักงานใหญ่ (กฟผ.)');
  const [uStartDate, setUStartDate] = useState('');
  const [uEmploymentStatus, setUEmploymentStatus] = useState('active');
  const [uRole, setURole] = useState('Employee');
  const [uPosition, setUPosition] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('ALL');

  // Workflow Selection State
  const [selectedRequesterId, setSelectedRequesterId] = useState<string>('');
  const [newStepApproverId, setNewStepApproverId] = useState<string>('');

  // Company Profile States
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bankInfo, setBankInfo] = useState('');

  // Initial Load
  useEffect(() => {
    const loadedUsers = getDbUsers();
    const loadedRules = getDbRules();
    setUsers(loadedUsers);
    setRules(loadedRules);
    
    // Load Master Data
    setDepartments(getDbDepartments());
    setCategories(getDbCategories());
    setExpenseTypes(getDbExpenseTypes());
    setRoles(getDbRoles());

    // Load Company Master Data
    const compData = getDbCompanyData();
    setCompanyName(compData.companyName || '');
    setLogoUrl(compData.logoUrl || '');
    setAddress(compData.address || '');
    setTaxId(compData.taxId || '');
    setPhone(compData.phone || '');
    setEmail(compData.email || '');
    setBankInfo(compData.bankInfo || '');

    // Load Replacement Policy
    const rPolicy = getDbReplacementPolicy();
    setMaxAmount(rPolicy.maxAmount);
    setMaxTimesPerMonth(rPolicy.maxTimesPerMonth);
    setAllowedCats(rPolicy.allowedCategories || []);
    setForbiddenCats(rPolicy.forbiddenCategories || []);
    setAdditionalApprovers(rPolicy.additionalApprovers || []);
    
    // Default select the first non-admin user for workflow config
    const firstUser = loadedUsers.find(u => u.user_id !== 'user-admin');
    if (firstUser) {
      setSelectedRequesterId(firstUser.user_id);
    }
  }, []);

  const refreshState = () => {
    const loadedUsers = getDbUsers();
    const loadedRules = getDbRules();
    setUsers(loadedUsers);
    setRules(loadedRules);
    setDepartments(getDbDepartments());
    setCategories(getDbCategories());
    setExpenseTypes(getDbExpenseTypes());
    setRoles(getDbRoles());

    const rPolicy = getDbReplacementPolicy();
    setMaxAmount(rPolicy.maxAmount);
    setMaxTimesPerMonth(rPolicy.maxTimesPerMonth);
    setAllowedCats(rPolicy.allowedCategories || []);
    setForbiddenCats(rPolicy.forbiddenCategories || []);
    setAdditionalApprovers(rPolicy.additionalApprovers || []);

    if (onRefreshData) onRefreshData();
  };

  useEffect(() => {
    window.addEventListener('okey-sync', refreshState);
    return () => window.removeEventListener('okey-sync', refreshState);
  }, []);

  const handleSaveReplacementPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPolicy: ReplacementPolicy = {
      maxAmount: Number(maxAmount),
      maxTimesPerMonth: Number(maxTimesPerMonth),
      allowedCategories: allowedCats,
      forbiddenCategories: forbiddenCats,
      additionalApprovers: additionalApprovers
    };
    saveDbReplacementPolicy(updatedPolicy);
    addEnterpriseAuditLog(
      currentUser?.user_id || 'user-admin',
      currentUser?.name || 'Administrator',
      currentUser?.approval_level || 'Administrator',
      'Master_Change',
      'แก้ไขกฎนโยบายใบแทนใบเสร็จรับเงิน (Replacement Receipt Policy)'
    );
    alert('บันทึกข้อมูลนโยบายใบแทนใบเสร็จสำเร็จ!');
    refreshState();
  };

  // --- USER HANDLERS ---
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUName('');
    setUEmail('');
    setUPassword('password123');
    setUDepartment(departments[0]?.department_name || "");
    setUIsActive(true);
    setULevel('Level 1');
    setUUsername('');
    setUTitle('นาย');
    setUFirstName('');
    setULastName('');
    setUNickname('');
    setUIdCard('');
    setUBirthDate('');
    setUGender('male');
    setUPhone('');
    setUAddress('');
    setUProvince('กรุงเทพมหานคร');
    setUElectricityRegion('สำนักงานใหญ่ (กฟผ.)');
    setUStartDate('');
    setUEmploymentStatus('active');
    setURole('Employee');
    setUPosition('พนักงานทั่วไป');
    setUserFormErrors({});
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setUName(user.name || '');
    setUEmail(user.email || '');
    setUPassword(''); // leave empty on edit unless updated
    setUDepartment(user.department || '');
    setUIsActive(user.is_active ?? true);
    setULevel(user.approval_level || 'Level 1');
    setUUsername(user.username || '');
    setUTitle(user.title || 'นาย');
    setUFirstName(user.firstName || '');
    setULastName(user.lastName || '');
    setUNickname(user.nickname || '');
    setUIdCard(user.idCard || '');
    setUBirthDate(user.birthDate || '');
    setUGender(user.gender || 'male');
    setUPhone(user.phone || '');
    setUAddress(user.address || '');
    setUProvince(user.province || 'กรุงเทพมหานคร');
    setUElectricityRegion(user.electricityRegion || 'สำนักงานใหญ่ (กฟผ.)');
    setUStartDate(user.startDate || '');
    setUEmploymentStatus(user.employmentStatus || 'active');
    setURole(user.role || 'Employee');
    setUPosition(user.position || '');
    setUserFormErrors({});
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormErrors({});

    const errors: Record<string, string> = {};

    // Validate name parts
    if (!uFirstName.trim()) {
      errors.uFirstName = 'กรุณากรอกชื่อจริง';
    }
    if (!uLastName.trim()) {
      errors.uLastName = 'กรุณากรอกนามสกุล';
    }

    // Validate Username
    if (!uUsername.trim()) {
      errors.uUsername = 'กรุณากรอก Username';
    } else {
      const isUsernameTaken = users.some(u => 
        (u.username || '').toLowerCase() === uUsername.trim().toLowerCase() && 
        (!editingUser || u.user_id !== editingUser.user_id)
      );
      if (isUsernameTaken) {
        errors.uUsername = 'Username นี้ถูกใช้งานแล้วในระบบ';
      }
    }

    // Validate Email
    if (!uEmail.trim()) {
      errors.uEmail = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uEmail.trim())) {
      errors.uEmail = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    // Validate Password
    if (!editingUser) {
      if (!uPassword || uPassword.length < 6) {
        errors.uPassword = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      }
    } else if (uPassword && uPassword.length < 6) {
      errors.uPassword = 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    }

    // Validate National ID
    if (!uIdCard.trim()) {
      errors.uIdCard = 'กรุณากรอกเลขบัตรประชาชน';
    } else if (uIdCard.trim().length !== 13) {
      errors.uIdCard = 'เลขบัตรประชาชนต้องมี 13 หลัก';
    } else if (!validateThaiNationalID(uIdCard.trim())) {
      errors.uIdCard = 'เลขบัตรประชาชนไม่ถูกต้อง (Check Digit ผิดพลาด)';
    } else {
      const isIdCardTaken = users.some(u => 
        (u.idCard || '') === uIdCard.trim() && 
        (!editingUser || u.user_id !== editingUser.user_id)
      );
      if (isIdCardTaken) {
        errors.uIdCard = 'เลขบัตรประชาชนนี้ถูกใช้งานแล้วในระบบ';
      }
    }

    // Validate Phone
    if (!uPhone.trim()) {
      errors.uPhone = 'กรุณากรอกเบอร์โทรศัพท์';
    }

    // Validate Date of Birth & Start Date
    if (!uBirthDate) {
      errors.uBirthDate = 'กรุณาระบุวันเกิด';
    }
    if (!uStartDate) {
      errors.uStartDate = 'กรุณาระบุวันที่เริ่มงาน';
    }

    if (Object.keys(errors).length > 0) {
      setUserFormErrors(errors);
      
      const keyToId: Record<string, string> = {
        uFirstName: 'user-uFirstName',
        uLastName: 'user-uLastName',
        uUsername: 'user-uUsername',
        uEmail: 'user-uEmail',
        uPassword: 'user-uPassword',
        uIdCard: 'user-uIdCard',
        uPhone: 'user-uPhone',
        uBirthDate: 'user-uBirthDate',
        uStartDate: 'user-uStartDate'
      };
      
      const firstInvalidId = keyToId[Object.keys(errors)[0]];
      if (firstInvalidId) {
        const element = document.getElementById(firstInvalidId);
        if (element) {
          element.focus();
        }
      }
      return;
    }

    let updatedUsers = [...users];
    const computedName = `${uTitle}${uFirstName.trim()} ${uLastName.trim()}`;
    const computedAge = calculateAge(uBirthDate);

    if (editingUser) {
      // Edit mode
      updatedUsers = users.map(u => {
        if (u.user_id === editingUser.user_id) {
          const updated: UserProfile = {
            ...u,
            employee_id: uUsername.trim(),
            name: computedName,
            email: uEmail.trim(),
            department: uDepartment,
            is_active: uIsActive,
            approval_level: uLevel,
            username: uUsername.trim(),
            title: uTitle,
            firstName: uFirstName.trim(),
            lastName: uLastName.trim(),
            nickname: uNickname.trim(),
            idCard: uIdCard.trim(),
            birthDate: uBirthDate,
            age: computedAge,
            gender: uGender as any,
            phone: uPhone.trim(),
            address: uAddress.trim(),
            province: uProvince,
            electricityRegion: uElectricityRegion,
            startDate: uStartDate,
            employmentStatus: uEmploymentStatus as any,
            role: uRole as any,
            position: uPosition.trim() || 'พนักงาน (ทั่วไป)'
          };

          if (uPassword) {
            updated.password = hashPassword(uPassword);
          }

          return updated;
        }
        return u;
      });

      addEnterpriseAuditLog(
        currentUser?.user_id || 'user-admin',
        currentUser?.name || 'Administrator',
        currentUser?.approval_level || 'Administrator',
        'User_Change',
        `แก้ไขข้อมูลพนักงาน: ${computedName} (${uUsername.trim()}) แผนก ${uDepartment}`
      );
    } else {
      // Add mode
      const newId = `user-${Date.now()}`;
      const employeeIdCode = uUsername.trim();

      const newUser: UserProfile = {
        user_id: newId,
        employee_id: employeeIdCode,
        name: computedName,
        email: uEmail.trim(),
        password: hashPassword(uPassword),
        department: uDepartment,
        is_active: uIsActive,
        approval_level: uLevel,
        username: uUsername.trim(),
        title: uTitle,
        firstName: uFirstName.trim(),
        lastName: uLastName.trim(),
        nickname: uNickname.trim(),
        idCard: uIdCard.trim(),
        birthDate: uBirthDate,
        age: computedAge,
        gender: uGender as any,
        phone: uPhone.trim(),
        address: uAddress.trim(),
        province: uProvince,
        electricityRegion: uElectricityRegion,
        startDate: uStartDate,
        employmentStatus: uEmploymentStatus as any,
        role: uRole as any,
        position: uPosition.trim() || 'พนักงาน (ทั่วไป)',
        profilePictureUrl: uGender === 'female' 
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80' 
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
      };

      updatedUsers.push(newUser);

      addEnterpriseAuditLog(
        currentUser?.user_id || 'user-admin',
        currentUser?.name || 'Administrator',
        currentUser?.approval_level || 'Administrator',
        'Register',
        `เพิ่มพนักงานใหม่สำเร็จ: ${computedName} (${uUsername.trim()}) บทบาท: ${uRole}`
      );
    }

    saveDbUsers(updatedUsers);
    setIsUserModalOpen(false);
    refreshState();
  };

  const handleToggleUserStatus = (userId: string) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (userId === 'user-superadmin' || targetUser?.username === 'Okay9999' || userId === 'user-admin') {
      alert('ไม่สามารถปิดการใช้งานบัญชี Super Administrator หรือ Administrator หลักได้');
      return;
    }
    const updated = users.map(u => {
      if (u.user_id === userId) {
        return { ...u, is_active: !u.is_active };
      }
      return u;
    });
    saveDbUsers(updated);
    refreshState();
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (userId === 'user-superadmin' || targetUser?.username === 'Okay9999' || userId === 'user-admin') {
      alert('ไม่สามารถลบบัญชี Super Administrator หรือ Administrator หลักได้');
      return;
    }
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งานรายนี้? (กฎอนุมัติและประวัติที่เกี่ยวข้องจะยังคงอยู่แต่อาจทำงานผิดพลาด)')) {
      const updatedUsers = users.filter(u => u.user_id !== userId);
      // Clean up workflow rules associated with this user
      const updatedRules = rules.filter(r => r.requester_user_id !== userId && r.approver_user_id !== userId);
      saveDbUsers(updatedUsers);
      saveDbRules(updatedRules);
      refreshState();
    }
  };

  // --- WORKFLOW HANDLERS ---
  const activeChain = rules
    .filter(r => r.requester_user_id === selectedRequesterId)
    .sort((a, b) => a.level - b.level);

  const handleAddWorkflowStep = () => {
    if (!newStepApproverId) {
      alert('กรุณาเลือกผู้อนุมัติสำหรับขั้นตอนนี้');
      return;
    }

    if (newStepApproverId === selectedRequesterId) {
      alert('ผู้ใช้ไม่สามารถอนุมัติคำขอเบิกของตัวเองได้');
      return;
    }

    // Check if already in chain
    const alreadyExists = activeChain.some(r => r.approver_user_id === newStepApproverId);
    if (alreadyExists) {
      alert('ผู้อนุมัติรายนี้ถูกเพิ่มในลำดับขั้นตอนนี้แล้ว');
      return;
    }

    const nextLevel = activeChain.length + 1;
    const newRule: ApprovalRule = {
      rule_id: `rule-${Date.now()}`,
      requester_user_id: selectedRequesterId,
      approver_user_id: newStepApproverId,
      level: nextLevel,
      next_approver_id: null
    };

    // Update the previous rule's next_approver_id to point to this new step
    let updatedRules = [...rules];
    if (activeChain.length > 0) {
      const lastRule = activeChain[activeChain.length - 1];
      updatedRules = updatedRules.map(r => {
        if (r.rule_id === lastRule.rule_id) {
          return { ...r, next_approver_id: newStepApproverId };
        }
        return r;
      });
    }

    updatedRules.push(newRule);
    saveDbRules(updatedRules);
    setNewStepApproverId('');
    refreshState();
  };

  const handleRemoveStep = (ruleId: string, level: number) => {
    // Filter out the rule to remove
    let updatedRules = rules.filter(r => r.rule_id !== ruleId);

    // Re-index remaining rules for this requester
    const remainingForRequester = updatedRules
      .filter(r => r.requester_user_id === selectedRequesterId)
      .sort((a, b) => a.level - b.level);

    // Re-assign correct levels and link next_approver_ids
    const reindexedRulesForRequester = remainingForRequester.map((rule, index) => {
      const nextRule = remainingForRequester[index + 1];
      return {
        ...rule,
        level: index + 1,
        next_approver_id: nextRule ? nextRule.approver_user_id : null
      };
    });

    // Merge back
    const otherRules = updatedRules.filter(r => r.requester_user_id !== selectedRequesterId);
    updatedRules = [...otherRules, ...reindexedRulesForRequester];

    saveDbRules(updatedRules);
    refreshState();
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    const updatedRules = [...rules];
    
    // Find rules to swap
    const rule1 = activeChain[index];
    const rule2 = activeChain[index - 1];
    
    const globalRule1Index = updatedRules.findIndex(r => r.rule_id === rule1.rule_id);
    const globalRule2Index = updatedRules.findIndex(r => r.rule_id === rule2.rule_id);
    
    if (globalRule1Index !== -1 && globalRule2Index !== -1) {
      // Swap levels
      const tempLevel = updatedRules[globalRule1Index].level;
      updatedRules[globalRule1Index].level = updatedRules[globalRule2Index].level;
      updatedRules[globalRule2Index].level = tempLevel;
      
      // Save temporarily and let re-index logic handle link cleanups
      saveDbRules(updatedRules);
      
      // Trigger formal link cleanup
      const currentRules = getDbRules();
      const currentRequesterRules = currentRules
        .filter(r => r.requester_user_id === selectedRequesterId)
        .sort((a, b) => a.level - b.level);
        
      const cleaned = currentRequesterRules.map((rule, idx) => {
        const next = currentRequesterRules[idx + 1];
        return {
          ...rule,
          level: idx + 1,
          next_approver_id: next ? next.approver_user_id : null
        };
      });
      
      const merged = [
        ...currentRules.filter(r => r.requester_user_id !== selectedRequesterId),
        ...cleaned
      ];
      
      saveDbRules(merged);
      refreshState();
    }
  };

  const handleMoveStepDown = (index: number) => {
    if (index === activeChain.length - 1) return;
    handleMoveStepUp(index + 1);
  };

  const isAdmin = currentUser?.approval_level === 'Administrator';

  const handleSaveCompanyData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลบริษัท (ต้องการสิทธิ์ระดับ Administrator)');
      return;
    }

    if (!companyName.trim()) {
      alert('กรุณากรอกชื่อบริษัท');
      return;
    }

    const updatedData: CompanyMasterData = {
      companyName,
      logoUrl,
      address,
      taxId,
      phone,
      email,
      bankInfo
    };

    saveDbCompanyData(updatedData);

    // Save to Audit Log
    addEnterpriseAuditLog(
      currentUser?.name || 'ผู้ดูแลระบบ',
      'EDIT',
      'COMPANY_PROFILE',
      `แก้ไขข้อมูลบริษัท Master Data: ${companyName}`
    );

    alert('บันทึกข้อมูลบริษัทสำเร็จ และข้อมูลถูกนำไปใช้อัตโนมัติในทุกส่วนของระบบ');
    refreshState();
  };

  // --- NEW MASTER CRUD HANDLERS ---
  // Department Handlers
  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return alert('กรุณากรอกชื่อแผนก');
    let updated = [...departments];
    if (editingDept) {
      updated = departments.map(d => d.department_id === editingDept.department_id ? {
        ...d,
        department_name: deptName,
        head_of_department: deptHead,
        budget: Number(deptBudget),
        status: deptStatus
      } : d);
      addEnterpriseAuditLog(currentUser?.name || 'Admin', 'EDIT', 'DEPARTMENT', `แก้ไขแผนก: ${deptName}`);
    } else {
      const newId = `DEPT-${String(departments.length + 1).padStart(3, '0')}`;
      updated.push({
        department_id: newId,
        department_name: deptName,
        head_of_department: deptHead,
        budget: Number(deptBudget),
        status: deptStatus
      });
      addEnterpriseAuditLog(currentUser?.name || 'Admin', 'CREATE', 'DEPARTMENT', `เพิ่มแผนกใหม่: ${deptName}`);
    }
    saveDbDepartments(updated);
    setEditingDept(null);
    setDeptName('');
    setDeptHead('');
    setDeptBudget(100000);
    setDeptStatus('active');
    refreshState();
  };

  const handleDeleteDepartment = (deptId: string, name: string) => {
    if (!window.confirm(`ยืนยันการลบแผนก ${name}?`)) return;
    const updated = departments.filter(d => d.department_id !== deptId);
    saveDbDepartments(updated);
    addEnterpriseAuditLog(currentUser?.name || 'Admin', 'DELETE', 'DEPARTMENT', `ลบแผนก: ${name}`);
    refreshState();
  };

  // Category Handlers & Merging
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeDestId, setMergeDestId] = useState('');

  const handleMergeCategories = () => {
    if (!mergeSourceId || !mergeDestId) return alert('กรุณาเลือกทั้งหมวดหมู่ต้นทางและปลายทาง');
    if (mergeSourceId === mergeDestId) return alert('หมวดหมู่ต้นทางและปลายทางต้องไม่ซ้ำกัน');
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะควบรวมหมวดหมู่? รายการขอเบิกจ่ายทั้งหมดที่อยู่ในหมวดหมู่ต้นทางจะถูกย้ายไปยังหมวดหมู่ปลายทางโดยสมบูรณ์ และหมวดหมู่ต้นทางจะถูกลบออกจากระบบ')) return;

    const requests = JSON.parse(localStorage.getItem('okey_requests') || '[]');
    let updatedCount = 0;
    const updatedReqs = requests.map((r: any) => {
      if (r.category === mergeSourceId || r.category_id === mergeSourceId) {
        updatedCount++;
        return { ...r, category: mergeDestId, category_id: mergeDestId };
      }
      return r;
    });
    localStorage.setItem('okey_requests', JSON.stringify(updatedReqs));

    const updatedCats = categories.filter(c => c.id !== mergeSourceId);
    saveDbCategories(updatedCats);

    addEnterpriseAuditLog(
      currentUser?.name || 'Admin',
      'EDIT',
      'CATEGORY',
      `ควบรวมหมวดหมู่ค่าใช้จ่ายจาก ID: ${mergeSourceId} ไปยัง ID: ${mergeDestId} (ย้ายสำเร็จ ${updatedCount} รายการ)`
    );

    alert(`ควบรวมหมวดหมู่สำเร็จ ย้ายประวัติทั้งหมดจำนวน ${updatedCount} รายการเรียบร้อยแล้ว`);
    setMergeSourceId('');
    setMergeDestId('');
    refreshState();
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return alert('กรุณากรอกชื่อหมวดหมู่');
    let updated = [...categories];
    if (editingCat) {
      updated = categories.map(c => c.id === editingCat.id ? {
        ...c,
        name: catName,
        limitPerRequest: Number(catLimit),
        requiresReceipt: catRequiresReceipt,
        color: catColor,
        isActive: catIsActive,
        order: Number(catOrder)
      } : c);
      addEnterpriseAuditLog(currentUser?.name || 'Admin', 'EDIT', 'CATEGORY', `แก้ไขหมวดหมู่: ${catName}`);
    } else {
      const newId = catName.toLowerCase().replace(/\s+/g, '-');
      updated.push({
        id: newId,
        name: catName,
        limitPerRequest: Number(catLimit),
        requiresReceipt: catRequiresReceipt,
        color: catColor,
        isActive: catIsActive,
        order: Number(catOrder)
      });
      addEnterpriseAuditLog(currentUser?.name || 'Admin', 'CREATE', 'CATEGORY', `เพิ่มหมวดหมู่ใหม่: ${catName}`);
    }
    saveDbCategories(updated);
    setEditingCat(null);
    setCatName('');
    setCatLimit(10000);
    setCatRequiresReceipt(true);
    setCatColor('bg-primary-100 text-primary-800');
    setCatIsActive(true);
    setCatOrder(categories.length + 1);
    refreshState();
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (!window.confirm(`ยืนยันการลบหมวดหมู่ ${name}?`)) return;
    const updated = categories.filter(c => c.id !== id);
    saveDbCategories(updated);
    addEnterpriseAuditLog(currentUser?.name || 'Admin', 'DELETE', 'CATEGORY', `ลบหมวดหมู่: ${name}`);
    refreshState();
  };

  // ExpenseType Handlers
  const handleSaveExpenseType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTypeName.trim()) return alert('กรุณากรอกชื่อประเภทการเบิกจ่าย');
    let updated = [...expenseTypes];
    if (editingExpType) {
      updated = expenseTypes.map(t => t.id === editingExpType.id ? {
        ...t,
        name: expTypeName,
        description: expTypeDesc,
        isActive: expTypeIsActive,
        order: Number(expTypeOrder)
      } : t);
      addEnterpriseAuditLog(currentUser?.name || 'Admin', 'EDIT', 'EXPENSE_TYPE', `แก้ไขประเภทเบิก: ${expTypeName}`);
    } else {
      const newId = expTypeName.toLowerCase().replace(/\s+/g, '-');
      updated.push({
        id: newId,
        name: expTypeName,
        description: expTypeDesc,
        isActive: expTypeIsActive,
        order: Number(expTypeOrder)
      });
      addEnterpriseAuditLog(currentUser?.name || 'Admin', 'CREATE', 'EXPENSE_TYPE', `เพิ่มประเภทเบิกใหม่: ${expTypeName}`);
    }
    saveDbExpenseTypes(updated);
    setEditingExpType(null);
    setExpTypeName('');
    setExpTypeDesc('');
    setExpTypeIsActive(true);
    setExpTypeOrder(expenseTypes.length + 1);
    refreshState();
  };

  const handleDeleteExpenseType = (id: string, name: string) => {
    if (!window.confirm(`ยืนยันการลบประเภทเบิกจ่าย ${name}?`)) return;
    const updated = expenseTypes.filter(t => t.id !== id);
    saveDbExpenseTypes(updated);
    addEnterpriseAuditLog(currentUser?.name || 'Admin', 'DELETE', 'EXPENSE_TYPE', `ลบประเภทเบิก: ${name}`);
    refreshState();
  };

  // Role Handlers
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleId.trim() || !roleName.trim()) return alert('กรุณากรอก ID และชื่อบทบาท');
    let updated = [...roles];
    if (editingRole) {
      updated = roles.map(r => r.role_id === editingRole.role_id ? {
        ...r,
        role_name: roleName,
        permissions: rolePermissions,
        approval_sequence: Number(roleSequence)
      } : r);
      addEnterpriseAuditLog(currentUser?.name || 'Admin', 'EDIT', 'ROLE', `แก้ไขบทบาท: ${roleName}`);
    } else {
      updated.push({
        role_id: roleId,
        role_name: roleName,
        permissions: rolePermissions,
        approval_sequence: Number(roleSequence)
      });
      addEnterpriseAuditLog(currentUser?.name || 'Admin', 'CREATE', 'ROLE', `เพิ่มบทบาทใหม่: ${roleName}`);
    }
    saveDbRoles(updated);
    setEditingRole(null);
    setRoleId('');
    setRoleName('');
    setRolePermissions(['create_request']);
    setRoleSequence(roles.length + 1);
    refreshState();
  };

  const handleDeleteRole = (id: string, name: string) => {
    if (id === 'role-admin') return alert('ไม่สามารถลบบทบาท Administrator หลักได้');
    if (!window.confirm(`ยืนยันการลบสิทธิ์บทบาท ${name}?`)) return;
    const updated = roles.filter(r => r.role_id !== id);
    saveDbRoles(updated);
    addEnterpriseAuditLog(currentUser?.name || 'Admin', 'DELETE', 'ROLE', `ลบสิทธิ์บทบาท: ${name}`);
    refreshState();
  };

  const selectedRequester = users.find(u => u.user_id === selectedRequesterId);

  return (
    <div className="space-y-6" id="admin-config-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <span>ตั้งค่าผู้ใช้ & Workflow อนุมัติ (Admin Panel)</span>
          </h2>
          <p className="text-sm text-slate-500">
            ระบบจัดสรรสายงานผู้ใช้งานและเส้นทางการอนุมัติเบิกจ่ายแบบไร้ขีดจำกัด (No Hardcoded Roles)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={refreshState}
            className="p-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-1.5 transition-all"
            title="รีเฟรชฐานข้อมูล"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>ซิงค์ข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Nav */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'users'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>จัดการผู้ใช้ในระบบ (Users DB)</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-semibold text-slate-500 dark:text-slate-400">
            {users.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('workflows')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'workflows'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <GitBranch className="h-4 w-4" />
          <span>ตั้งค่าสายงานอนุมัติ (Approval Chain rules)</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-semibold text-slate-500 dark:text-slate-400">
            {rules.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('company')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'company'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>ข้อมูลบริษัท (Company Profile)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('departments')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'departments'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>🏢</span>
          <span>แผนก & งบประมาณ</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-semibold text-slate-500 dark:text-slate-400">
            {departments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'categories'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>📁</span>
          <span>หมวดหมู่ค่าใช้จ่าย</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-semibold text-slate-500 dark:text-slate-400">
            {categories.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('expenseTypes')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'expenseTypes'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>📄</span>
          <span>ประเภทเบิกจ่าย</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-semibold text-slate-500 dark:text-slate-400">
            {expenseTypes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'roles'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>🔑</span>
          <span>บทบาท & สิทธิ์ (Roles)</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-semibold text-slate-500 dark:text-slate-400">
            {roles.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('replacementPolicy')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'replacementPolicy'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>📋</span>
          <span>นโยบายใบแทนใบเสร็จ</span>
        </button>
      </div>

      {/* TAB 1: USERS DATABASE */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="text-xs text-slate-500 max-w-lg">
              <span className="font-bold text-slate-700 dark:text-slate-300">ตารางข้อมูลผู้ใช้ (Users Table):</span> เพิ่มข้อมูลพนักงาน, กำหนดระดับผู้อนุมัติ (Level 1-10) และสถานะ โดยที่ไม่มีการผูกโครงสร้างแบบ Fix Code
            </div>
            <div className="flex gap-2">
              <button
                id="admin-export-users-btn"
                onClick={async () => {
                  try {
                    await exportUsersToExcel(
                      users,
                      departments,
                      'ทะเบียนรายชื่อบุคลากรและโครงสร้างแผนกบริษัท (Corporate Staff Directory)',
                      currentUser?.name || 'พนักงานองค์กร'
                    );
                  } catch (err) {
                    console.error('Error exporting users:', err);
                  }
                }}
                className="px-4 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-md shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <FileSpreadsheet className="h-4 w-4 text-black stroke-[3]" />
                <span>Export to Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleOpenAddUser}
                className="px-4 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-md shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4 text-black stroke-[3]" />
                <span>เพิ่มผู้ใช้งานใหม่</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="ค้นหาชื่อ, Username, อีเมล, เลขบัตรประชาชน, ตำแหน่ง..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <select
                value={userDeptFilter}
                onChange={(e) => setUserDeptFilter(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="ALL">แผนกทั้งหมด (All Departments)</option>
                {departments.map(dept => (
                  <option key={dept.department_name} value={dept.department_name}>{dept.department_name}</option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-end font-semibold">
              แสดงผลพนักงาน {
                users.filter(u => {
                  const matchesSearch = 
                    (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.idCard || '').includes(userSearch) ||
                    (u.position || '').toLowerCase().includes(userSearch.toLowerCase());
                  const matchesDept = userDeptFilter === 'ALL' || u.department === userDeptFilter;
                  return matchesSearch && matchesDept;
                }).length
              } จาก {users.length} คน
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 font-bold">รหัสผู้ใช้ / Username</th>
                  <th className="p-4 font-bold">ชื่อ-นามสกุล / ตำแหน่ง</th>
                  <th className="p-4 font-bold">เลขบัตรฯ / เบอร์โทร</th>
                  <th className="p-4 font-bold">แผนก</th>
                  <th className="p-4 font-bold">ระดับเบื้องต้น</th>
                  <th className="p-4 font-bold">สถานะ</th>
                  <th className="p-4 font-bold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users
                  .filter(u => {
                    const matchesSearch = 
                      (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                      (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                      (u.idCard || '').includes(userSearch) ||
                      (u.position || '').toLowerCase().includes(userSearch.toLowerCase());
                    const matchesDept = userDeptFilter === 'ALL' || u.department === userDeptFilter;
                    return matchesSearch && matchesDept;
                  })
                  .map((u) => (
                    <tr key={u.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <td className="p-4">
                        <div className="font-mono text-slate-400 text-[10px] font-semibold">{u.user_id}</div>
                        <div className="font-mono text-primary-600 dark:text-primary-400 text-xs font-bold mt-0.5">@{u.username || 'n/a'}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5 font-medium">{u.position || 'พนักงานทั่วไป'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{u.idCard || 'ไม่มีเลขบัตร'}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{u.phone || 'ไม่มีเบอร์โทร'}</div>
                      </td>
                      <td className="p-4 font-medium">{u.department}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-semibold text-[11px]">
                          {u.approval_level || 'General Employee'}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.username === 'Okay9999' || u.user_id === 'user-admin' ? (
                          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            ระบบหลัก (System)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleUserStatus(u.user_id)}
                            className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                              u.is_active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {u.is_active ? 'Active (ใช้งาน)' : 'Inactive (ปิดตัว)'}
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg inline-block transition-all"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {u.username !== 'Okay9999' && u.user_id !== 'user-admin' ? (
                          <button
                            onClick={() => handleDeleteUser(u.user_id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg inline-block transition-all"
                            title="ลบพนักงาน"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span 
                            className="p-1.5 text-slate-300 dark:text-slate-700 inline-block"
                            title="สิทธิ์ระดับสูงสุด ไม่สามารถลบได้"
                          >
                            <Trash2 className="h-3.5 w-3.5 opacity-40 cursor-not-allowed" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: WORKFLOWS CONFIGURATION */}
      {activeSubTab === 'workflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: select requester and summary */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
                <span>1. เลือกผู้ส่งคำขอเบิกเงิน</span>
              </h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">พนักงานผู้เบิกจ่าย:</label>
                <select
                  value={selectedRequesterId}
                  onChange={(e) => setSelectedRequesterId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">-- กรุณาเลือกพนักงาน --</option>
                  {users
                    .filter(u => u.user_id !== 'user-admin')
                    .map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.name} ({u.department})
                      </option>
                    ))}
                </select>
              </div>

              {selectedRequester && (
                <div className="p-3.5 bg-primary-50/50 dark:bg-primary-950/10 border border-primary-100/40 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-primary-700 dark:text-primary-300">{selectedRequester.name}</div>
                  <div className="text-slate-500">แผนก: {selectedRequester.department}</div>
                  <div className="text-slate-500">ระดับ: {selectedRequester.approval_level || 'General User'}</div>
                  <div className="text-[11px] text-slate-400 italic pt-1.5 border-t border-slate-100 dark:border-slate-800/50">
                    เมื่อส่งคำขอเบิกเงิน ระบบจะดึงสายอนุมัติด้านขวาขึ้นมาทำงานโดยอัตโนมัติแบบเรียลไทม์
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: build actual approval chain */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    2. ออกแบบ Approval Chain (ลำดับการอนุมัติ)
                  </h3>
                  <p className="text-xs text-slate-400">
                    กำหนดลำดับขั้นการพิจารณาเบิกจ่ายเป็นขั้นๆ (Level 1, 2, 3...) ไหลไปเรื่อยๆ จนจบการอนุมัติ
                  </p>
                </div>

                {selectedRequesterId && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={newStepApproverId}
                      onChange={(e) => setNewStepApproverId(e.target.value)}
                      className="p-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-transparent rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">+ เลือกผู้อนุมัติถัดไป</option>
                      {users
                        .filter(u => u.user_id !== selectedRequesterId && u.is_active)
                        .map(u => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.name} ({u.department})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={handleAddWorkflowStep}
                      className="px-3 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl flex items-center gap-1 shrink-0 transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="h-3.5 w-3.5 text-black stroke-[3]" />
                      <span>เพิ่มขั้น</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Visualization of the Chain */}
              {!selectedRequesterId ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <AlertCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <span>กรุณาเลือกพนักงานผู้ส่งคำขอทางฝั่งซ้าย เพื่อเริ่มออกแบบสายอนุมัติ</span>
                </div>
              ) : activeChain.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <GitBranch className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">ยังไม่มีสายอนุมัติสำหรับผู้ใช้รายนี้</p>
                  <p className="text-[11px] text-slate-400">เมื่อผู้ใช้รายนี้เบิกเงิน จะผ่านการอนุมัติทันทีโดยไม่ต้องตรวจเอกสาร</p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Step List container */}
                  <div className="relative pl-4 space-y-4 border-l-2 border-dashed border-primary-100 dark:border-primary-900/50">
                    {activeChain.map((rule, idx) => {
                      const approver = users.find(u => u.user_id === rule.approver_user_id);
                      const isLast = idx === activeChain.length - 1;
                      
                      return (
                        <div key={rule.rule_id} className="relative flex items-start gap-4">
                          {/* Dot Badge */}
                          <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-[9px] border-2 border-white dark:border-slate-900">
                            {idx + 1}
                          </div>

                          {/* Detail Card */}
                          <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary-600 dark:text-primary-400">
                                ระดับผู้อนุมัติ {idx + 1} (Level {idx + 1})
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {approver ? approver.name : `ผู้อนุมัติลบไปแล้ว (${rule.approver_user_id})`}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                แผนก: {approver?.department || 'ไม่พบ'} | อีเมล: {approver?.email}
                              </p>
                            </div>

                            {/* Move & delete actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveStepUp(idx)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 text-xs"
                                title="เลื่อนลำดับขึ้น"
                              >
                                ▲
                              </button>
                              <button
                                disabled={isLast}
                                onClick={() => handleMoveStepDown(idx)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 text-xs"
                                title="เลื่อนลำดับลง"
                              >
                                ▼
                              </button>
                              <button
                                onClick={() => handleRemoveStep(rule.rule_id, rule.level)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                                title="ลบขั้นตอนนี้ออก"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Final Approved Indicator */}
                    <div className="relative flex items-center gap-4">
                      <div className="absolute -left-[27px] w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px] border-2 border-white dark:border-slate-900 shadow-sm shadow-emerald-500/10">
                        ✓
                      </div>
                      <div className="flex-1 bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100/30">
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span>Final Approved & Auto-Paid 💸</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">เมื่อขั้นตอนทั้งหมดเซ็นอนุมัติ ระบบจะปรับสถานะเป็น อนุมัติผ่านการจ่ายบิล ทันที</p>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* TAB 3: COMPANY PROFILE MASTER DATA */}
      {activeSubTab === 'company' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="company-profile-tab-view">
          {/* Left panel: Master Data Edit Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    <span>ข้อมูลหลักบริษัท (Company Master Data)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ข้อมูลส่วนกลางนี้จะถูกดึงไปประกอบเอกสาร ใบเบิก ใบสำคัญจ่าย และรายงานต่าง ๆ อัตโนมัติ
                  </p>
                </div>
                {!isAdmin && (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read-Only Mode
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveCompanyData} className="space-y-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">ชื่อบริษัท (ไทย/อังกฤษ) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ป้อนชื่อเต็มของบริษัท เช่น บริษัท โอเค เอ็กซ์เพนส์ แมเนจเมนท์ จำกัด"
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Company Logo Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">อัปโหลดโลโก้บริษัท (Company Logo Upload) <span className="text-rose-500">*</span></label>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="shrink-0 h-14 w-14 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center relative">
                      {logoUrl ? (
                        <img src={logoUrl} className="h-full w-full object-cover" alt="Company Logo" referrerPolicy="no-referrer" />
                      ) : (
                        <Building className="h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="logo-upload-input"
                        disabled={!isAdmin}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => document.getElementById('logo-upload-input')?.click()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 text-xs font-bold rounded-lg transition-all border border-slate-200 dark:border-slate-650 cursor-pointer"
                      >
                        {logoUrl ? 'เปลี่ยนรูปโลโก้' : 'เลือกไฟล์โลโก้'}
                      </button>
                      <p className="text-[9px] text-slate-400">แนะนำรูปจัตุรัส ขนาดสูงสุด 2MB (ไฟล์รูปจะถูกใช้งานในรายงานและ PDF ทั้งหมด)</p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">ที่อยู่สำนักงานใหญ่ <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    disabled={!isAdmin}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ระบุที่อยู่จัดส่งใบกำกับภาษี หรือจัดตั้งบริษัท..."
                    className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 text-slate-900 dark:text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tax ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 block">เลขประจำตัวผู้เสียภาษี (Tax ID) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      disabled={!isAdmin}
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="เช่น 0-1055-66000-11-2"
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 block">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      disabled={!isAdmin}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="เช่น 02-123-4567"
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 block">อีเมลบริษัท / แผนกการเงิน <span className="text-rose-500">*</span></label>
                    <input
                      type="email"
                      required
                      disabled={!isAdmin}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="เช่น finance@company.com"
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Bank Account */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 block">ข้อมูลบัญชีธนาคารส่วนกลาง <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      disabled={!isAdmin}
                      value={bankInfo}
                      onChange={(e) => setBankInfo(e.target.value)}
                      placeholder="เช่น ธนาคารกสิกรไทย สาขา... บัญชีเลขที่..."
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Save Button */}
                {isAdmin && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-3 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-md shadow-green-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Save className="h-4 w-4 text-black stroke-[3]" />
                      <span>บันทึกและซิงค์ข้อมูลกลาง</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Right panel: Live Document Letterhead Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📄</span> ตัวอย่างหัวจดหมายทางการ (Live Official Preview)
              </h4>
              
              {/* Paper Preview */}
              <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xs border border-slate-150 space-y-6 font-sans">
                {/* Header */}
                <div className="flex gap-3 pb-4 border-b border-slate-900">
                  {logoUrl ? (
                    <img src={logoUrl} className="h-10 w-10 rounded-lg object-cover bg-slate-50 border" alt="Logo" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                      LOGO
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h5 className="text-[11px] font-black uppercase text-slate-900 truncate">
                      {companyName || 'ป้อนชื่อบริษัท'}
                    </h5>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      {address || 'ป้อนที่อยู่บริษัท'}
                    </p>
                    <div className="text-[8px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-2 mt-1">
                      <span><strong>TAX ID:</strong> {taxId || '-'}</span>
                      <span><strong>TEL:</strong> {phone || '-'}</span>
                      <span><strong>EMAIL:</strong> {email || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Sim Body */}
                <div className="space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded-sm w-1/3"></div>
                  <div className="space-y-1.5">
                    <div className="h-2 bg-slate-50 rounded-sm"></div>
                    <div className="h-2 bg-slate-50 rounded-sm w-5/6"></div>
                    <div className="h-2 bg-slate-50 rounded-sm w-2/3"></div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="p-3 bg-stone-50 border border-stone-200/60 rounded-lg space-y-1 text-[9px] text-stone-700">
                  <p className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-100">
                    <CreditCard className="w-3 h-3 text-slate-500" /> ข้อมูลธนาคารเพื่อการตั้งโอนจ่ายเงินสด:
                  </p>
                  <p className="font-mono bg-white dark:bg-slate-900 p-1 rounded border border-stone-100 whitespace-pre-wrap break-all">{bankInfo || 'ยังไม่ได้ระบุบัญชีธนาคาร'}</p>
                </div>

                <div className="flex justify-between items-center text-[8px] text-slate-400">
                  <span>เอกสารฉบับร่างแสดงผลแบบเรียลไทม์</span>
                  <span>ตราประทับได้รับการรับรอง</span>
                </div>
              </div>

              {/* Log History info */}
              <div className="p-4 bg-primary-50/50 dark:bg-primary-950/10 border border-primary-100/30 rounded-xl text-xs space-y-2 text-primary-800 dark:text-primary-300">
                <p className="font-bold">🔒 ระเบียบรักษาความปลอดภัย Master Data:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>เฉพาะบัญชีที่มีตำแหน่ง <strong className="text-primary-700 dark:text-primary-300 font-bold">Administrator</strong> เท่านั้นที่สามารถกดบันทึกได้</li>
                  <li>เมื่อมีการแก้ไขใดๆ ระบบจะทำการบันทึกลงใน Audit Trail ประวัติกลางของบริษัท</li>
                  <li>ข้อมูลเหล่านี้เชื่อมต่อกับเอกสารใบเบิกเงิน, ใบสำคัญจ่ายเงินล่วงหน้า, ใบเบิกคืน และ ERP ledger ทันที</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEPARTMENTS MASTER DATA */}
      {activeSubTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Panel: Add/Edit Form */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 border-b pb-2">
              <span>{editingDept ? '📝 แก้ไขข้อมูลแผนก' : '➕ เพิ่มแผนกใหม่'}</span>
            </h3>
            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ชื่อแผนก (ภาษาไทย/อังกฤษ) *</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="เช่น IT Development / ฝ่ายขาย"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">หัวหน้าแผนก (Head of Dept) *</label>
                <input
                  type="text"
                  required
                  value={deptHead}
                  onChange={(e) => setDeptHead(e.target.value)}
                  placeholder="ชื่อหัวหน้าแผนกรับผิดชอบอนุมัติ"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">งบประมาณประจำปีที่ได้รับจัดสรร (฿) *</label>
                <input
                  type="number"
                  required
                  value={deptBudget}
                  onChange={(e) => setDeptBudget(Number(e.target.value))}
                  placeholder="เช่น 500000"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">สถานะแผนก</label>
                <select
                  value={deptStatus}
                  onChange={(e) => setDeptStatus(e.target.value as 'active' | 'disabled')}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                >
                  <option value="active">เปิดใช้งาน (Active)</option>
                  <option value="disabled">ระงับชั่วคราว (Disabled)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                {editingDept && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDept(null);
                      setDeptName('');
                      setDeptHead('');
                      setDeptBudget(100000);
                      setDeptStatus('active');
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  บันทึกแผนก
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel: List */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">ตารางแผนก Master Data (Departments)</h3>
              <button
                id="admin-export-depts-btn"
                onClick={async () => {
                  try {
                    await exportUsersToExcel(
                      users,
                      departments,
                      'ทะเบียนรายชื่อบุคลากรและโครงสร้างแผนกบริษัท (Corporate Staff Directory)',
                      currentUser?.name || 'พนักงานองค์กร'
                    );
                  } catch (err) {
                    console.error('Error exporting departments:', err);
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all animate-pulse"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export Depts (.xlsx)</span>
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                    <th className="p-3 font-bold">รหัสแผนก</th>
                    <th className="p-3 font-bold">ชื่อแผนก</th>
                    <th className="p-3 font-bold">หัวหน้าแผนก</th>
                    <th className="p-3 font-bold">งบประมาณประจำ</th>
                    <th className="p-3 font-bold">สถานะ</th>
                    <th className="p-3 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {departments.map((d: any) => (
                    <tr key={d.department_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-3 font-mono font-semibold text-slate-400">{d.department_id}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{d.department_name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{d.head_of_department}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">฿{(d.budget || 0).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          d.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                        }`}>
                          {d.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDept(d);
                            setDeptName(d.department_name);
                            setDeptHead(d.head_of_department);
                            setDeptBudget(d.budget);
                            setDeptStatus(d.status);
                          }}
                          className="p-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                          title="แก้ไขแผนก"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(d.department_id, d.department_name)}
                          className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                          title="ลบแผนก"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXPENSE CATEGORIES MASTER DATA */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Panel: Category Merge Tool and Edit Form */}
          <div className="lg:col-span-4 space-y-6">
            {/* Merge Tool */}
            <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">🔀 เครื่องมือควบรวมหมวดหมู่ (Category Merger)</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  ใช้กรณีต้องการย้ายประวัติการทำรายการขอเบิกจ่ายจากหมวดหมู่หนึ่งไปสวมเข้ากับอีกหมวดหมู่หนึ่ง เพื่อจัดระเบียบฐานข้อมูลกลางแบบ Dynamic
                </p>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">1. หมวดหมู่ต้นทาง (จะถูกลบออก) *</label>
                  <select
                    value={mergeSourceId}
                    onChange={(e) => setMergeSourceId(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="">-- เลือกต้นทาง --</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">2. หมวดหมู่ปลายทาง (จะควบรวมเข้า) *</label>
                  <select
                    value={mergeDestId}
                    onChange={(e) => setMergeDestId(e.target.value)}
                    className="w-full text-xs p-2 bg-white dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="">-- เลือกปลายทาง --</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleMergeCategories}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  เริ่มควบรวมหมวดหมู่ค่าใช้จ่าย
                </button>
              </div>
            </div>

            {/* Standard Edit Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b pb-2">
                <span>{editingCat ? '📝 แก้ไขหมวดหมู่' : '➕ เพิ่มหมวดหมู่ใหม่'}</span>
              </h3>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ชื่อหมวดหมู่ค่าใช้จ่าย *</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="เช่น ค่าเดินทางและพาหนะ / ค่าซ่อมบำรุง"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">จำกัดวงเงินเบิกต่อครั้งสูงสุด (฿) *</label>
                  <input
                    type="number"
                    required
                    value={catLimit}
                    onChange={(e) => setCatLimit(Number(e.target.value))}
                    placeholder="เช่น 15000"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ลำดับความสำคัญ *</label>
                    <input
                      type="number"
                      required
                      value={catOrder}
                      onChange={(e) => setCatOrder(Number(e.target.value))}
                      placeholder="เช่น 1"
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">สกินการแสดงสี</label>
                    <select
                      value={catColor}
                      onChange={(e) => setCatColor(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    >
                      <option value="bg-primary-100 text-primary-800">สีน้ำเงิน</option>
                      <option value="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">สีส้มอมทอง</option>
                      <option value="bg-purple-100 text-purple-800">สีม่วง</option>
                      <option value="bg-emerald-100 text-emerald-800">สีเขียวมรกต</option>
                      <option value="bg-pink-100 text-pink-800">สีชมพู</option>
                      <option value="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">สีเทา</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catRequiresReceipt}
                      onChange={(e) => setCatRequiresReceipt(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-slate-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 animate-none"></div>
                    <span className="ml-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">บังคับใช้รูปบิลแนบ</span>
                  </label>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catIsActive}
                      onChange={(e) => setCatIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-slate-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 animate-none"></div>
                    <span className="ml-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">เปิดใช้งาน (Active)</span>
                  </label>
                </div>

                <div className="pt-2 flex gap-2">
                  {editingCat && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCat(null);
                        setCatName('');
                        setCatLimit(10000);
                        setCatRequiresReceipt(true);
                        setCatColor('bg-primary-100 text-primary-800');
                        setCatIsActive(true);
                        setCatOrder(categories.length + 1);
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    บันทึกหมวดหมู่
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel: List */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">ตารางหมวดหมู่ Master Data (Expense Categories)</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                    <th className="p-3 font-bold">ลำดับ</th>
                    <th className="p-3 font-bold">หมวดหมู่ ID</th>
                    <th className="p-3 font-bold">ชื่อหมวดหมู่</th>
                    <th className="p-3 font-bold">จำกัดวงเงินสูงสุด</th>
                    <th className="p-3 font-bold">เอกสารแนบ</th>
                    <th className="p-3 font-bold">สถานะ</th>
                    <th className="p-3 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {categories
                    .sort((a, b) => a.order - b.order)
                    .map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-3 font-bold text-slate-400">{c.order}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">{c.id}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-md text-[11px] font-extrabold ${c.color || 'bg-primary-100 text-primary-800'}`}>
                            {c.name}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">฿{(c.limitPerRequest || 0).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${
                            c.requiresReceipt ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {c.requiresReceipt ? 'ต้องมีบิลแนบ' : 'ไม่ต้องมีบิลแนบ'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {c.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCat(c);
                              setCatName(c.name);
                              setCatLimit(c.limitPerRequest);
                              setCatRequiresReceipt(c.requiresReceipt);
                              setCatColor(c.color || 'bg-primary-100 text-primary-800');
                              setCatIsActive(c.isActive);
                              setCatOrder(c.order || 1);
                            }}
                            className="p-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                            title="แก้ไขหมวดหมู่"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id, c.name)}
                            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                            title="ลบหมวดหมู่"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: EXPENSE TYPES MASTER DATA */}
      {activeSubTab === 'expenseTypes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Panel: Add/Edit Form */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b pb-2">
              <span>{editingExpType ? '📝 แก้ไขประเภทเบิกจ่าย' : '➕ เพิ่มประเภทเบิกจ่ายใหม่'}</span>
            </h3>
            <form onSubmit={handleSaveExpenseType} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ชื่อประเภทการเบิกจ่าย *</label>
                <input
                  type="text"
                  required
                  value={expTypeName}
                  onChange={(e) => setExpTypeName(e.target.value)}
                  placeholder="เช่น ใบเบิกเงินสดย่อย / ใบเบิกสัญญาลดหย่อน"
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">คำอธิบายความรับผิดชอบ *</label>
                <textarea
                  required
                  rows={3}
                  value={expTypeDesc}
                  onChange={(e) => setExpTypeDesc(e.target.value)}
                  placeholder="ป้อนวัตถุประสงค์ในการขอใช้เอกสารประเภทนี้..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ลำดับความสำคัญ *</label>
                  <input
                    type="number"
                    required
                    value={expTypeOrder}
                    onChange={(e) => setExpTypeOrder(Number(e.target.value))}
                    placeholder="เช่น 1"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">สถานะเอกสาร</label>
                  <div className="flex items-center h-10">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={expTypeIsActive}
                        onChange={(e) => setExpTypeIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-slate-300 dark:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 animate-none"></div>
                      <span className="ml-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                {editingExpType && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingExpType(null);
                      setExpTypeName('');
                      setExpTypeDesc('');
                      setExpTypeIsActive(true);
                      setExpTypeOrder(expenseTypes.length + 1);
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  บันทึกประเภท
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel: List */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">ตารางเอกสาร Master Data (Expense Request Types)</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                    <th className="p-3 font-bold">ลำดับ</th>
                    <th className="p-3 font-bold">รหัสเอกสาร</th>
                    <th className="p-3 font-bold">ชื่อเอกสาร</th>
                    <th className="p-3 font-bold">รายละเอียดคำอธิบายสิทธิ์</th>
                    <th className="p-3 font-bold">สถานะ</th>
                    <th className="p-3 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenseTypes
                    .sort((a, b) => a.order - b.order)
                    .map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-3 font-bold text-slate-400">{t.order}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">{t.id}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{t.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 leading-normal">{t.description}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {t.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpType(t);
                              setExpTypeName(t.name);
                              setExpTypeDesc(t.description);
                              setExpTypeIsActive(t.isActive);
                              setExpTypeOrder(t.order);
                            }}
                            className="p-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpenseType(t.id, t.name)}
                            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ROLES MASTER DATA */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Panel: Add/Edit Form */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b pb-2">
              <span>{editingRole ? '🔑 แก้ไขข้อมูลบทบาท' : '➕ เพิ่มบทบาทใหม่'}</span>
            </h3>
            {!isAdmin ? (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>ท่านไม่ได้รับอนุญาตให้เพิ่มหรือแก้ไขสิทธิ์บทบาท (สิทธิ์เฉพาะระดับ Administrator)</span>
              </div>
            ) : (
              <form onSubmit={handleSaveRole} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">รหัสบทบาท (Role ID) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRole}
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    placeholder="เช่น role-vp"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl disabled:bg-slate-100 disabled:text-slate-400 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ชื่อสิทธิ์ตำแหน่งบทบาท (Role Name) *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="เช่น Sales VP / Area Lead"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ลำดับสายอนุมัติ (Sequence Level) *</label>
                  <input
                    type="number"
                    required
                    value={roleSequence}
                    onChange={(e) => setRoleSequence(Number(e.target.value))}
                    placeholder="เช่น 1, 2, 3... (5 คือสูงสุด)"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">การมอบสิทธิ์เข้าถึง (Permissions) *</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['create_request', 'read', 'approve', 'audit', 'all'].map(perm => (
                      <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rolePermissions.includes(perm)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRolePermissions([...rolePermissions, perm]);
                            } else {
                              setRolePermissions(rolePermissions.filter(p => p !== perm));
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-600 text-primary-600 dark:text-primary-400 focus:ring-primary-500"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  {editingRole && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRole(null);
                        setRoleId('');
                        setRoleName('');
                        setRolePermissions(['create_request']);
                        setRoleSequence(roles.length + 1);
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl transition-all shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    บันทึกบทบาทสิทธิ์
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Panel: List */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">ตารางบทบาท Master Data (Roles)</h3>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                    <th className="p-3 font-bold">ลำดับสาย</th>
                    <th className="p-3 font-bold">Role ID</th>
                    <th className="p-3 font-bold">ชื่อบทบาท</th>
                    <th className="p-3 font-bold">ขอบเขตสิทธิ์</th>
                    <th className="p-3 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {roles
                    .sort((a, b) => b.approval_sequence - a.approval_sequence)
                    .map((r: any) => (
                      <tr key={r.role_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-3 font-bold text-primary-600 dark:text-primary-400">Sequence #{r.approval_sequence}</td>
                        <td className="p-3 font-mono font-semibold text-slate-400">{r.role_id}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{r.role_name}</td>
                        <td className="p-3 flex flex-wrap gap-1 items-center">
                          {r.permissions.map((p: string) => (
                            <span key={p} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-sm font-mono text-[10px]">
                              {p}
                            </span>
                          ))}
                        </td>
                        <td className="p-3 text-right">
                          {isAdmin && (
                            <div className="space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRole(r);
                                  setRoleId(r.role_id);
                                  setRoleName(r.role_name);
                                  setRolePermissions(r.permissions);
                                  setRoleSequence(r.approval_sequence);
                                }}
                                className="p-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                                title="แก้ไข"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(r.role_id, r.role_name)}
                                className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                                title="ลบ"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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
      )}

      {/* TAB 8: REPLACEMENT RECEIPT POLICY */}
      {activeSubTab === 'replacementPolicy' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📋 นโยบายการใช้ใบแทนใบเสร็จรับเงิน (Replacement Receipt Policy)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              กำหนดเงื่อนไขและขีดจำกัดความเสี่ยงสำหรับกรณีเบิกจ่ายค่าใช้จ่ายที่ไม่มีใบเสร็จ (No-Receipt Scenarios) เพื่อความปลอดภัยและการอนุมัติที่รัดกุม
            </p>
          </div>

          <form onSubmit={handleSaveReplacementPolicy} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Limits & Thresholds */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <span>💰 ขีดจำกัดและวงเงินควบคุม</span>
                </h4>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    วงเงินสูงสุดที่อนุญาตให้ใช้ใบแทนใบเสร็จต่อรายการ (฿) *
                  </label>
                  <input
                    type="number"
                    required
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(Number(e.target.value))}
                    placeholder="เช่น 2000"
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">รายการเบิกที่เกินวงเงินนี้จะถูกคัดกรองว่า "ผิดนโยบาย" หรือต้องส่งให้ผู้บริหารอนุมัติเป็นกรณีพิเศษ</p>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    จำนวนครั้งสูงสุดที่พนักงานแต่ละคนใช้ได้ต่อเดือน (ครั้ง) *
                  </label>
                  <input
                    type="number"
                    required
                    value={maxTimesPerMonth}
                    onChange={(e) => setMaxTimesPerMonth(Number(e.target.value))}
                    placeholder="เช่น 5"
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-1 focus:ring-primary-500 font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">ป้องกันการใช้ใบแทนใบเสร็จซ้ำซ้อนผิดปกติและพฤติกรรมสุ่มเสี่ยง</p>
                </div>
              </div>

              {/* Box 2: Additional Approvers */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <span>👤 ผู้อนุมัติร่วมเพิ่มเติม (Additional Approvers)</span>
                </h4>
                <p className="text-[10px] text-slate-500">
                  เลือกผู้ใช้งานที่จะถูกเพิ่มเข้าสู่เส้นทางการอนุมัติโดยอัตโนมัติเมื่อพนักงานยื่น "ใบแทนใบเสร็จ"
                </p>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {users.filter(u => u.user_id !== 'user-admin').map(u => {
                    const isChecked = additionalApprovers.includes(u.user_id);
                    return (
                      <label key={u.user_id} className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 cursor-pointer text-xs font-medium hover:bg-slate-50 transition-all">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setAdditionalApprovers(additionalApprovers.filter(id => id !== u.user_id));
                            } else {
                              setAdditionalApprovers([...additionalApprovers, u.user_id]);
                            }
                          }}
                          className="rounded text-primary-650 h-3.5 w-3.5"
                        />
                        <div className="text-left col-span-3">
                          <p className="font-bold text-slate-850 dark:text-slate-200">{u.name}</p>
                          <p className="text-[10px] text-slate-450">{u.position} | {u.department}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Box 3: Allowed / Forbidden Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Allowed */}
              <div className="p-5 bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100/40 dark:border-emerald-900/10 rounded-2xl space-y-3">
                <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                  <span>🟢 หมวดหมู่ค่าใช้จ่ายที่ "อนุญาต" ให้ใช้</span>
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  หมวดหมู่ที่จะผ่านนโยบายโดยปกติหากจำนวนเงินไม่เกินขีดจำกัด
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.map(cat => {
                    const isSelected = allowedCats.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          if (isSelected) {
                            setAllowedCats(allowedCats.filter(id => id !== cat.id));
                          } else {
                            setAllowedCats([...allowedCats, cat.id]);
                            // Remove from forbidden if added here
                            setForbiddenCats(forbiddenCats.filter(id => id !== cat.id));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400 font-extrabold shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-400'
                        }`}
                      >
                        {cat.name} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Forbidden */}
              <div className="p-5 bg-rose-50/20 dark:bg-rose-950/5 border border-rose-100/40 dark:border-rose-900/10 rounded-2xl space-y-3">
                <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1">
                  <span>🔴 หมวดหมู่ค่าใช้จ่ายที่ "ห้ามใช้" ใบแทนใบเสร็จ</span>
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  หมวดหมู่ที่มีความเสี่ยงสูง ระบบจะจัดหมวดหมู่กลุ่มนี้เป็น "ผิดนโยบาย" ทันทีหากพยายามยื่นใบแทนใบเสร็จ
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.map(cat => {
                    const isSelected = forbiddenCats.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          if (isSelected) {
                            setForbiddenCats(forbiddenCats.filter(id => id !== cat.id));
                          } else {
                            setForbiddenCats([...forbiddenCats, cat.id]);
                            // Remove from allowed if added here
                            setAllowedCats(allowedCats.filter(id => id !== cat.id));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-rose-100 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 font-extrabold shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-400'
                        }`}
                      >
                        {cat.name} {isSelected && '✕'}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Submit Bar */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                className="px-6 py-2.5 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black rounded-xl text-xs font-extrabold shadow-md shadow-green-500/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Save className="h-4 w-4 text-black stroke-[3]" />
                <span>บันทึกระเบียบใบแทนใบเสร็จ (Save Policy)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL FOR ADD/EDIT USER */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-primary-600 dark:text-primary-400" />
                <span>{editingUser ? `แก้ไขข้อมูลพนักงาน: ${uName}` : 'เพิ่มพนักงานใหม่ในระบบ'}</span>
              </h3>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-300 rounded-lg transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* COLUMN 1: PERSONAL INFORMATION */}
                <div className="space-y-4">
                  <h4 className="font-bold text-primary-600 dark:text-primary-400 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wider">
                    ประวัติและข้อมูลส่วนตัว (Personal Profile)
                  </h4>
                  
                  {/* Name Fields: Title, Firstname, Lastname */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">คำนำหน้า <span className="text-rose-500">*</span></label>
                      <select
                        value={uTitle}
                        onChange={(e) => setUTitle(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                      >
                        <option value="นาย">นาย</option>
                        <option value="นางสาว">นางสาว</option>
                        <option value="นาง">นาง</option>
                      </select>
                    </div>
                    
                    <div className="col-span-4 space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">ชื่อจริง <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        id="user-uFirstName"
                        value={uFirstName}
                        onChange={(e) => setUFirstName(e.target.value)}
                        placeholder="เช่น สมชาย"
                        className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-hidden ${
                          userFormErrors.uFirstName ? 'border-rose-500 text-rose-950' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>

                    <div className="col-span-5 space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">นามสกุล <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        id="user-uLastName"
                        value={uLastName}
                        onChange={(e) => setULastName(e.target.value)}
                        placeholder="เช่น รักดี"
                        className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-hidden ${
                          userFormErrors.uLastName ? 'border-rose-500 text-rose-950' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Nickname & Gender */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">ชื่อเล่น</label>
                      <input
                        type="text"
                        value={uNickname}
                        onChange={(e) => setUNickname(e.target.value)}
                        placeholder="เช่น ชาย"
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">เพศ <span className="text-rose-500">*</span></label>
                      <div className="flex gap-4 pt-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                          <input
                            type="radio"
                            name="uGender"
                            value="male"
                            checked={uGender === 'male'}
                            onChange={() => setUGender('male')}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <span>ชาย</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                          <input
                            type="radio"
                            name="uGender"
                            value="female"
                            checked={uGender === 'female'}
                            onChange={() => setUGender('female')}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <span>หญิง</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ID Card (13 Digits) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">เลขบัตรประจำตัวประชาชน (13 หลัก) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      maxLength={13}
                      required
                      id="user-uIdCard"
                      value={uIdCard}
                      onChange={(e) => setUIdCard(e.target.value.replace(/\D/g, ''))}
                      placeholder="เช่น 1200901234563"
                      className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-hidden font-mono ${
                        userFormErrors.uIdCard ? 'border-rose-500 text-rose-950' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {userFormErrors.uIdCard && (
                      <p className="text-rose-500 text-[10px] font-bold">⚠️ {userFormErrors.uIdCard}</p>
                    )}
                  </div>

                  {/* Date of Birth & Automatic Age */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">วันเดือนปีเกิด <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        required
                        id="user-uBirthDate"
                        value={uBirthDate}
                        onChange={(e) => setUBirthDate(e.target.value)}
                        className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-hidden ${
                          userFormErrors.uBirthDate ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">อายุ (คำนวณอัตโนมัติ)</label>
                      <div className="w-full text-xs p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 font-mono font-bold">
                        {uBirthDate ? `${calculateAge(uBirthDate)} ปี` : 'ระบุวันเกิดด้านซ้าย'}
                      </div>
                    </div>
                  </div>

                  {/* Address & Province */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">ที่อยู่ตามทะเบียนบ้าน/ปัจจุบัน</label>
                    <textarea
                      rows={2}
                      value={uAddress}
                      onChange={(e) => setUAddress(e.target.value)}
                      placeholder="บ้านเลขที่, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ"
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">จังหวัด</label>
                    <select
                      value={uProvince}
                      onChange={(e) => setUProvince(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                    >
                      {['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'นครปฐม', 'สมุทรสาคร', 'เชียงใหม่', 'ขอนแก่น', 'ชลบุรี', 'นครราชสีมา', 'ภูเก็ต', 'สงขลา', 'ระยอง', 'ประจวบคีรีขันธ์'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* COLUMN 2: LOGIN & ORGANIZATIONAL DETAILS */}
                <div className="space-y-4">
                  <h4 className="font-bold text-primary-600 dark:text-primary-400 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wider">
                    สิทธิ์และข้อมูลองค์กร (Account & HR Config)
                  </h4>

                  {/* Username & Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Username เข้าสู่ระบบ <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        disabled={editingUser?.username === 'Okay9999'}
                        id="user-uUsername"
                        value={uUsername}
                        onChange={(e) => setUUsername(e.target.value)}
                        placeholder="เช่น SomchaiIT"
                        className={`w-full text-xs p-2 border rounded-xl focus:outline-hidden ${
                          editingUser?.username === 'Okay9999'
                            ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-50 dark:bg-slate-800'
                        } ${
                          userFormErrors.uUsername ? 'border-rose-500 text-rose-950' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                      {userFormErrors.uUsername && (
                        <p className="text-rose-500 text-[10px] font-bold">⚠️ {userFormErrors.uUsername}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        id="user-uPhone"
                        value={uPhone}
                        onChange={(e) => setUPhone(e.target.value)}
                        placeholder="เช่น 081-111-1111"
                        className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-hidden ${
                          userFormErrors.uPhone ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Email & Password */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">อีเมลพนักงาน <span className="text-rose-500">*</span></label>
                      <input
                        type="email"
                        required
                        id="user-uEmail"
                        value={uEmail}
                        onChange={(e) => setUEmail(e.target.value)}
                        placeholder="เช่น user@okey.com"
                        className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-hidden ${
                          userFormErrors.uEmail ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                      {userFormErrors.uEmail && (
                        <p className="text-rose-500 text-[10px] font-bold">⚠️ {userFormErrors.uEmail}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">
                        {editingUser ? 'เปลี่ยนรหัสผ่าน (ปล่อยว่างเพื่อไม่แก้)' : 'รหัสผ่านแรกเริ่ม *'}
                      </label>
                      <input
                        type="password"
                        id="user-uPassword"
                        value={uPassword}
                        onChange={(e) => setUPassword(e.target.value)}
                        placeholder={editingUser ? 'รหัสผ่านใหม่ (>= 6 ตัว)' : 'รหัสผ่าน (>= 6 ตัว)'}
                        className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-hidden ${
                          userFormErrors.uPassword ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                      {userFormErrors.uPassword && (
                        <p className="text-rose-500 text-[10px] font-bold">⚠️ {userFormErrors.uPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Department & Position */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">แผนกสังกัด <span className="text-rose-500">*</span></label>
                      <select
                        value={uDepartment}
                        onChange={(e) => setUDepartment(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                      >
                        {departments.map(dept => (
                          <option key={dept.department_name} value={dept.department_name}>{dept.department_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">ตำแหน่งงาน</label>
                      <input
                        type="text"
                        value={uPosition}
                        onChange={(e) => setUPosition(e.target.value)}
                        placeholder="เช่น HR Assistant Manager"
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Electricity Region & Start Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">เขตการไฟฟ้าที่รับผิดชอบ</label>
                      <select
                        value={uElectricityRegion}
                        onChange={(e) => setUElectricityRegion(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                      >
                        {['สำนักงานใหญ่ (กฟผ.)', 'ภาคเหนือ (กฟน.1)', 'ภาคเหนือ (กฟน.2)', 'ภาคกลาง (กฟก.1)', 'ภาคกลาง (กฟก.2)', 'ภาคตะวันออกเฉียงเหนือ (กฟอ.1)', 'ภาคตะวันออกเฉียงเหนือ (กฟอ.2)', 'ภาคใต้ (กฟต.1)', 'ภาคใต้ (กฟต.2)'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">วันที่เริ่มงาน <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        required
                        id="user-uStartDate"
                        value={uStartDate}
                        onChange={(e) => setUStartDate(e.target.value)}
                        className={`w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-hidden ${
                          userFormErrors.uStartDate ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* System Role, Approval Level & Employment Status */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">ระดับผู้อนุมัติ</label>
                      <select
                        value={uLevel}
                        disabled={editingUser?.username === 'Okay9999'}
                        onChange={(e) => setULevel(e.target.value)}
                        className={`w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none ${editingUser?.username === 'Okay9999' ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800'}`}
                      >
                        <option value="Staff">ทั่วไป (Staff)</option>
                        <option value="Level 1">ระดับ 1 (Level 1)</option>
                        <option value="Level 2">ระดับ 2 (Level 2)</option>
                        <option value="Level 3">ระดับ 3 (Level 3)</option>
                        <option value="Level 4">ระดับ 4 (Level 4)</option>
                        <option value="Level 5">ระดับ 5 (Level 5)</option>
                        <option value="Level 6">ระดับ 6 (Level 6)</option>
                        <option value="Level 7">ระดับ 7 (Level 7)</option>
                        <option value="Level 8">ระดับ 8 (Level 8)</option>
                        <option value="Level 9">ระดับ 9 (Level 9)</option>
                        <option value="Level 10">ระดับ 10 (Level 10)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">สิทธิ์ในระบบ (Role)</label>
                      <select
                        value={uRole}
                        disabled={editingUser?.username === 'Okay9999'}
                        onChange={(e) => setURole(e.target.value)}
                        className={`w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold text-primary-600 dark:text-primary-400 ${editingUser?.username === 'Okay9999' ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800'}`}
                      >
                        <option value="Employee">Employee (ทั่วไป)</option>
                        <option value="Manager">Manager (ผู้จัดการ)</option>
                        <option value="Finance">Finance (บัญชีการเงิน)</option>
                        <option value="HR">HR (ฝ่ายบุคคล)</option>
                        <option value="Administrator">Administrator (ผู้ดูแลระบบ)</option>
                        <option value="Executive">Executive (ผู้บริหาร)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">สถานะพนักงาน</label>
                      <select
                        value={uEmploymentStatus}
                        disabled={editingUser?.username === 'Okay9999'}
                        onChange={(e) => setUEmploymentStatus(e.target.value)}
                        className={`w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none ${editingUser?.username === 'Okay9999' ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800'}`}
                      >
                        <option value="active">ทำงานปกติ (Active)</option>
                        <option value="probation">ทดลองงาน (Probation)</option>
                        <option value="suspended">พักงาน (Suspended)</option>
                        <option value="resigned">ลาออก/สิ้นสุด (Resigned)</option>
                      </select>
                    </div>
                  </div>

                  {/* Status Toggle (Active in system) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">สิทธิ์ล็อกอินเข้าระบบ</label>
                    <div className="flex items-center h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3">
                      <label className={`relative inline-flex items-center ${editingUser?.username === 'Okay9999' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={editingUser?.username === 'Okay9999'}
                          checked={uIsActive}
                          onChange={(e) => setUIsActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                        <span className="ml-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {uIsActive ? 'อนุญาตเข้าใช้งาน (Active)' : 'ระงับการเข้าสู่ระบบ (Inactive)'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-400 hover:bg-green-300 active:bg-green-500 text-black text-xs font-extrabold rounded-xl flex items-center gap-1 shadow-md shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Save className="h-4 w-4 text-black stroke-[3]" />
                  <span>บันทึกข้อมูลพนักงาน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
