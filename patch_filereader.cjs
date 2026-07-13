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

  // Match pattern:
  // const reader = new FileReader();
  // reader.onload = (...) => { ... }
  // reader.readAsDataURL(file);
  
  // This regex matches FileReader blocks:
  content = content.replace(/const (\w+)\s*=\s*new FileReader\(\);\s*\1\.onload(end)?\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]*?)\};\s*(?:\1\.onerror\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\};\s*)?\1\.readAsDataURL\((.*?)\);/g, 
  (match, readerVar, onloadend, innerBody, fileVar) => {
    // Replace `readerVar.result as string` with `dataUrl`
    let newInner = innerBody.replace(new RegExp(readerVar + '\\.result(?:\\s*as\\s*string)?', 'g'), 'dataUrl');
    
    return `uploadToStorage('uploads/' + Date.now() + '_' + ${fileVar}.name, ${fileVar}).then((dataUrl) => {
      ${newInner}
    });`;
  });

  fs.writeFileSync(file, content);
}
