import re

with open('src/components/AdminConfigView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Navigation
nav_pattern = r"(<div className=\"flex border-b border-slate-200 dark:border-slate-800\">\s*<button[\s\S]*?)(\{/\* TAB 1: USERS MASTER DATA \*/\})"
nav_repl = r"""<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { id: 'users', label: 'ผู้ใช้งาน', icon: <Users className="h-5 w-5 mb-1" />, count: users.length, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20', border: 'border-primary-500' },
          { id: 'workflows', label: 'สายอนุมัติ', icon: <GitMerge className="h-5 w-5 mb-1" />, count: rules.length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500' },
          { id: 'company', label: 'ข้อมูลบริษัท', icon: <Building className="h-5 w-5 mb-1" />, count: null, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-500' },
          { id: 'departments', label: 'แผนก', icon: <Briefcase className="h-5 w-5 mb-1" />, count: departments.length, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-500' },
          { id: 'categories', label: 'หมวดหมู่', icon: <Tag className="h-5 w-5 mb-1" />, count: categories.length, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-500' },
          { id: 'expenseTypes', label: 'ประเภทเบิก', icon: <Receipt className="h-5 w-5 mb-1" />, count: expenseTypes.length, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-500' },
          { id: 'roles', label: 'บทบาท', icon: <ShieldCheck className="h-5 w-5 mb-1" />, count: roles.length, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-500' },
          { id: 'replacementPolicy', label: 'การทดรองจ่าย', icon: <Repeat className="h-5 w-5 mb-1" />, count: null, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', border: 'border-fuchsia-500' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
              activeSubTab === tab.id 
                ? `${tab.border} ${tab.bg} shadow-sm` 
                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className={`${activeSubTab === tab.id ? tab.color : 'text-slate-400'}`}>
              {tab.icon}
            </div>
            <span className={`text-xs font-bold mt-1 ${activeSubTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
              {tab.label}
            </span>
            {tab.count !== null && (
              <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full font-semibold ${
                activeSubTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>\n\n      \2"""
content = re.sub(nav_pattern, nav_repl, content, flags=re.DOTALL)

# 2. Add Search for users
content = content.replace("const [activeSubTab, setActiveSubTab] = useState", "const [userSearchTerm, setUserSearchTerm] = useState('');\n  const [activeSubTab, setActiveSubTab] = useState")

user_search_ui = r"(<div className=\"bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs\">\s*<div className=\"overflow-x-auto\")"
user_search_ui_repl = r"""<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-10 w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative\""""
content = re.sub(user_search_ui, user_search_ui_repl, content)

# 3. Filter users based on search
users_map_pattern = r"\{users\.map\(\(user, index\) => \("
users_map_repl = r"{users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.employee_id?.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.role?.toLowerCase().includes(userSearchTerm.toLowerCase())).map((user, index) => ("
content = re.sub(users_map_pattern, users_map_repl, content)

# 4. Make all table headers sticky and add Search icon
content = content.replace('<div className="overflow-x-auto">', '<div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">')
content = content.replace('<tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100">', '<tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-100 sticky top-0 z-10 shadow-sm">')
content = content.replace('<tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-b border-slate-200 text-xs">', '<tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-b border-slate-200 text-xs sticky top-0 z-10 shadow-sm">')

# Import Search icon if missing
if 'Search' not in content:
    content = content.replace('FileSpreadsheet', 'FileSpreadsheet, Search')

with open('src/components/AdminConfigView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
