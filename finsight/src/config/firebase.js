// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// Uses environment variables for production deployment
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBWXfOsai-ZsT6-N7scG-MSzq6rxK34sGs",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "finsight-9d1fd.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "finsight-9d1fd",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "finsight-9d1fd.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "671699000955",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:671699000955:web:e3d406c7c6b8e033be8cde",
  measurementId: "G-QNCJYW0S0Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
