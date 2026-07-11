import re
import os

def process_class_string(cls_str):
    cls = cls_str
    
    # We want to replace these classes if their dark: equivalent is not already in the string.
    # We do a simple approach: if "bg-white" is in the string, but "dark:bg-" is not, replace "bg-white" with "bg-white dark:bg-slate-900".
    # Wait, we need to be careful with word boundaries, e.g., "bg-white/50" should not be touched.
    
    replacements = [
        (r'\bbg-white\b', 'dark:bg-'),
        (r'\btext-slate-900\b', 'dark:text-'),
        (r'\btext-slate-800\b', 'dark:text-'),
        (r'\btext-slate-700\b', 'dark:text-'),
        (r'\btext-slate-600\b', 'dark:text-'),
        (r'\btext-slate-500\b', 'dark:text-'),
        (r'\bbg-slate-50\b', 'dark:bg-'),
        (r'\bbg-slate-100\b', 'dark:bg-'),
        (r'\bbg-slate-150\b', 'dark:bg-'),
        (r'\bbg-slate-200\b', 'dark:bg-'),
        (r'\bbg-slate-300\b', 'dark:bg-'),
        (r'\bborder-slate-100\b', 'dark:border-'),
        (r'\bborder-slate-150\b', 'dark:border-'),
        (r'\bborder-slate-200\b', 'dark:border-'),
        (r'\bborder-slate-300\b', 'dark:border-'),
    ]
    
    mapping = {
        r'\bbg-white\b': 'bg-white dark:bg-slate-900',
        r'\btext-slate-900\b': 'text-slate-900 dark:text-white',
        r'\btext-slate-800\b': 'text-slate-800 dark:text-slate-100',
        r'\btext-slate-700\b': 'text-slate-700 dark:text-slate-200',
        r'\btext-slate-600\b': 'text-slate-600 dark:text-slate-300',
        r'\btext-slate-500\b': 'text-slate-500 dark:text-slate-400',
        r'\bbg-slate-50\b': 'bg-slate-50 dark:bg-slate-900',
        r'\bbg-slate-100\b': 'bg-slate-100 dark:bg-slate-800',
        r'\bbg-slate-150\b': 'bg-slate-150 dark:bg-slate-800',
        r'\bbg-slate-200\b': 'bg-slate-200 dark:bg-slate-700',
        r'\bbg-slate-300\b': 'bg-slate-300 dark:bg-slate-600',
        r'\bborder-slate-100\b': 'border-slate-100 dark:border-slate-800',
        r'\bborder-slate-150\b': 'border-slate-150 dark:border-slate-800',
        r'\bborder-slate-200\b': 'border-slate-200 dark:border-slate-700',
        r'\bborder-slate-300\b': 'border-slate-300 dark:border-slate-600',
    }
    
    # To avoid changing print classes, if the string has 'print:', maybe we skip? 
    # Actually, appending dark: won't break print.
    
    for pattern, check_absent in replacements:
        if re.search(pattern, cls) and check_absent not in cls:
            # We don't want to replace bg-white/50 etc, regex \b handles that mostly, but since / is a non-word char, \b matches before /.
            # We need a negative lookahead for /.
            safe_pattern = pattern[:-2] + r'(?!\/)\b' 
            cls = re.sub(safe_pattern, mapping[pattern], cls)
            
    return cls

def fix_classes(match):
    full_match = match.group(0)
    quote = match.group(1)
    inner = match.group(2)
    
    new_inner = process_class_string(inner)
    return quote + new_inner + quote

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find className="...", className={'...'}, className={`...`}
            # We can just match all strings and process them if they contain tailwind keywords
            # This is safer than just matching className attributes because sometimes tailwind classes are in variables.
            new_content = re.sub(r'([\'"`])(.*?)\1', fix_classes, content, flags=re.DOTALL)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
