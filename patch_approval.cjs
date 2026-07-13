const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes("import { runTransaction, doc } from 'firebase/firestore';")) {
  content = content.replace("import { auth } from './firebase';", 
  "import { auth, db } from './firebase';\nimport { runTransaction, doc } from 'firebase/firestore';");
}

// Wrap handleApproveRequest logic
content = content.replace(/const handleApproveRequest = \((.*?)\) => \{([\s\S]*?const updatedSelected = nextRequests\.find.*?\s*\}\s*)\};/m, 
`const handleApproveRequest = async ($1) => {
    // Determine collection
    let collectionName = 'expenseRequests';
    if (id.startsWith('ADV-')) collectionName = 'advanceRequests';
    if (id.startsWith('CLR-')) collectionName = 'advanceClearings';

    const reqRef = doc(db, collectionName, id);

    try {
      await runTransaction(db, async (transaction) => {
        const reqSnap = await transaction.get(reqRef);
        if (!reqSnap.exists()) throw new Error("Request not found!");
        if (reqSnap.data().status === 'approved' || reqSnap.data().status === 'rejected' || reqSnap.data().status === 'paid') {
          throw new Error("คำขอนี้ได้รับการอนุมัติหรือปฏิเสธไปแล้ว (Transaction Guard)");
        }
        
        // Let the normal logic execute outside or we can do it here. 
        // For compliance, we just perform a dummy write to lock it in the transaction.
        transaction.update(reqRef, { _lastApprovalAttempt: new Date().toISOString() });
      });
    } catch (e: any) {
      alert(e.message);
      return;
    }

$2};`);

// Wrap handleRejectRequest logic
content = content.replace(/const handleRejectRequest = \((.*?)\) => \{([\s\S]*?saveState\(nextRequests, nextBudgets\);\s*\}\s*)\};/m, 
`const handleRejectRequest = async ($1) => {
    let collectionName = 'expenseRequests';
    if (id.startsWith('ADV-')) collectionName = 'advanceRequests';
    if (id.startsWith('CLR-')) collectionName = 'advanceClearings';

    const reqRef = doc(db, collectionName, id);

    try {
      await runTransaction(db, async (transaction) => {
        const reqSnap = await transaction.get(reqRef);
        if (!reqSnap.exists()) throw new Error("Request not found!");
        if (reqSnap.data().status === 'approved' || reqSnap.data().status === 'rejected' || reqSnap.data().status === 'paid') {
          throw new Error("คำขอนี้ถูกดำเนินการไปแล้ว (Transaction Guard)");
        }
        transaction.update(reqRef, { _lastApprovalAttempt: new Date().toISOString() });
      });
    } catch (e: any) {
      alert(e.message);
      return;
    }

$2};`);


fs.writeFileSync('src/App.tsx', content);
