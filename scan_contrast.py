import os
import re

bad_patterns = [
    # text-slate-700, 800, 900 without dark:text-*
    (r'text-slate-[789]00(?!.*dark:text)', "Dark text without dark variant"),
    # bg-white without dark:bg-*
    (r'bg-white(?!.*dark:bg)', "White bg without dark variant"),
    # text-slate-400, 500 without dark:text-* on white bg or dark bg
    # Let's focus on missing dark variants for major colors
    (r'bg-slate-50(?!.*dark:bg)', "Slate-50 bg without dark variant"),
    (r'bg-slate-100(?!.*dark:bg)', "Slate-100 bg without dark variant"),
    (r'border-slate-200(?!.*dark:border)', "Border-slate-200 without dark variant"),
]

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                lines = f.readlines()
                # we need to check whole className strings, which might span multiple lines, but let's check per line first
                # Actually, classes often span multiple lines due to template literals.
                # Let's join the file, find all className="...", and check inside.
                
                content = "".join(lines)
                classnames = re.findall(r'className=[\'"`](.*?)[\'"`]', content, re.DOTALL)
                for cn in classnames:
                    cn_flat = cn.replace('\n', ' ')
                    if 'bg-white' in cn_flat and 'dark:bg-' not in cn_flat and 'print:bg-transparent' not in cn_flat:
                        print(f"{file}: bg-white missing dark:bg- -> {cn_flat[:50]}...")
                    if re.search(r'text-slate-[789]00', cn_flat) and 'dark:text-' not in cn_flat:
                        print(f"{file}: text-slate-[789]00 missing dark:text- -> {cn_flat[:50]}...")
                    if re.search(r'bg-slate-[51]0', cn_flat) and 'dark:bg-' not in cn_flat:
                        print(f"{file}: bg-slate-[51]0 missing dark:bg- -> {cn_flat[:50]}...")
                    if 'border-slate-200' in cn_flat and 'dark:border-' not in cn_flat:
                        print(f"{file}: border-slate-200 missing dark:border- -> {cn_flat[:50]}...")
