/**
 * End-to-end run against a real backend on a seeded scratch database: `npm run test:e2e [playwright args]`.
 *
 *   1. seeds a scratch database and starts a backend on it (`scratch-backend.mjs`);
 *   2. starts the Vite dev server, pointed at that backend;
 *   3. runs Playwright (the specs in `e2e/`, one at a time);
 *   4. always stops both servers and removes the scratch folder, and exits with Playwright's exit code.
 *
 * The backend needs the seed that has a record for every write flow, accounts that reinvest dividends, and the agent outputs of one
 * stock (backend PRs 243, 244 and 247). Set `E2E_KEEP=1` to keep the scratch folder and the server logs.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { freePort, frontend, start, startScratchBackend, waitFor } from './scratch-backend.mjs'

const apiUrl = await startScratchBackend('e2e')
const webPort = await freePort()

start(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--port', String(webPort), '--strictPort'], 'vite.log', {
  cwd: frontend,
  // Both addresses are given, so no `.env` can send these tests (they write) anywhere but the scratch backend: the app calls
  // the dev server, which forwards to it. (A real value: an empty variable may not survive starting a process on Windows.)
  env: { ...process.env, VITE_API_BASE_URL: `http://localhost:${webPort}`, VITE_API_PROXY_TARGET: apiUrl },
})
await waitFor(`http://localhost:${webPort}/`, 'the dev server')

console.log(`e2e: backend ${apiUrl}, app :${webPort}`)
const run = spawnSync(process.execPath, [path.join(frontend, 'node_modules/@playwright/test/cli.js'), 'test', ...process.argv.slice(2)], {
  cwd: frontend,
  env: { ...process.env, E2E_BASE_URL: `http://localhost:${webPort}`, E2E_API_URL: apiUrl },
  stdio: 'inherit',
})
process.exit(run.status ?? 1)
