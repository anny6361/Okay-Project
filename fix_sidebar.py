with open('src/components/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_string = """<div className="h-10 w-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-xs shrink-0">
              {getInitials(currentUser?.name)}
            </div>"""

good_string = """<div className="h-10 w-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
              {currentUser?.signatureUrl && currentUser.signatureUrl.startsWith('http') && currentUser.signatureUrl.includes('avatar') ? (
                <img src={currentUser.signatureUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                getInitials(currentUser?.name)
              )}
            </div>"""

content = content.replace(bad_string, good_string)

with open('src/components/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
