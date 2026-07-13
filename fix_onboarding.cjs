const fs = require('fs');
let content = fs.readFileSync('src/components/OnboardingView.tsx', 'utf8');

content = content.replace(/event\.target\?\.result/g, "dataUrl");
content = content.replace(/event\.target\.result\s*as\s*string/g, "dataUrl");

fs.writeFileSync('src/components/OnboardingView.tsx', content);
