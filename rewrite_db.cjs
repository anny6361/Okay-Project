const fs = require('fs');

let content = fs.readFileSync('src/data/db.ts', 'utf8');

// Import from firestore-sync
content = "import { getFromCache, saveToFirestore } from '../lib/firestore-sync';\n" + content;

// Replace setItem
content = content.replace(/localStorage\.setItem\((['`].+?['`]),\s*JSON\.stringify\((.+?)\)\);/g, "saveToFirestore($1, $2);");

// Replace getItem parsed with default
content = content.replace(/JSON\.parse\(localStorage\.getItem\((['`].+?['`])\)\s*\|\|\s*(['`"\[\]{}]+)\)/g, "getFromCache($1, $2)");

// Replace raw getItem and subsequent JSON.parse logic.
// Often it's like:
// const users = localStorage.getItem('okey_db_users');
// if (users) { let parsed = JSON.parse(users); ... } else { return INITIAL_USERS; }
// I can just replace `localStorage.getItem` with `getFromCache` but it returns an object or null!
content = content.replace(/localStorage\.getItem\((['`].+?['`])\)/g, "getFromCache($1)");

// Wait, if it's already an object, `JSON.parse(users)` will crash!
// Let's replace `JSON.parse(VAR)` with `(typeof VAR === 'string' ? JSON.parse(VAR) : VAR)`
content = content.replace(/JSON\.parse\((?!getFromCache)([a-zA-Z0-9_]+)\)/g, "(typeof $1 === 'string' ? JSON.parse($1) : $1)");

fs.writeFileSync('src/data/db.ts', content);
console.log("Rewrote src/data/db.ts");
