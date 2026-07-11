import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add showProfileMenu state
state_pattern = r"const \[showNotifications, setShowNotifications\] = useState\(false\);"
state_repl = r"const [showNotifications, setShowNotifications] = useState(false);\n  const [showProfileMenu, setShowProfileMenu] = useState(false);"
content = re.sub(state_pattern, state_repl, content)

# 2. Add import for icons if needed (LogOut, Key, Palette, User, Check, Trash2, etc.)
icon_pattern = r"PlusCircle\n\} from 'lucide-react';"
icon_repl = r"PlusCircle,\n  LogOut,\n  Key,\n  Palette,\n  User,\n  Check\n} from 'lucide-react';"
content = re.sub(icon_pattern, icon_repl, content)

# 3. Replace the entire top right nav section starting from {/* Notifications */}
nav_pattern = r"\{\/\* Notifications \*\/\}.*?(?=\n\s*<\/div>\n\s*<\/header>)"
nav_repl = r"""{/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative"
                id="noti-btn"
              >
                <Bell className="h-4.5 w-4.5" />
                {(notifications.filter(n => !n.isRead).length > 0 || pendingApprovalsCount > 0) && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[9px] font-bold text-white border-2 border-white dark:border-slate-900">
                    {notifications.filter(n => !n.isRead).length + (pendingApprovalsCount > 0 ? 1 : 0)}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary-500" />
                      การแจ้งเตือน
                    </h3>
                    <button 
                      onClick={() => {
                        if (currentUser) markAllNotificationsAsRead(currentUser.user_id);
                        if (currentUser) setNotifications(getDbNotifications(currentUser.user_id));
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" /> อ่านทั้งหมด
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {pendingApprovalsCount > 0 && (
                      <div 
                        onClick={() => { setActiveTab('approvals'); setShowNotifications(false); }}
                        className="p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors bg-primary-50/30 dark:bg-primary-900/10"
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">มีคำขอรอการอนุมัติ</p>
                            <p className="text-xs text-slate-500 mt-1">คุณมี {pendingApprovalsCount} รายการที่รอการอนุมัติ</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {notifications.map(noti => (
                      <div 
                        key={noti.id}
                        onClick={() => {
                          markNotificationAsRead(noti.id);
                          if (currentUser) setNotifications(getDbNotifications(currentUser.user_id));
                          if (noti.linkToTab) setActiveTab(noti.linkToTab);
                          setShowNotifications(false);
                        }}
                        className={`p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${!noti.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 p-2 rounded-lg ${noti.type === 'approval' ? 'bg-emerald-100 text-emerald-600' : noti.type === 'advance' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'} dark:bg-opacity-20`}>
                            <Bell className="h-4 w-4" />
                          </div>
                          <div>
                            <p className={`text-sm ${!noti.isRead ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>{noti.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{noti.message}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{new Date(noti.createdAt).toLocaleString('th-TH')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && pendingApprovalsCount === 0 && (
                      <div className="p-8 text-center text-slate-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">ไม่มีการแจ้งเตือน</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <div 
                className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
              >
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{currentUser?.name}</p>
                  <p className="text-xs text-slate-500 leading-tight">{currentUser?.role || currentUser?.position}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800 shadow-sm overflow-hidden">
                  {/* Using standard URL check or fallback to initials */}
                  {currentUser?.signatureUrl && currentUser.signatureUrl.startsWith('http') && currentUser.signatureUrl.includes('avatar') ? (
                    <img src={currentUser.signatureUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    currentUser?.name.substring(0, 2)
                  )}
                </div>
              </div>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 md:hidden">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser?.role || currentUser?.position}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <User className="h-4 w-4 text-primary-500" />
                      ข้อมูลส่วนตัว (My Profile)
                    </button>
                    <button
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <Key className="h-4 w-4 text-amber-500" />
                      เปลี่ยนรหัสผ่าน
                    </button>
                    <button
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <Palette className="h-4 w-4 text-indigo-500" />
                      ตั้งค่าธีม (Theme Settings)
                    </button>
                  </div>
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setCurrentUser(null);
                        setActiveTab('dashboard');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      ออกจากระบบ (Logout)
                    </button>
                  </div>
                </div>
              )}
            </div>"""

content = re.sub(nav_pattern, nav_repl, content, flags=re.DOTALL)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
