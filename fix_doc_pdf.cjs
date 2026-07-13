const fs = require('fs');
let content = fs.readFileSync('src/components/DocumentPdfManagerView.tsx', 'utf8');

content = content.replace(/const dataUrl = dataUrl;/g, "");
content = content.replace(/\.then\(\(dataUrl\) => \{/g, ".then(async (dataUrl) => {");

fs.writeFileSync('src/components/DocumentPdfManagerView.tsx', content);
