import { initializeApp } from 'firebase/app';
import { getFirestore, doc } from 'firebase/firestore';

const app = initializeApp({ projectId: 'test' });
const db = getFirestore(app);
try {
  doc(db, 'users', undefined);
} catch (e) {
  console.log(e.stack);
}
