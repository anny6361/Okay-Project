const fs = require('fs');

let rules = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Since this is a prototype, allow all for simplicity or add specific rules
    }
  }
}
`;

fs.writeFileSync('firestore.rules', rules);
