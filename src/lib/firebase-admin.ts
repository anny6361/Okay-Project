import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: "json" };

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId
  });
}

export const adminDb = getFirestore('ai-studio-okaycoltd-27ad1f5a-ea7d-42fa-a3aa-36232ce3b315');
export const adminAuth = getAuth();

