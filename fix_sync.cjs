const fs = require('fs');
let content = fs.readFileSync('src/lib/firestore-sync.ts', 'utf8');

content = content.replace(/d\.name/g, "d.data().name");
content = content.replace(/d\.budgetLimit/g, "d.data().budgetLimit");
content = content.replace(/d\.budgetSpent/g, "d.data().budgetSpent");
content = content.replace(/d\.budgetPending/g, "d.data().budgetPending");

fs.writeFileSync('src/lib/firestore-sync.ts', content);
