const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Remove duplicate syncCounter
content = content.replace(/const \[syncCounter, setSyncCounter\] = useState\(0\);\n\s*const \[syncCounter, setSyncCounter\] = useState\(0\);/, "const [syncCounter, setSyncCounter] = useState(0);");

// Remove duplicate getDbUsers
content = content.replace(/import { getDbUsers } from '\.\/data\/db';\n.*import { getDbUsers } from '\.\/data\/db';/s, "import { getDbUsers } from './data/db';");

// Add setIsLoaded to the top of App
content = content.replace("const [isLoaded, setIsLoaded] = useState(false);", "");
content = content.replace("const [syncCounter, setSyncCounter] = useState(0);", "const [syncCounter, setSyncCounter] = useState(0);\n  const [isLoaded, setIsLoaded] = useState(false);");

fs.writeFileSync('src/App.tsx', content);
