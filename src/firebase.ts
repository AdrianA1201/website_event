import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use memoryLocalCache to keep data in memory across tab switches without IndexedDB locks
// experimentalForceLongPolling helps bypass corporate firewalls or networks that block WebSockets
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
