import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey) {
    console.error("Firebase API Key is missing! Did you create .env.local and restart the server?");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence
// Note: enableIndexedDbPersistence is deprecated in newer SDKs in favor of initializeFirestore with settings
// but specific instructions just said "Robust server-state synchronization" which TanStack Query handles.
// However, standard Firestore offline persistence is also good.
// We'll stick to basic init for now and rely on TanStack Query for optimistic UI as requested, 
// unless specific Firestore offline caching is needed for Read operations when offline.
// The prompt mentioned "Materialized Path" and "Optimistic UI".
// "PWA with 'Network First' strategy for API...". Firestore SDK creates its own socket.
// We'll trust Firestore defaults (which includes offline persistence for mobile/web usually).
