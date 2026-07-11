import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix currentUser.id fallback to currentUser.user_id
content = content.replace("currentUser.id || currentUser.user_id", "currentUser.user_id")

# Fetch latest on bell click
bell_pattern = r"(onClick=\{\(\) => \{ setShowNotifications\(!showNotifications\); setShowProfileMenu\(false\); \}\})"
bell_repl = r"onClick={() => { if (!showNotifications && currentUser) setNotifications(getDbNotifications(currentUser.user_id)); setShowNotifications(!showNotifications); setShowProfileMenu(false); }}"
content = re.sub(bell_pattern, bell_repl, content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
