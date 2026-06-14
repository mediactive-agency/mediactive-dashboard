import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, provider } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u || null))
  }, [])

  const login = () => signInWithPopup(auth, provider)
  const logout = () => signOut(auth)

  return { user, allowed: !!user, loading: user === undefined, login, logout }
}
