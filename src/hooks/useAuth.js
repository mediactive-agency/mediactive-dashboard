import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, provider, db } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(undefined)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u || null)
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'admins', u.uid))
          setIsAdmin(snap.exists())
        } catch { setIsAdmin(false) }
      } else {
        setIsAdmin(false)
      }
    })
  }, [])

  const login = () => signInWithPopup(auth, provider)
  const logout = () => signOut(auth)

  return { user, isAdmin, allowed: !!user, loading: user === undefined, login, logout }
}
