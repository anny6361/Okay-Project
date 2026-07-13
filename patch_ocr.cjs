const fs = require('fs');

let file = fs.readFileSync('src/components/MyRequestsView.tsx', 'utf8');

file = file.replace(
  "                  const result = reader.result;",
  "                  const result = reader.result as string;"
);

fs.writeFileSync('src/components/MyRequestsView.tsx', file);
