import re

with open('src/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix ApprovalRule
content = content.replace("requester_user_id: string;\n  employee_id?: string; // The user who submits (can be specific user ID)", "requester_user_id: string; // The user who submits (can be specific user ID)")
content = content.replace("approver_user_id: string;\n  employee_id?: string;  // The user assigned to approve", "approver_user_id: string;  // The user assigned to approve")

# Keep employee_id in UserProfile
# Keep employee_id in EnterpriseAuditLog if it makes sense, or remove it. Let's remove it and add it back ONLY to UserProfile just in case.
content = content.replace("user_id: string;\n  employee_id?: string;", "user_id: string;")
# Now add employee_id back ONLY to UserProfile
user_profile_pattern = r"(export interface UserProfile \{\n\s*user_id: string;)(\s*// Primary Key)"
content = re.sub(user_profile_pattern, r"\1\n  employee_id?: string;\2", content)

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)
