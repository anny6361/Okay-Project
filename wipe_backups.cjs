const fs = require('fs');
let file = fs.readFileSync('src/components/BackupRestoreView.tsx', 'utf8');

const strStart = "const dummy: BackupVersion[] = [";
const strEnd = "];\n    localStorage.setItem('okey_db_backup_versions', JSON.stringify(dummy));";
const i = file.indexOf(strStart);
const j = file.indexOf(strEnd);

if (i !== -1 && j !== -1) {
  file = file.substring(0, i) + "const dummy: BackupVersion[] = []" + file.substring(j + 1);
  fs.writeFileSync('src/components/BackupRestoreView.tsx', file);
  console.log("Success");
} else {
  console.log("Failed");
}
