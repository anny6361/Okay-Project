import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add pendingPayoutsCount
pending_pattern = r"(  // Count pending approvals for the simulated active user\s*\n\s*const pendingApprovalsCount = requests\.filter\(r => \{\s*\n\s*if \(r\.status !== 'pending'\) return false;\s*\n\s*if \(currentUser\?\.user_id === 'user-admin'\) return true; // Admin views all\s*\n\s*return r\.current_approver === currentUser\?\.user_id;\s*\n\s*\}\)\.length;)"
pending_repl = r"""\1

  // Count pending payouts for Finance/Admin
  const isFinance = currentUser?.approval_level === 'Administrator' || currentUser?.approval_level === 'Finance' || currentUser?.approval_level === 'Level 4';
  const pendingPayoutsCount = isFinance ? requests.filter(r => {
    const statusLower = r.status?.toLowerCase();
    return statusLower === 'approved' || statusLower === 'pending_refund';
  }).length : 0;"""
content = re.sub(pending_pattern, pending_repl, content)

# 2. Update Bell icon badge
bell_badge_pattern = r"(\{\(notifications\.filter\(n => !n\.isRead\)\.length > 0 \|\| pendingApprovalsCount > 0)( && \()"
bell_badge_repl = r"\1 || pendingPayoutsCount > 0\2"
content = re.sub(bell_badge_pattern, bell_badge_repl, content)

# 3. Update count display in badge
count_pattern = r"(\{notifications\.filter\(n => !n\.isRead\)\.length \+ \(pendingApprovalsCount > 0 \? 1 : 0\)\})"
count_repl = r"{notifications.filter(n => !n.isRead).length + (pendingApprovalsCount > 0 ? 1 : 0) + (pendingPayoutsCount > 0 ? 1 : 0)}"
content = re.sub(count_pattern, count_repl, content)

# 4. Add dropdown item for pendingPayoutsCount
dropdown_pattern = r"(\{pendingApprovalsCount > 0 && \(\s*<div\s*onClick=\{\(\) => \{ setActiveTab\('approvals'\); setShowNotifications\(false\); \}\}\s*className=\"p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors bg-primary-50\/30 dark:bg-primary-900\/10\"\s*>\s*<div className=\"flex gap-3\">\s*<div className=\"mt-0\.5 bg-amber-100 dark:bg-amber-900\/30 p-2 rounded-lg text-amber-600 dark:text-amber-400\">\s*<Bell className=\"h-4 w-4\" \/>\s*<\/div>\s*<div>\s*<p className=\"text-sm font-bold text-slate-900 dark:text-white\">มีคำขอรอการอนุมัติ<\/p>\s*<p className=\"text-xs text-slate-500 mt-1\">คุณมี \{pendingApprovalsCount\} รายการที่รอการอนุมัติ<\/p>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\})"
dropdown_repl = r"""\1
                    {pendingPayoutsCount > 0 && (
                      <div 
                        onClick={() => { setActiveTab('dashboard'); setShowNotifications(false); }}
                        className="p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors bg-emerald-50/50 dark:bg-emerald-900/10"
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">มีรายการรอสั่งจ่าย/รับคืนเงิน</p>
                            <p className="text-xs text-slate-500 mt-1">คิวอนุมัติการสั่งจ่ายเงินชดเชย {pendingPayoutsCount} รายการ</p>
                          </div>
                        </div>
                      </div>
                    )}"""
content = re.sub(dropdown_pattern, dropdown_repl, content)

# 5. Update empty state condition
empty_state_pattern = r"(\{notifications\.length === 0 && pendingApprovalsCount === 0)( && \()"
empty_state_repl = r"\1 && pendingPayoutsCount === 0\2"
content = re.sub(empty_state_pattern, empty_state_repl, content)


with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
