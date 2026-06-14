import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, provider } from '../firebase'

// Allowed emails - přidej emailový adresy kdo má mít přístup
const ALLOWED_EMAILS = [
  'krystof@mediactive.cz',
]

export function useAuth() {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u || null)
      setAllowed(u ? ALLOWED_EMAILS.includes(u.email) : false)
    })
  }, [])

  const login = () => signInWithPopup(auth, provider)
  const logout = () => signOut(auth)

  return { user, allowed, loading: user === undefined, login, logout }
}
