import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import { migrateLocalToFirestore } from './migration';
import { setGlobalRenderTrigger, setupFirestoreSync } from './firestore-sync';

export interface AppBootstrapOptions {
  onSync: () => void;
  onSessionChange: (user: User | null) => void;
}

let initialized = false;

/**
 * Initializes cross-cutting application services exactly once.
 * This keeps App.tsx focused on UI state rather than infrastructure wiring.
 */
export function initializeAppServices(options: AppBootstrapOptions): () => void {
  setGlobalRenderTrigger(options.onSync);
  setupFirestoreSync();

  if (!initialized) {
    initialized = true;
    migrateLocalToFirestore().catch((error) => {
      console.error('[OKAY] local-to-Firestore migration failed:', error);
    });
  }

  return onAuthStateChanged(auth, options.onSessionChange);
}
