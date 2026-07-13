const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/localStorage\.setItem/g, '// localStorage.setItem');
content = content.replace(/localStorage\.removeItem/g, '// localStorage.removeItem');

fs.writeFileSync('src/App.tsx', content);
