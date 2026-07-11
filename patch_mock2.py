import re

with open('src/data/db.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"(export const INITIAL_RULES: ApprovalRule\[\] = \[).*?(];)"
repl = r"\1\2"
content = re.sub(pattern, repl, content, flags=re.DOTALL)

with open('src/data/db.ts', 'w', encoding='utf-8') as f:
    f.write(content)
