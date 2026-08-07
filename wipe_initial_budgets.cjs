const fs = require('fs');
let file = fs.readFileSync('src/data/masterData.ts', 'utf8');

const strStart = "export const INITIAL_BUDGETS: DepartmentBudget[] = [";
const i = file.indexOf(strStart);
const nextExport = "export const INITIAL_REQUESTS";
const j = file.indexOf(nextExport, i);

if (i !== -1 && j !== -1) {
  file = file.substring(0, i) + "export const INITIAL_BUDGETS: DepartmentBudget[] = [];\n" + file.substring(j);
  fs.writeFileSync('src/data/masterData.ts', file);
  console.log("Success");
} else {
  console.log("Failed", i, j);
}
