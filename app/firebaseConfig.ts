import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCi0rzjjYp5y7RMzzVeu_g5MPIYrVTAV2k',
  authDomain: 'savr-scan.firebaseapp.com',
  projectId: 'savr-scan',
  storageBucket: 'savr-scan.firebasestorage.app',
  messagingSenderId: '706573801638',
  appId: '1:706573801638:web:5ed03b4b576f92c20bbc67',
  measurementId: 'G-84W7VFC8PS',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 