import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkCollections() {
  const collections = ['users', 'employees', 'departments', 'expenseRequests', 'advanceRequests', 'advanceClearings'];
  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    console.log(`Collection [${colName}] count:`, snap.size);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(` - [${doc.id}] username: ${data.username || data.employee_id}, name: ${data.name}`);
    });
  }
}

checkCollections().then(() => process.exit(0)).catch(console.error);
