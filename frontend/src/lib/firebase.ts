import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCmo6lflN97khJXk4-Xc2GtIjQjmroEBOY",
  authDomain: "agenticpilot-4fe71.firebaseapp.com",
  projectId: "agenticpilot-4fe71",
  storageBucket: "agenticpilot-4fe71.firebasestorage.app",
  messagingSenderId: "216847860794",
  appId: "1:216847860794:web:cec51fbf500c6aec42e103",
  measurementId: "G-L06ZNQ6YZ7"
};

// Initialize Firebase (prevent re-initialization in dev)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
