const fs = require('fs');
let file = fs.readFileSync('src/components/HistoryAndReportsView.tsx', 'utf8');

// Replace import
file = file.replace("import { CATEGORIES_CONFIG, DEPARTMENTS } from '../data/masterData';", "import { CATEGORIES_CONFIG } from '../data/masterData';\nimport { getDbDepartments } from '../data/db';");

// Inside the component, add state for dynamic departments
const stateInsertion = "  const [selectedCategory, setSelectedCategory] = useState<string>('All');";
const stateReplacement = "  const [selectedCategory, setSelectedCategory] = useState<string>('All');\n  const [departmentsList, setDepartmentsList] = useState<string[]>([]);\n  useEffect(() => {\n    const depts = getDbDepartments();\n    setDepartmentsList(depts.map(d => d.department_name));\n  }, []);";

file = file.replace(stateInsertion, stateReplacement);

// Replace DEPARTMENTS.map with departmentsList.map
file = file.replace("{DEPARTMENTS.map(d => (", "{departmentsList.map(d => (");

fs.writeFileSync('src/components/HistoryAndReportsView.tsx', file);
