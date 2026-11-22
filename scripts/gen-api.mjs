// Refreshes the two generated API files from a running backend:
//   openapi.snapshot.json    (read by the contract and units tests, so they need no backend)
//   src/types/openapi.gen.ts (the raw API types)
// Usage: npm run gen:api            (backend on http://localhost:8000)
//        API_URL=http://localhost:8010 npm run gen:api
// Both files are written to temporary names first and moved into place only when the whole run worked, so a failed
// fetch or generation never leaves a snapshot that disagrees with the types.
import { execFileSync } from 'node:child_process'
import { renameSync, rmSync, writeFileSync } from 'node:fs'

const SNAPSHOT = 'openapi.snapshot.json'
const TYPES = 'src/types/openapi.gen.ts'
const base = (process.env.API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

try {
  const res = await fetch(`${base}/openapi.json`)
  if (!res.ok) throw new Error(`GET ${base}/openapi.json answered ${res.status}`)
  // Pretty-printed so a refresh shows only real changes in git.
  writeFileSync(`${SNAPSHOT}.tmp`, JSON.stringify(await res.json(), null, 2) + '\n')
  execFileSync(
    process.execPath,
    ['node_modules/openapi-typescript/bin/cli.js', `${SNAPSHOT}.tmp`, '-o', `${TYPES}.tmp`],
    { stdio: 'inherit' },
  )
  renameSync(`${SNAPSHOT}.tmp`, SNAPSHOT)
  renameSync(`${TYPES}.tmp`, TYPES)
} catch (error) {
  console.error(`gen:api failed, nothing was changed: ${error.message}`)
  process.exitCode = 1
} finally {
  rmSync(`${SNAPSHOT}.tmp`, { force: true })
  rmSync(`${TYPES}.tmp`, { force: true })
}
