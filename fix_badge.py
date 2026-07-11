import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_string = r"\{\(\(notifications\.filter\(n => !n\.isRead\)\.length > 0\) \|\| pendingApprovalsCount > 0 \|\| pendingPayoutsCount > 0\) \{\(notifications\.filter\(n => !n\.isRead\)\.length > 0 \|\| pendingApprovalsCount > 0\) && \(\{\(notifications\.filter\(n => !n\.isRead\)\.length > 0 \|\| pendingApprovalsCount > 0\) && \( \("
good_string = r"{(notifications.filter(n => !n.isRead).length > 0 || pendingApprovalsCount > 0 || pendingPayoutsCount > 0) && ("

content = re.sub(bad_string, good_string, content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
