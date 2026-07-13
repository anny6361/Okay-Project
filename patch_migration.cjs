const fs = require('fs');

let file = fs.readFileSync('src/lib/migration.ts', 'utf8');

file = file.replace(/const userRef = doc\(db, 'users', user\.user_id\);/g, "const id = user.user_id || user.id || Math.random().toString(36).substr(2, 9);\n      const userRef = doc(db, 'users', id);");
file = file.replace(/const empRef = doc\(db, 'employees', user\.user_id\);/g, "const empRef = doc(db, 'employees', id);");

file = file.replace(/const deptRef = doc\(db, 'departments', dept\.id\);/g, "const id = dept.id || Math.random().toString(36).substr(2, 9);\n      const deptRef = doc(db, 'departments', id);");

file = file.replace(/const reqRef = doc\(db, 'advanceRequests', req\.id\);/g, "const id = req.id || req.request_id || Math.random().toString(36).substr(2, 9);\n        const reqRef = doc(db, 'advanceRequests', id);");
file = file.replace(/const reqRef = doc\(db, 'advanceClearings', req\.id\);/g, "const id = req.id || req.request_id || Math.random().toString(36).substr(2, 9);\n        const reqRef = doc(db, 'advanceClearings', id);");
file = file.replace(/const reqRef = doc\(db, 'expenseRequests', req\.id\);/g, "const id = req.id || req.request_id || Math.random().toString(36).substr(2, 9);\n        const reqRef = doc(db, 'expenseRequests', id);");

fs.writeFileSync('src/lib/migration.ts', file);
