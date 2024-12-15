// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { collection, addDoc } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDmujfordKr-OpzcV-wApv_YfuITS86wz8",
  authDomain: "tyce-project.firebaseapp.com",
  projectId: "tyce-project",
  storageBucket: "tyce-project.firebasestorage.app",
  messagingSenderId: "768255625746",
  appId: "1:768255625746:web:030554f0271ec540f9a6cb",
  measurementId: "G-DN94RPQ561"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);