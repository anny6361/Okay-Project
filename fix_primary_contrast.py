import re
import os

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # replace bg-primary-50 text-primary-800
            new_content = re.sub(
                r'bg-primary-50 text-primary-800 border-primary-200(?! dark:)',
                'bg-primary-50 text-primary-800 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800',
                content
            )
            
            new_content = re.sub(
                r'bg-amber-50 text-amber-800 border-amber-200(?! dark:)',
                'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
                new_content
            )
            
            new_content = re.sub(
                r'text-primary-600(?!.*dark:text)',
                'text-primary-600 dark:text-primary-400',
                new_content
            )
            
            new_content = re.sub(
                r'text-primary-700(?!.*dark:text)',
                'text-primary-700 dark:text-primary-400',
                new_content
            )
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
