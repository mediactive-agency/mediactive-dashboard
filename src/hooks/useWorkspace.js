import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import {
  collection, doc, getDoc, getDocs, query, where,
  setDoc, addDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'

const ACTIVE_KEY = 'mediactive_active_workspace'
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function useWorkspace(user) {
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      // Bootstrap: every user owns a workspace (workspaceId == own uid).
      // This means existing accounts need zero data migration.
      const ownMemberRef = doc(db, 'workspaceMembers', `${user.uid}_${user.uid}`)
      const ownSnap = await getDoc(ownMemberRef)
      if (!ownSnap.exists()) {
        await setDoc(ownMemberRef, {
          uid: user.uid,
          workspaceId: user.uid,
          role: 'owner',
          email: user.email || '',
          displayName: user.displayName || '',
          joinedAt: serverTimestamp(),
        })
      }

      const q = query(collection(db, 'workspaceMembers'), where('uid', '==', user.uid))
      const snap = await getDocs(q)
      const memberships = snap.docs.map(d => d.data())

      const list = await Promise.all(memberships.map(async m => {
        let name = ''
        try {
          const wSnap = await getDoc(doc(db, 'users', m.workspaceId))
          if (wSnap.exists()) name = wSnap.data().workspaceName || wSnap.data().userName || ''
        } catch { /* no access yet, ignore */ }
        return {
          workspaceId: m.workspaceId,
          role: m.role,
          name: name || (m.role === 'owner' ? 'My workspace' : 'Shared workspace'),
        }
      }))

      list.sort((a, b) => (a.role === 'owner' ? 0 : 1) - (b.role === 'owner' ? 0 : 1))
      setWorkspaces(list)

      const saved = localStorage.getItem(ACTIVE_KEY)
      const stillValid = list.some(w => w.workspaceId === saved)
      const fallback = list.find(w => w.role === 'owner')?.workspaceId || list[0]?.workspaceId || user.uid
      setActiveWorkspaceId(stillValid ? saved : fallback)
    } catch (e) {
      console.error('useWorkspace load failed', e)
      setWorkspaces([{ workspaceId: user.uid, role: 'owner', name: 'My workspace' }])
      setActiveWorkspaceId(user.uid)
    }
    setLoading(false)
  }, [user?.uid])

  useEffect(() => { load() }, [load])

  function switchWorkspace(workspaceId) {
    setActiveWorkspaceId(workspaceId)
    localStorage.setItem(ACTIVE_KEY, workspaceId)
  }

  async function createInvite() {
    if (!activeWorkspaceId) throw new Error('No active workspace.')
    const ref = await addDoc(collection(db, 'invites'), {
      workspaceId: activeWorkspaceId,
      role: 'member',
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      expiresAt: Date.now() + INVITE_TTL_MS,
      used: false,
    })
    return `${window.location.origin}/invite/${ref.id}`
  }

  async function redeemInvite(token) {
    const inviteRef = doc(db, 'invites', token)
    const inviteSnap = await getDoc(inviteRef)
    if (!inviteSnap.exists()) throw new Error('This invite link does not exist or was revoked.')
    const invite = inviteSnap.data()
    if (invite.used) throw new Error('This invite link was already used.')
    if (invite.expiresAt && Date.now() > invite.expiresAt) throw new Error('This invite link has expired.')

    const memberRef = doc(db, 'workspaceMembers', `${user.uid}_${invite.workspaceId}`)
    await setDoc(memberRef, {
      uid: user.uid,
      workspaceId: invite.workspaceId,
      role: invite.role || 'member',
      email: user.email || '',
      displayName: user.displayName || '',
      joinedAt: serverTimestamp(),
      inviteToken: token,
    })
    await setDoc(inviteRef, { used: true, usedBy: user.uid }, { merge: true })

    switchWorkspace(invite.workspaceId)
    await load()
    return invite.workspaceId
  }

  async function listMembers(workspaceId) {
    const q = query(collection(db, 'workspaceMembers'), where('workspaceId', '==', workspaceId))
    const snap = await getDocs(q)
    return snap.docs.map(d => d.data())
  }

  async function removeMember(uid, workspaceId) {
    await deleteDoc(doc(db, 'workspaceMembers', `${uid}_${workspaceId}`))
  }

  const active = workspaces.find(w => w.workspaceId === activeWorkspaceId)

  return {
    workspaces,
    activeWorkspaceId,
    activeRole: active?.role || 'owner',
    loading,
    switchWorkspace,
    createInvite,
    redeemInvite,
    listMembers,
    removeMember,
    reload: load,
  }
}
