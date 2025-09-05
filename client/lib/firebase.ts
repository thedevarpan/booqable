import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingConfig = requiredConfig.filter(key => {
  const val = firebaseConfig[key as keyof typeof firebaseConfig];
  return val === undefined || val === null || String(val).trim() === '';
});

let app: any = null;
let auth: any = null;
let db: any = null;
let firebaseAvailable = true;

// Diagnostic: presence map (no secret values logged)
const presence = requiredConfig.reduce((acc: any, key) => {
  const val = firebaseConfig[key as keyof typeof firebaseConfig];
  acc[key] = !!(val && String(val).trim());
  return acc;
}, {});

if (missingConfig.length > 0) {
  console.error('Firebase configuration incomplete. Missing required client VITE variables:', missingConfig);
  console.info('Presence check for required client keys:', presence);
  console.info('Tip: ensure .env.local exists at project root, variables are prefixed with VITE_, and restart the dev server.');
  firebaseAvailable = false;
} else {
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);

    // Initialize Firebase Authentication and get a reference to the service
    auth = getAuth(app);

    // Initialize Cloud Firestore with robust connectivity settings
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    } as any);

    firebaseAvailable = true;

    if (import.meta.env.DEV) {
      console.log('Firebase initialized successfully (DEV). Presence:', presence);
      console.log('Client Firebase projectId/authDomain:', firebaseConfig.projectId, !!firebaseConfig.authDomain);
    } else {
      console.log('Firebase initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    firebaseAvailable = false;
  }
}

export { auth, db, firebaseAvailable };

// Test Firebase connection
if (import.meta.env.DEV && firebaseAvailable) {
  console.log('Firebase initialized with config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey
  });
}

// Note: Firebase emulators disabled for cloud deployment
// To enable emulators for local development, uncomment and run:
// firebase emulators:start --only auth,firestore
//
// if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR) {
//   try {
//     connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//     connectFirestoreEmulator(db, 'localhost', 8080);
//   } catch (error) {
//     console.log('Firebase emulators not available');
//   }
// }

export default app;
