// Migrates ONE user's data from the team Firebase project to the personal one.
//
// Runs as the "Migrate Personal Dashboard Data" GitHub Actions workflow
// (.github/workflows/migrate-personal.yml), triggered manually from the
// Actions tab. It uses the same two service account secrets already needed
// for deploy.yml and deploy-personal.yml, so nothing new has to be pasted
// anywhere, this is a second consumer of credentials that already live in
// the repo's GitHub secrets.
//
// It can also be run locally the same way, if you'd rather:
//   OLD_SERVICE_ACCOUNT=/path/to/old-project-key.json \
//   NEW_SERVICE_ACCOUNT=/path/to/new-project-key.json \
//   GOOGLE_EMAIL=you@example.com \
//   node scripts/migrate-personal.js --dry-run
//
// What it copies, scoped strictly to the given account:
//   - users/{oldUid}            -> users/{newUid}            (the whole config
//     doc: sheet IDs, tabs, Calendly PAT, campaigns, channels board, etc.)
//   - clients/{id} where userId == oldUid
//                                -> clients/{id}              (same doc ID,
//     userId field rewritten to newUid; everything else copied as-is)
//
// What it deliberately does NOT copy, and why:
//   - other users' `users` docs, `workspaceMembers`, `clients`, `invites`
//     records: this is a single-account migration, not a project clone.
//   - workspaceMembers/{newUid}_{newUid}: the app itself creates this on your
//     first sign-in to the new project (see src/hooks/useWorkspace.js), with
//     the correct new uid already in it. Writing it here would risk clobbering
//     that, or racing it, for no benefit.
//   - admins/{uid}: the rules comment marks this collection manual-only
//     ("jen manuálně přes konzoli"), and a single-user instance has no use for
//     the admin bypass anyway, you already own everything in it.
//   - previewLinks: these are share links tied to the OLD site's URL and a
//     denormalized snapshot taken at creation time. A copy would not produce a
//     working link on the new domain. Generate fresh ones from the new
//     dashboard if you need them.
//
// Add --dry-run to see exactly what would be written without writing anything.
//
// Prerequisites this script assumes:
//   1. You have already signed into the NEW dashboard once, so the new
//      project's Auth has your account and useWorkspace.js has already
//      created your workspaceMembers doc there.
//   2. Both service account keys are for projects you actually own; the
//      script refuses to run if OLD and NEW resolve to the same project ID,
//      as a guard against pointing both env vars at the same file by mistake.

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const DRY_RUN = process.argv.includes('--dry-run')

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

function loadKey(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`Could not read/parse service account key at ${path}: ${e.message}`)
    process.exit(1)
  }
}

async function main() {
  const oldKeyPath = requireEnv('OLD_SERVICE_ACCOUNT')
  const newKeyPath = requireEnv('NEW_SERVICE_ACCOUNT')
  const email = requireEnv('GOOGLE_EMAIL')

  const oldKey = loadKey(oldKeyPath)
  const newKey = loadKey(newKeyPath)

  if (oldKey.project_id === newKey.project_id) {
    console.error(`OLD_SERVICE_ACCOUNT and NEW_SERVICE_ACCOUNT both point at project "${oldKey.project_id}". Refusing to run, this looks like a copy-paste mistake rather than two different projects.`)
    process.exit(1)
  }

  const oldApp = admin.initializeApp({ credential: admin.credential.cert(oldKey) }, 'old')
  const newApp = admin.initializeApp({ credential: admin.credential.cert(newKey) }, 'new')
  const oldDb = admin.firestore(oldApp)
  const newDb = admin.firestore(newApp)

  console.log(`Old project: ${oldKey.project_id}`)
  console.log(`New project: ${newKey.project_id}`)
  console.log(DRY_RUN ? 'Mode: DRY RUN (nothing will be written)\n' : 'Mode: LIVE (will write to the new project)\n')

  // --- resolve uids on both sides ------------------------------------------
  let oldUid, newUid
  try {
    oldUid = (await admin.auth(oldApp).getUserByEmail(email)).uid
  } catch (e) {
    console.error(`Could not find ${email} in the OLD project's Auth: ${e.message}`)
    process.exit(1)
  }
  try {
    newUid = (await admin.auth(newApp).getUserByEmail(email)).uid
  } catch (e) {
    console.error(`Could not find ${email} in the NEW project's Auth.`)
    console.error(`Have you signed into the new dashboard at least once yet? That's what creates this account. ${e.message}`)
    process.exit(1)
  }

  console.log(`${email}`)
  console.log(`  old uid: ${oldUid}`)
  console.log(`  new uid: ${newUid}\n`)

  // --- 1. main config doc ---------------------------------------------------
  const userSnap = await oldDb.collection('users').doc(oldUid).get()
  if (!userSnap.exists) {
    console.log('No users/{oldUid} config doc found on the old project. Nothing to migrate there, skipping.')
  } else {
    const cfg = userSnap.data()
    const fields = Object.keys(cfg)
    console.log(`Main config doc: ${fields.length} field(s) -> ${fields.join(', ')}`)
    if (!DRY_RUN) {
      await newDb.collection('users').doc(newUid).set(cfg, { merge: true })
      console.log(`  written to users/${newUid}`)
    }
  }

  // --- 2. clients owned by this account -------------------------------------
  const clientsSnap = await oldDb.collection('clients').where('userId', '==', oldUid).get()
  console.log(`\nClients owned by this account: ${clientsSnap.size}`)
  for (const doc of clientsSnap.docs) {
    const data = { ...doc.data(), userId: newUid }
    console.log(`  ${doc.id}  "${data.name || '(unnamed)'}"`)
    if (!DRY_RUN) {
      await newDb.collection('clients').doc(doc.id).set(data, { merge: true })
    }
  }

  console.log(`\n${DRY_RUN ? 'Dry run complete, nothing was written.' : 'Done.'}`)
  if (DRY_RUN) console.log('Re-run without --dry-run to actually write this to the new project.')
}

main().catch(e => {
  console.error('Migration failed:', e)
  process.exit(1)
})
