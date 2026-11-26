/**
 * End-to-end run against a real backend on a seeded scratch database: `npm run test:e2e:live [playwright args]`.
 *
 *   1. makes a scratch database in the OS temp folder and seeds it with `<backend>/scripts/seed_e2e.py` (which refuses `app.db`);
 *   2. starts the backend on it (`DATABASE_URL`) and the Vite dev server in live mode, pointed at that backend;
 *   3. runs Playwright with `E2E_LIVE=1` (the specs in `e2e-live/`, one at a time);
 *   4. always stops both servers and removes the scratch folder (also after an error or Ctrl+C), and exits with Playwright's exit code.
 *
 * Needs the backend checkout next to this folder (`../backend`, or `BACKEND_DIR`) with its virtual environment (`.venv`) and the
 * seed that has a record for every write flow, accounts that reinvest dividends, and the agent outputs of one stock (backend PRs 243, 244 and 247). It never opens the real database: the path is checked to be inside
 * the OS temp folder before anything runs. Set `E2E_KEEP=1` to keep the scratch folder and the server logs.
 */
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.resolve(process.env.BACKEND_DIR ?? path.join(frontend, '..', 'backend'))
const python = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

const children = []

function fail(message) {
  console.error(`e2e-live: ${message}`)
  cleanup()
  process.exit(1)
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function waitFor(url, what, seconds = 90) {
  const deadline = Date.now() + seconds * 1000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  fail(`${what} did not answer at ${url} within ${seconds}s`)
}

function start(command, args, options) {
  const child = spawn(command, args, { ...options, detached: process.platform !== 'win32' })
  children.push(child)
  return child
}

function stop(child) {
  if (child.exitCode !== null || !child.pid) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else {
    try {
      process.kill(-child.pid)
    } catch {
      // already gone
    }
  }
}

let scratch = null
let cleaned = false
/** Stops both servers and removes the scratch folder; safe to call twice (it also runs on every way out: see the 'exit' hook). */
function cleanup() {
  if (cleaned) return
  cleaned = true
  for (const child of children) stop(child)
  if (scratch && process.env.E2E_KEEP !== '1') rmSync(scratch, { recursive: true, force: true })
  else if (scratch) console.log(`e2e-live: kept ${scratch}`)
}
// However the script ends (an error thrown after the servers started, Ctrl+C, a kill), nothing is left running or on disk.
process.on('exit', cleanup)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130))

if (!existsSync(python)) fail(`the backend's Python is not at ${python} (set BACKEND_DIR to the backend checkout)`)

scratch = mkdtempSync(path.join(os.tmpdir(), 'e2e-live-'))
if (!path.resolve(scratch).startsWith(path.resolve(os.tmpdir()))) fail(`the scratch folder ${scratch} is not inside the OS temp folder`)
const db = path.join(scratch, 'e2e.db')

console.log(`e2e-live: seeding ${db}`)
const seeded = spawnSync(python, ['scripts/seed_e2e.py', '--db', db], { cwd: backend, stdio: 'inherit' })
if (seeded.status !== 0) fail('the seed failed')

const apiPort = await freePort()
const webPort = await freePort()
const log = (name) => openSync(path.join(scratch, name), 'w')
const apiLog = log('backend.log')
const webLog = log('vite.log')

start(python, ['-m', 'uvicorn', 'api.main:app', '--app-dir', 'src', '--port', String(apiPort)], {
  cwd: backend,
  env: { ...process.env, DATABASE_URL: `sqlite:///${db.replaceAll('\\', '/')}` },
  stdio: ['ignore', apiLog, apiLog],
})
await waitFor(`http://127.0.0.1:${apiPort}/api/users`, 'the backend')

start(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--mode', 'live', '--port', String(webPort), '--strictPort'], {
  cwd: frontend,
  env: { ...process.env, VITE_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` },
  stdio: ['ignore', webLog, webLog],
})
await waitFor(`http://localhost:${webPort}/`, 'the dev server')

console.log(`e2e-live: backend :${apiPort}, app :${webPort}`)
const run = spawnSync(process.execPath, [path.join(frontend, 'node_modules/@playwright/test/cli.js'), 'test', ...process.argv.slice(2)], {
  cwd: frontend,
  env: { ...process.env, E2E_LIVE: '1', E2E_BASE_URL: `http://localhost:${webPort}`, E2E_API_URL: `http://127.0.0.1:${apiPort}` },
  stdio: 'inherit',
})

closeSync(apiLog)
closeSync(webLog)
process.exit(run.status ?? 1)
