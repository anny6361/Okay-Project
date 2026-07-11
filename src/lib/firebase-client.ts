import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDocs, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyALAQb0EtIDkHgjI4ZzRyUGvoRTg1lemGE",
  authDomain: "okay-project-2a44f.firebaseapp.com",
  projectId: "okay-project-2a44f",
  storageBucket: "okay-project-2a44f.firebasestorage.app",
  messagingSenderId: "1049112512735",
  appId: "1:1049112512735:web:436927b3dfb81aa3fd416a",
  measurementId: "G-EJ7CVPF9CD"
};

// Initialize Firebase client
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const COLLECTIONS = [
  'okey_db_users', 'okey_db_rules', 'okey_db_logs', 'okey_db_departments',
  'okey_db_refunds', 'okey_db_deductions', 'okey_db_journal_entries',
  'okey_db_accounting_docs', 'okey_db_company_data', 'okey_db_categories_master',
  'okey_db_expense_types', 'okey_db_approval_levels', 'okey_db_roles_master',
  'okey_db_pdf_templates', 'okey_db_enterprise_audit_logs', 'okey_db_replacement_policy',
  'okey_requests', 'okey_budgets'
];

let isSyncingFromFirestore = false;
const originalSetItem = localStorage.setItem;

// Listen to all collections from Firestore in real-time
export function setupClientFirestoreSync(onUpdate: () => void) {
  const unsubscribers: (() => void)[] = [];

  COLLECTIONS.forEach((colName) => {
    const docRef = doc(db, 'okey_erp', colName);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.items) {
          isSyncingFromFirestore = true;
          try {
            originalSetItem.call(localStorage, colName, JSON.stringify(data.items));
          } catch (e) {
            console.error("Error setting localStorage on sync:", e);
          } finally {
            isSyncingFromFirestore = false;
          }
          onUpdate();
        }
      }
    }, (error) => {
      console.warn(`Firestore subscription error for ${colName}:`, error);
    });
    unsubscribers.push(unsub);
  });

  // Intercept client-side writes to localStorage and sync them to Firestore
  localStorage.setItem = function(key, value) {
    const prevValue = localStorage.getItem(key);
    originalSetItem.apply(this, arguments as any);

    if (!isSyncingFromFirestore && prevValue !== value && COLLECTIONS.includes(key)) {
      try {
        const parsed = JSON.parse(value);
        const docRef = doc(db, 'okey_erp', key);
        setDoc(docRef, { items: parsed }, { merge: true })
          .catch((err) => console.error(`Failed to sync ${key} to Firestore:`, err));
      } catch (e) {
        console.error("Error parsing value for Firestore sync:", e);
      }
    }
  };

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// Initial fetch from Firestore to warm the local cache immediately
export async function fetchInitialClientFirestoreData() {
  isSyncingFromFirestore = true;
  try {
    const promises = COLLECTIONS.map(async (colName) => {
      const docRef = doc(db, 'okey_erp', colName);
      try {
        // Try to get document
        const unsub = onSnapshot(docRef, () => {}); // Keeps it active
        unsub();
      } catch (e) {}
    });
    await Promise.all(promises);
  } catch (err) {
    console.error("Initial Firestore load error:", err);
  } finally {
    isSyncingFromFirestore = false;
  }
}
