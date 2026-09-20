import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Falls back to the team project when no VITE_FIREBASE_* env vars are set, so
// the default build (no --mode flag) behaves exactly as it did before this file
// became configurable. A personal deploy supplies these via .env.personal and
// `vite build --mode personal`, see .github/workflows/deploy-personal.yml.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBbXXrxCBlGshU1xkb6OdQ0YtAmc1HbAn0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mediactive-dashboard.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mediactive-dashboard",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mediactive-dashboard.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1001729311470",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1001729311470:web:87f04fa13a2d15d9c3a9ff"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)
