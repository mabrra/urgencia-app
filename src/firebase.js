// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- PEGA AQUÍ TUS DATOS DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDhyHXyBxIh_k3HqDVaDn7DsPXjUs4-nwc",
  authDomain: "urgencia-martin.firebaseapp.com",
  projectId: "urgencia-martin",
  storageBucket: "urgencia-martin.firebasestorage.app",
  messagingSenderId: "608099470654",
  appId: "1:608099470654:web:d2dd3f552e4464fa7cb06f"
};
// ----------------------------------------

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);