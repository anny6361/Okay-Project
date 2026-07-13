const fs = require('fs');

const files = [
  'src/components/MyProfileView.tsx',
  'src/components/LoginView.tsx',
  'src/components/OnboardingView.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Make handleSaveSignature async
  content = content.replace(/const handleSaveSignature = \(\) => \{/g, "const handleSaveSignature = async () => {");
  content = content.replace(/const handleSignatureComplete = \(\) => \{/g, "const handleSignatureComplete = async () => {");

  fs.writeFileSync(file, content);
}
