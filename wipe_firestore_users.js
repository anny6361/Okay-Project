import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection, writeBatch } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function wipeUsers() {
  const collectionRef = collection(db, 'users');
  const snapshot = await getDocs(collectionRef);
  if (snapshot.empty) {
    console.log("Users collection already empty");
    return;
  }
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log("Deleted all sample user documents from Firestore");
}

wipeUsers().then(() => process.exit(0)).catch(console.error);
