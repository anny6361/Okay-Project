const fs = require('fs');

const fixAsync = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const stopDrawing = \(\) => \{/g, "const stopDrawing = async () => {");
  fs.writeFileSync(file, content);
};

fixAsync('src/components/LoginView.tsx');
fixAsync('src/components/MyProfileView.tsx');
fixAsync('src/components/OnboardingView.tsx');

let loginContent = fs.readFileSync('src/components/LoginView.tsx', 'utf8');
if (!loginContent.includes('const [isSubmitting, setIsSubmitting] = useState(false);')) {
  loginContent = loginContent.replace("const [rememberMe, setRememberMe] = useState(false);", "const [rememberMe, setRememberMe] = useState(false);\n  const [isSubmitting, setIsSubmitting] = useState(false);");
  fs.writeFileSync('src/components/LoginView.tsx', loginContent);
}

