import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-functions.js';

const firebaseConfig = {
  apiKey: "AIzaSyACZ78VjtFwXioTIl4gtrYN1KmgOZTZN7I",
  authDomain: "marathontrainingapp-a8c75.firebaseapp.com",
  projectId: "marathontrainingapp-a8c75",
  storageBucket: "marathontrainingapp-a8c75.firebasestorage.app",
  messagingSenderId: "728882123257",
  appId: "1:728882123257:web:942bf26d6a76b9235e2d28"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const fns = getFunctions(app, 'europe-west1');

export const callStravaExchange = httpsCallable(fns, 'stravaExchangeToken');
export const callStravaRefresh = httpsCallable(fns, 'stravaRefreshToken');
