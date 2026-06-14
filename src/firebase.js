import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBbXXrxCBlGshU1xkb6OdQ0YtAmc1HbAn0",
  authDomain: "mediactive-dashboard.firebaseapp.com",
  projectId: "mediactive-dashboard",
  storageBucket: "mediactive-dashboard.firebasestorage.app",
  messagingSenderId: "1001729311470",
  appId: "1:1001729311470:web:87f04fa13a2d15d9c3a9ff"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)
