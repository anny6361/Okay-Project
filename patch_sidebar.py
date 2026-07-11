import re

with open('src/components/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"""<div className="mx-4 mb-6 p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center gap-3">"""
repl = r"""<div 
            onClick={() => { setActiveTab('profile'); setIsOpen(false); }}
            className="mx-4 mb-6 p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors"
          >"""

content = re.sub(pattern, repl, content)

with open('src/components/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
