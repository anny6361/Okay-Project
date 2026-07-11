// Firebase initialization and Google Authentication helper
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';

const firebaseConfig = {
  projectId: "oceanic-analyzer-ngtt6",
  appId: "1:829883693592:web:091e39981b74ea8d93216d",
  apiKey: "AIzaSyAOxJXRhskMaLeUeQOlIW5ZZjSBa9BKWg8",
  authDomain: "oceanic-analyzer-ngtt6.firebaseapp.com",
  storageBucket: "oceanic-analyzer-ngtt6.firebasestorage.app",
  messagingSenderId: "829883693592"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider setup with Google Drive scopes
export const getGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  return provider;
};

// Main function to sign in with Google and request Google Drive scopes
export async function connectGoogleDrive(): Promise<{ token: string; email: string; displayName: string }> {
  const provider = getGoogleProvider();
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    
    if (!token) {
      throw new Error('Could not retrieve access token from Google sign-in.');
    }

    return {
      token,
      email: result.user.email || '',
      displayName: result.user.displayName || ''
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

// Simple Sign Out
export async function disconnectGoogleDrive() {
  await fbSignOut(auth);
}
