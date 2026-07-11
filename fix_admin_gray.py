import re
with open('src/components/AdminConfigView.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('value="bg-gray-100 text-gray-800"', 'value="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"')
c = c.replace('value="bg-amber-100 text-amber-800"', 'value="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"')
with open('src/components/AdminConfigView.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
