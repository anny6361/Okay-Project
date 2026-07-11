import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports for NotificationMessage and getDbNotifications
import_pattern = r"import \{\n  getDbUsers,"
import_replacement = r"import {\n  NotificationMessage,\n} from './types';\nimport {\n  getDbUsers,\n  getDbNotifications,\n  markNotificationAsRead,\n  markAllNotificationsAsRead,"
content = re.sub(import_pattern, import_replacement, content, count=1)

# Add states
state_pattern = r"const \[isDarkMode, setIsDarkMode\] = useState\(false\);"
state_replacement = r"""const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState(localStorage.getItem('okey_accent') || 'blue');
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
"""
content = re.sub(state_pattern, state_replacement, content, count=1)

# Load notifications
effect_pattern = r"// Initialize DB if empty\n    const dbUsers = getDbUsers\(\);"
effect_replacement = r"""// Initialize DB if empty
    const dbUsers = getDbUsers();
    
    // Load notifications for current user
    if (dbUsers.length > 0) {
       // Since we don't have current user id here, we'll load later when currentUser changes
    }
"""
content = re.sub(effect_pattern, effect_replacement, content, count=1)

# Load notifications on user change
effect2_pattern = r"if \(dbUsers\.length > 0\) \{\n      setCurrentUser\(dbUsers\[0\]\);\n    \}"
effect2_replacement = r"""if (dbUsers.length > 0) {
      const user = dbUsers[0];
      setCurrentUser(user);
    }"""
content = re.sub(effect2_pattern, effect2_replacement, content, count=1)

# Add effect to load notifications
effect_add = r"// Load data effect\n  useEffect\(\(\) => \{"
effect_add_repl = r"""useEffect(() => {
    if (currentUser) {
      setNotifications(getDbNotifications(currentUser.id));
    }
  }, [currentUser]);

  // Load data effect
  useEffect(() => {"""
content = re.sub(effect_add, effect_add_repl, content, count=1)

# Notification logic
bell_pattern = r"\{/\* Notifications \*/\}.*?(?=\{/\* Settings \*/\})"
bell_replacement = r"""{/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
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
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-800 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white">การแจ้งเตือน</h3>
                    <button 
                      onClick={() => {
                        if (currentUser) markAllNotificationsAsRead(currentUser.id);
                        if (currentUser) setNotifications(getDbNotifications(currentUser.id));
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      อ่านทั้งหมด
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {pendingApprovalsCount > 0 && (
                      <div 
                        onClick={() => { setActiveTab('approvals'); setShowNotifications(false); }}
                        className="p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">มีคำขอรอการอนุมัติ</p>
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
                          if (currentUser) setNotifications(getDbNotifications(currentUser.id));
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
                            <p className={`text-sm font-medium ${!noti.isRead ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{noti.title}</p>
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
            """
content = re.sub(bell_pattern, bell_replacement, content, flags=re.DOTALL)


# Profile Click
profile_pattern = r"""<div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4 ml-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">\{currentUser\?\.name\}</p>
                  <p className="text-xs text-slate-500 leading-tight">\{currentUser\?\.role\}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800 shadow-sm overflow-hidden">
                  \{currentUser\?\.avatar \? \(
                    <img src=\{currentUser.avatar\} alt="Profile" className="h-full w-full object-cover" />
                  \) : \(
                    currentUser\?\.name\.charAt\(0\)
                  \)\}
                </div>
              </div>"""

profile_replacement = r"""<div 
                className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4 ml-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveTab('profile')}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{currentUser?.name}</p>
                  <p className="text-xs text-slate-500 leading-tight">{currentUser?.role}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800 shadow-sm overflow-hidden">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    currentUser?.name.charAt(0)
                  )}
                </div>
              </div>"""
content = re.sub(profile_pattern, profile_replacement, content)


