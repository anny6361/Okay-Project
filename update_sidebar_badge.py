import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

sidebar_pattern = r"(<Sidebar\s*\n\s*activeTab=\{activeTab\}\s*\n\s*setActiveTab=\{setActiveTab\}\s*\n\s*pendingApprovalsCount=\{pendingApprovalsCount\})"
sidebar_repl = r"\1\n        pendingPayoutsCount={pendingPayoutsCount}"
content = re.sub(sidebar_pattern, sidebar_repl, content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/Sidebar.tsx', 'r', encoding='utf-8') as f:
    sidebar_content = f.read()

props_pattern = r"(interface SidebarProps \{\s*\n\s*activeTab: string;\s*\n\s*setActiveTab: \(tab: string\) => void;\s*\n\s*pendingApprovalsCount: number;)"
props_repl = r"\1\n  pendingPayoutsCount?: number;"
sidebar_content = re.sub(props_pattern, props_repl, sidebar_content)

comp_pattern = r"(export default function Sidebar\(\{ activeTab, setActiveTab, pendingApprovalsCount, currentUser, onLogout \}: SidebarProps\) \{)"
comp_repl = r"export default function Sidebar({ activeTab, setActiveTab, pendingApprovalsCount, pendingPayoutsCount = 0, currentUser, onLogout }: SidebarProps) {"
sidebar_content = re.sub(comp_pattern, comp_repl, sidebar_content)

dashboard_badge_pattern = r"(\{ id: 'dashboard', label: 'หน้าแรก / ภาพรวม', icon: LayoutDashboard \},)"
dashboard_badge_repl = r"{ id: 'dashboard', label: 'หน้าแรก / ภาพรวม', icon: LayoutDashboard, badge: pendingPayoutsCount > 0 ? pendingPayoutsCount : undefined },"
sidebar_content = re.sub(dashboard_badge_pattern, dashboard_badge_repl, sidebar_content)

with open('src/components/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(sidebar_content)
