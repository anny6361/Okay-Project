import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"(<MyProfileView \s*\n\s*currentUser=\{currentUser\}\s*\n\s*setCurrentUser=\{setCurrentUser\}\s*\n\s*onRefreshData=\{.*\}\s*\n\s*/>)"
repl = r"<MyProfileView \n                    currentUser={currentUser}\n                    setCurrentUser={setCurrentUser}\n                    themeColor={themeColor}\n                    setThemeColor={(c: string) => {\n                      setThemeColor(c);\n                      localStorage.setItem('okey_accent', c);\n                    }}\n                    onRefreshData={() => {\n                      loadDatabase();\n                    }}\n                  />"

content = re.sub(pattern, repl, content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
