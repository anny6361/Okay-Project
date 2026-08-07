import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const dummyUserIds = [
  'user-admin',
  'user-employee',
  'user-executive',
  'user-finance',
  'user-hr',
  'user-manager'
];

async function wipeDummyUsers() {
  const batch = writeBatch(db);
  for (const uid of dummyUserIds) {
    batch.delete(doc(db, 'users', uid));
    batch.delete(doc(db, 'employees', uid));
  }
  await batch.commit();
  console.log("Successfully deleted dummy user documents from Firestore users and employees collections!");
}

wipeDummyUsers().then(() => process.exit(0)).catch(console.error);
