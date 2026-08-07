const fs = require('fs');
let file = fs.readFileSync('src/data/masterData.ts', 'utf8');

const strStart = "export const MOCK_RECEIPTS = [";
const strEnd = "];";
const i = file.indexOf(strStart);
const j = file.indexOf(strEnd, i);

if (i !== -1 && j !== -1) {
  file = file.substring(0, i) + "export const MOCK_RECEIPTS: any[] = []" + file.substring(j + 2);
  fs.writeFileSync('src/data/masterData.ts', file);
  console.log("Success");
} else {
  console.log("Failed");
}
