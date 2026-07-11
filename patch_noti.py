import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import addDbNotification
import_pattern = r"(import \{\s*\n\s*getDbUsers,\s*\n\s*getDbNotifications,\s*\n\s*markNotificationAsRead,\s*\n\s*markAllNotificationsAsRead,)"
import_repl = r"\1\n  addDbNotification,"
content = re.sub(import_pattern, import_repl, content)

# handleCreateRequest - notify approver
create_pattern = r"(const request: ExpenseRequest = \{[\s\S]*?\};\s*\n\s*const updatedRequests = \[request, \.\.\.requests\];\s*\n\s*updateGlobalState\(updatedRequests\);)"
create_repl = r"""\1
    if (!newReq.isDraft && current_approver) {
      addDbNotification({
        userId: current_approver,
        title: 'รายการขออนุมัติใหม่',
        message: `${currentUser?.name} ได้ส่งคำขอเบิกเงิน ${newReq.amount.toLocaleString('th-TH')} บาท`,
        type: 'approval',
        isRead: false,
        linkToTab: 'approvals'
      });
      // also push notification to current user context if they are the approver (unlikely but safe)
      if (currentUser?.user_id === current_approver) {
        setNotifications(getDbNotifications(currentUser.id || currentUser.user_id));
      }
    }
"""
content = re.sub(create_pattern, create_repl, content)

# handleActionRequest - notify requester and next approver
action_pattern = r"(const handleActionRequest = \(action: 'approve' \| 'reject', comment: string, signatureUrl\?: string\) => \{[\s\S]*?)(setSelectedRequest\(null\);)"
def replace_action(m):
    block = m.group(1)
    # Inside handleActionRequest, look for status update
    # We will just append it after the status update block
    return block + r"""
    // Notifications logic
    if (updatedReq.status === 'approved') {
      addDbNotification({
        userId: updatedReq.employee_id,
        title: 'อนุมัติคำขอแล้ว',
        message: `รายการคำขอ ${updatedReq.id} ของคุณได้รับการอนุมัติเสร็จสิ้นแล้ว`,
        type: 'approval',
        isRead: false,
        linkToTab: 'requests'
      });
    } else if (updatedReq.status === 'rejected') {
      addDbNotification({
        userId: updatedReq.employee_id,
        title: 'คำขอถูกตีกลับ',
        message: `รายการคำขอ ${updatedReq.id} ของคุณถูกตีกลับ: ${comment}`,
        type: 'approval',
        isRead: false,
        linkToTab: 'requests'
      });
    } else if (updatedReq.status === 'pending' && updatedReq.current_approver) {
      addDbNotification({
        userId: updatedReq.current_approver,
        title: 'รายการขออนุมัติใหม่ (รอคุณ)',
        message: `มีคำขอ ${updatedReq.id} รอการอนุมัติจากคุณ`,
        type: 'approval',
        isRead: false,
        linkToTab: 'approvals'
      });
      addDbNotification({
        userId: updatedReq.employee_id,
        title: 'อนุมัติคำขอขั้นต้นแล้ว',
        message: `รายการคำขอ ${updatedReq.id} ของคุณผ่านการอนุมัติจาก ${currentUser?.name} แล้ว รอผู้พิจารณาลำดับถัดไป`,
        type: 'approval',
        isRead: false,
        linkToTab: 'requests'
      });
    }
    """ + "\n    setSelectedRequest(null);"

content = re.sub(action_pattern, replace_action, content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
