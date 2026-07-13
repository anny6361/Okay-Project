const fs = require('fs');
const files = [
  'src/components/MyProfileView.tsx',
  'src/components/LoginView.tsx',
  'src/components/OnboardingView.tsx',
  'src/components/DashboardView.tsx',
  'src/components/MyRequestsView.tsx',
  'src/components/DocumentPdfManagerView.tsx',
  'src/components/AdminConfigView.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('uploadToStorage')) {
    content = content.replace(/(import React.*?;\n)/, "$1import { uploadToStorage } from '../lib/storage';\n");
  }

  // Find canvas.toDataURL
  content = content.replace(/const dataUrl = canvas\.toDataURL\('image\/png'\);/g, "const dataUrl = await uploadToStorage('signatures/' + Date.now() + '.png', canvas.toDataURL('image/png'));");

  // Since handleSaveSignature might not be async, let's make it async
  content = content.replace(/const handleSaveSignature = \(\) => \{/g, "const handleSaveSignature = async () => {");
  content = content.replace(/const handleSignatureComplete = \(\) => \{/g, "const handleSignatureComplete = async () => {");

  fs.writeFileSync(file, content);
}
