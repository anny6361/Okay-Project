import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocs, collection, writeBatch, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function deleteCollection(collectionPath) {
  const collectionRef = collection(db, collectionPath);
  const snapshot = await getDocs(collectionRef);
  
  if (snapshot.empty) return;

  const batchSize = 100;
  const batches = [];
  let batch = writeBatch(db);
  let count = 0;

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
    if (count === batchSize) {
      batches.push(batch.commit());
      batch = writeBatch(db);
      count = 0;
    }
  });

  if (count > 0) {
    batches.push(batch.commit());
  }

  await Promise.all(batches);
  console.log(`Deleted all documents in collection: ${collectionPath}`);
}

async function wipeAll() {
  const collections = [
    'users',
    'employees',
    'departments',
    'advanceRequests',
    'advanceClearings',
    'expenseRequests',
    'auditLogs',
    'notifications',
    'refunds',
    'deductions',
    'journalEntries',
    'accountingDocuments',
    'logs'
  ];

  for (const coll of collections) {
    try {
        await deleteCollection(coll);
    } catch(e) {
        console.error("failed for", coll, e.message);
    }
  }
  
  console.log("Wipe complete.");
}

wipeAll().then(() => process.exit(0)).catch(console.error);
