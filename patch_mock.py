import re

with open('src/data/db.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to replace INITIAL_USERS
pattern = r"(export const INITIAL_USERS: UserProfile\[\] = \[).*?(];)"
repl = r"""\1
  {
    user_id: 'user-admin',
    employee_id: 'EMP-001',
    username: 'Okay0000',
    name: 'สิรินธร รัตนสกุล (Admin)',
    email: 'admin@okey.com',
    phone: '080-000-0000',
    password: 'password123',
    department: 'บัญชีและการเงิน (Finance)',
    position: 'Chief Financial Officer',
    role: 'Administrator',
    is_active: true,
    approval_level: 'Administrator',
    signatureUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/John_F._Kennedy_Signature.png'
  }
\2"""

content = re.sub(pattern, repl, content, flags=re.DOTALL)

with open('src/data/db.ts', 'w', encoding='utf-8') as f:
    f.write(content)
