import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkUsers() {
  const collectionRef = collection(db, 'users');
  const snapshot = await getDocs(collectionRef);
  console.log("Current user count in Firestore:", snapshot.size);
  snapshot.docs.forEach(doc => {
    console.log("-", doc.id, doc.data().username, doc.data().name);
  });
}

checkUsers().then(() => process.exit(0)).catch(console.error);
