import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: "json" };

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId
  });
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();

