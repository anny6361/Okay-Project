import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

initializeApp({
  projectId: serviceAccount.projectId
});

const db = getFirestore('ai-studio-okaycoltd-27ad1f5a-ea7d-42fa-a3aa-36232ce3b315');

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  
  const batchSize = 100;
  if (snapshot.size === 0) {
    return;
  }

  const batches = [];
  let batch = db.batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
    if (count === batchSize) {
      batches.push(batch.commit());
      batch = db.batch();
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
    await deleteCollection(coll);
  }
  
  console.log("Wipe complete.");
}

wipeAll().catch(console.error);
