// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWXfOsai-ZsT6-N7scG-MSzq6rxK34sGs",
  authDomain: "finsight-9d1fd.firebaseapp.com",
  projectId: "finsight-9d1fd",
  storageBucket: "finsight-9d1fd.firebasestorage.app",
  messagingSenderId: "671699000955",
  appId: "1:671699000955:web:e3d406c7c6b8e033be8cde",
  measurementId: "G-QNCJYW0S0Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
