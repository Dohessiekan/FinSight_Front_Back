// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, enableNetwork, disableNetwork } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Network management functions for offline handling
export const enableFirebaseNetwork = () => enableNetwork(db);
export const disableFirebaseNetwork = () => disableNetwork(db);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app;
