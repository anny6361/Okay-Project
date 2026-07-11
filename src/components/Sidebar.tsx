import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  History, 
  ShieldAlert, 
  BarChart3, 
  Menu, 
  X,
  Sparkles,
  Wallet,
  Sliders,
  UserPlus,
  BookOpen,
  FileDown,
  LogOut,
  User,
  Image as ImageIcon,
  ShieldCheck,
  Database
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount: number;
  pendingPayoutsCount?: number;
  currentUser: UserProfile | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, pendingApprovalsCount, pendingPayoutsCount = 0, currentUser, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const isAdmin = currentUser?.approval_level === 'Administrator';

  const menuItems = [
    { id: 'dashboard', label: 'หน้าแรก / ภาพรวม', icon: LayoutDashboard, badge: pendingPayoutsCount > 0 ? pendingPayoutsCount : undefined },
    { id: 'profile', label: 'ข้อมูลส่วนตัวพนักงาน', icon: User },
    { id: 'onboarding', label: 'ลงทะเบียนพนักงาน (Setup)', icon: UserPlus, adminOnly: true },
    { id: 'my-requests', label: 'รายการเบิกเงินของฉัน', icon: FileText },
    { id: 'gallery', label: 'คลังเอกสาร (Gallery)', icon: ImageIcon },
    { 
      id: 'approval', 
      label: 'กล่องอนุมัติเบิกจ่าย', 
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined 
    },
    { id: 'accounting', label: 'ผ่านรายการบัญชี (ERP)', icon: BookOpen, permission: (u: any) => u?.approval_level === 'Administrator' || u?.approval_level === 'Level 4' || u?.approval_level === 'Level 3' || u?.approval_level === 'Level 2' },
    { id: 'pdf-hub', label: 'ระบบสร้างเอกสาร PDF', icon: FileDown },
    { id: 'history', label: 'รายงานคำขอทั้งหมด', icon: History },
    { id: 'analytics', label: 'วิเคราะห์งบประมาณ', icon: BarChart3, adminOnly: true },
    { id: 'policy', label: 'นโยบายการเบิกจ่าย', icon: ShieldAlert, adminOnly: true },
    { id: 'admin-panel', label: 'สิทธิ์ & สายอนุมัติ (Admin)', icon: Sliders, adminOnly: true },
    { id: 'audit', label: 'บันทึกระบบ (Audit Log)', icon: ShieldCheck, adminOnly: true },
    { 
      id: 'backup-restore', 
      label: 'สำรองและกู้คืน (Backup)', 
      icon: Database, 
      permission: (u: any) => u?.approval_level === 'Administrator' || u?.role === 'Executive' || u?.approval_level === 'Executive' 
    },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (item.permission) return item.permission(currentUser);
    return true;
  });

  // Initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'OK';
    const split = name.trim().split(' ');
    if (split.length >= 2) {
      return (split[0].substring(0, 1) + split[1].substring(0, 1)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-600 rounded-lg text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">OKAY Expense</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-300"
          id="mobile-menu-btn"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar Component */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 lg:flex
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col py-6">
          {/* Logo */}
          <div className="px-6 mb-8 hidden lg:flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-xl text-white shadow-lg shadow-primary-900/30">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg tracking-tight font-['Times_New_Roman']">OKAY Expense</h1>
              <p className="text-xs text-slate-400 font-medium">Enterprise Management</p>
            </div>
          </div>

          {/* Quick User Status */}
          <div 
            onClick={() => { setActiveTab('profile'); setIsOpen(false); }}
            className="mx-4 mb-6 p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
              {currentUser?.signatureUrl && currentUser.signatureUrl.startsWith('http') && currentUser.signatureUrl.includes('avatar') ? (
                <img src={currentUser.signatureUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                getInitials(currentUser?.name)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.name || 'กำลังโหลด...'}</p>
              <p className="text-xs text-slate-400 truncate">
                {currentUser?.approval_level || 'พนักงาน'} | {(currentUser?.department || '').split(' ')[0]}
              </p>
            </div>
          </div>


          {/* Navigation Menu */}
          <nav className="px-3 space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-tab-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/10' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-slate-900 dark:text-white rounded-full h-[20px] inline-flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          
          {/* Logout Action Button */}
          <div className="px-3 mt-4">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>ออกจากระบบ (Log Out)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Enterprise Mode Active</span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-300">เวอร์ชันระบบ 2.4.0 (ภาษาไทย)</p>
        </div>
      </aside>
    </>
  );
}
