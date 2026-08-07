const fs = require('fs');
let file = fs.readFileSync('src/data/masterData.ts', 'utf8');

const strStart = "export const INITIAL_REQUESTS: ExpenseRequest[] = [";
const i = file.indexOf(strStart);

const nextExport = "export const MOCK_RECEIPTS";
const j = file.indexOf(nextExport, i);

if (i !== -1 && j !== -1) {
  file = file.substring(0, i) + "export const INITIAL_REQUESTS: ExpenseRequest[] = [];\n" + file.substring(j);
  fs.writeFileSync('src/data/masterData.ts', file);
  console.log("Success");
} else {
  console.log("Failed", i, j);
}
