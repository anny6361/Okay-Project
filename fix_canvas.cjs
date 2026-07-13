const fs = require('fs');
const files = [
  'src/components/LoginView.tsx',
  'src/components/MyProfileView.tsx',
  'src/components/OnboardingView.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Find the function containing `await uploadToStorage` for canvas
  content = content.replace(/const endDrawing = \(\) => \{/g, "const endDrawing = async () => {");
  
  // LoginView has `password_hash` error because we added it as optional in types? No, the type doesn't have it.
  content = content.replace(/userAccount\.password_hash/g, "(userAccount as any).password_hash");

  // LoginView has `setIsSubmitting` error because we deleted its definition? 
  // Let's add it if missing
  if (!content.includes('const [isSubmitting')) {
    content = content.replace("const [rememberMe, setRememberMe] = useState(false);", "const [rememberMe, setRememberMe] = useState(false);\n  const [isSubmitting, setIsSubmitting] = useState(false);");
  }

  fs.writeFileSync(file, content);
}

// App.tsx Duplicate identifier 'getDbUsers'
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/import \{ getDbUsers \} from '\.\/data\/db';\s*import \{ getDbUsers \} from '\.\/data\/db';/g, "import { getDbUsers } from './data/db';");
// Actually, it might be separated by other imports
app = app.replace(/import \{[\s\w,]*getDbUsers[\s\w,]*\} from '\.\/data\/db';\n.*import \{ getDbUsers \} from '\.\/data\/db';/s, (match) => {
  return match.split('\n')[0]; // Keep the first one
});
fs.writeFileSync('src/App.tsx', app);

