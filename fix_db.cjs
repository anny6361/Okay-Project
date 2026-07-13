const fs = require('fs');

let content = fs.readFileSync('src/data/db.ts', 'utf8');

content = content.replace(/getFromCache\((['`].+?['`]),\s*'\[\]'\)/g, "getFromCache($1, [])");
content = content.replace(/getFromCache\((['`].+?['`]),\s*'\{\}'\)/g, "getFromCache($1, {})");

fs.writeFileSync('src/data/db.ts', content);
