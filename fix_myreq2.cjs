const fs = require('fs');
let content = fs.readFileSync('src/components/MyRequestsView.tsx', 'utf8');

content = content.replace(/\.then\(\(dataUrl\) => \{/g, ".then(async (dataUrl) => {");
content = content.replace(/const dataUrl = dataUrl;/g, "");

fs.writeFileSync('src/components/MyRequestsView.tsx', content);