# Inject dynamic theme colors
theme_inject = r"return \(\n    <div className"
theme_colors_map = r"""
  const getThemeVariables = (color: string) => {
    switch(color) {
      case 'indigo': return { '--color-primary-50': 'var(--color-indigo-50)', '--color-primary-100': 'var(--color-indigo-100)', '--color-primary-200': 'var(--color-indigo-200)', '--color-primary-300': 'var(--color-indigo-300)', '--color-primary-400': 'var(--color-indigo-400)', '--color-primary-500': 'var(--color-indigo-500)', '--color-primary-600': 'var(--color-indigo-600)', '--color-primary-700': 'var(--color-indigo-700)', '--color-primary-800': 'var(--color-indigo-800)', '--color-primary-900': 'var(--color-indigo-900)' };
      case 'emerald': return { '--color-primary-50': 'var(--color-emerald-50)', '--color-primary-100': 'var(--color-emerald-100)', '--color-primary-200': 'var(--color-emerald-200)', '--color-primary-300': 'var(--color-emerald-300)', '--color-primary-400': 'var(--color-emerald-400)', '--color-primary-500': 'var(--color-emerald-500)', '--color-primary-600': 'var(--color-emerald-600)', '--color-primary-700': 'var(--color-emerald-700)', '--color-primary-800': 'var(--color-emerald-800)', '--color-primary-900': 'var(--color-emerald-900)' };
      case 'rose': return { '--color-primary-50': 'var(--color-rose-50)', '--color-primary-100': 'var(--color-rose-100)', '--color-primary-200': 'var(--color-rose-200)', '--color-primary-300': 'var(--color-rose-300)', '--color-primary-400': 'var(--color-rose-400)', '--color-primary-500': 'var(--color-rose-500)', '--color-primary-600': 'var(--color-rose-600)', '--color-primary-700': 'var(--color-rose-700)', '--color-primary-800': 'var(--color-rose-800)', '--color-primary-900': 'var(--color-rose-900)' };
      case 'amber': return { '--color-primary-50': 'var(--color-amber-50)', '--color-primary-100': 'var(--color-amber-100)', '--color-primary-200': 'var(--color-amber-200)', '--color-primary-300': 'var(--color-amber-300)', '--color-primary-400': 'var(--color-amber-400)', '--color-primary-500': 'var(--color-amber-500)', '--color-primary-600': 'var(--color-amber-600)', '--color-primary-700': 'var(--color-amber-700)', '--color-primary-800': 'var(--color-amber-800)', '--color-primary-900': 'var(--color-amber-900)' };
      case 'violet': return { '--color-primary-50': 'var(--color-violet-50)', '--color-primary-100': 'var(--color-violet-100)', '--color-primary-200': 'var(--color-violet-200)', '--color-primary-300': 'var(--color-violet-300)', '--color-primary-400': 'var(--color-violet-400)', '--color-primary-500': 'var(--color-violet-500)', '--color-primary-600': 'var(--color-violet-600)', '--color-primary-700': 'var(--color-violet-700)', '--color-primary-800': 'var(--color-violet-800)', '--color-primary-900': 'var(--color-violet-900)' };
      case 'blue':
      default:
        return { '--color-primary-50': 'var(--color-blue-50)', '--color-primary-100': 'var(--color-blue-100)', '--color-primary-200': 'var(--color-blue-200)', '--color-primary-300': 'var(--color-blue-300)', '--color-primary-400': 'var(--color-blue-400)', '--color-primary-500': 'var(--color-blue-500)', '--color-primary-600': 'var(--color-blue-600)', '--color-primary-700': 'var(--color-blue-700)', '--color-primary-800': 'var(--color-blue-800)', '--color-primary-900': 'var(--color-blue-900)' };
    }
  }

  return (
    <div 
      className="""
content = re.sub(theme_inject, theme_colors_map, content)

content = content.replace('style={{}}', 'style={getThemeVariables(themeColor) as React.CSSProperties}')
content = content.replace('<div className={`min-h-screen', '<div style={getThemeVariables(themeColor) as React.CSSProperties} className={`min-h-screen')


# Replace bg-blue with bg-primary everywhere
content = content.replace('bg-blue-', 'bg-primary-')
content = content.replace('text-blue-', 'text-primary-')
content = content.replace('border-blue-', 'border-primary-')
content = content.replace('ring-blue-', 'ring-primary-')
content = content.replace('from-blue-', 'from-primary-')
content = content.replace('to-blue-', 'to-primary-')
content = content.replace('shadow-blue-', 'shadow-primary-')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
