import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "clothingrent.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "clothingrent",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "clothingrent.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "794004319101",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:794004319101:web:c11ee5fa9bb62ab2013a14"
};

console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'LOADED' : 'MISSING',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

console.log('Firebase initialized successfully');

export default app;
