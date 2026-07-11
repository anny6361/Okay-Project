import re

with open('src/components/MyProfileView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace interface
pattern_props = r"interface MyProfileViewProps \{[\s\S]*?\}"
repl_props = r"""interface MyProfileViewProps {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  onRefreshData: () => void;
  themeColor?: string;
  setThemeColor?: (color: string) => void;
}"""
content = re.sub(pattern_props, repl_props, content)

# Replace component definition
pattern_def = r"export default function MyProfileView\(\{ currentUser, setCurrentUser, onRefreshData \}: MyProfileViewProps\) \{"
repl_def = r"export default function MyProfileView({ currentUser, setCurrentUser, onRefreshData, themeColor = 'blue', setThemeColor }: MyProfileViewProps) {"
content = re.sub(pattern_def, repl_def, content)

# Add theme color selector section
theme_section = r"""
        {/* Theme Settings Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary-500" />
            ตั้งค่าธีมสีหลัก (Accent Color)
          </h3>
          <p className="text-sm text-slate-500 mb-6">สีนี้จะถูกนำไปใช้ในปุ่ม, ไอคอน และองค์ประกอบหลักทั้งหมดของระบบ</p>
          
          <div className="flex flex-wrap gap-4">
            {[
              { id: 'blue', color: 'bg-blue-500', name: 'น้ำเงิน (O-Key Default)' },
              { id: 'indigo', color: 'bg-indigo-500', name: 'คราม' },
              { id: 'violet', color: 'bg-violet-500', name: 'ม่วง' },
              { id: 'emerald', color: 'bg-emerald-500', name: 'เขียว' },
              { id: 'amber', color: 'bg-amber-500', name: 'เหลือง/ส้ม' },
              { id: 'rose', color: 'bg-rose-500', name: 'แดง/ชมพู' },
            ].map(theme => (
              <button
                key={theme.id}
                onClick={() => setThemeColor && setThemeColor(theme.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${themeColor === theme.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className={`w-10 h-10 rounded-full ${theme.color} shadow-sm ring-2 ring-offset-2 ${themeColor === theme.id ? 'ring-primary-500' : 'ring-transparent'}`}></div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
"""

pattern_bottom = r"(<div className=\"bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm\">\s*<h3 className=\"text-lg font-bold text-red-600 mb-4 flex items-center gap-2\">)"
content = re.sub(pattern_bottom, theme_section + r"\n        \1", content)

# Change bg-blue to bg-primary in MyProfileView
content = content.replace('bg-blue-', 'bg-primary-')
content = content.replace('text-blue-', 'text-primary-')
content = content.replace('border-blue-', 'border-primary-')
content = content.replace('ring-blue-', 'ring-primary-')
content = content.replace('from-blue-', 'from-primary-')
content = content.replace('to-blue-', 'to-primary-')
content = content.replace('shadow-blue-', 'shadow-primary-')

# Import Palette
content = content.replace('Save, Key, Edit,', 'Save, Key, Edit, Palette,')

with open('src/components/MyProfileView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
