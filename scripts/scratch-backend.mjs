/**
 * A backend of our own, on a database seeded with invented data, for anything that needs real responses (the browser tests and the
 * fixture recorder). Nothing here can be pointed at another backend or database: nobody's records reach a test or a recording.
 *
 *   makes a scratch folder in the OS temp folder, seeds a database in it with `<backend>/scripts/seed_e2e.py` (which refuses
 *   `app.db`), and starts the backend on it (`DATABASE_URL`). Servers are stopped and the folder removed however the script ends.
 *
 * Needs the backend checkout next to this folder (`../backend`, or `BACKEND_DIR`) with its virtual environment (`.venv`).
 * Set `E2E_KEEP=1` to keep the scratch folder and the server logs.
 */
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.resolve(process.env.BACKEND_DIR ?? path.join(frontend, '..', 'backend'))
const python = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

const children = []
const logs = []
let scratch = null
let cleaned = false
let name = 'scratch'

function fail(message) {
  console.error(`${name}: ${message}`)
  process.exit(1) // the 'exit' hook cleans up
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

export async function waitFor(url, what, seconds = 90) {
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

/** Starts a server that is stopped when the script ends, writing its output to `<scratch>/<logName>`. */
export function start(command, args, logName, options) {
  const log = openSync(path.join(scratch, logName), 'w')
  logs.push(log)
  children.push(spawn(command, args, { ...options, stdio: ['ignore', log, log], detached: process.platform !== 'win32' }))
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

/** Stops the servers and removes the scratch folder; safe to call twice. */
function cleanup() {
  if (cleaned) return
  cleaned = true
  for (const child of children) stop(child)
  for (const log of logs) closeSync(log)
  if (scratch && process.env.E2E_KEEP !== '1') rmSync(scratch, { recursive: true, force: true })
  else if (scratch) console.log(`${name}: kept ${scratch}`)
}

/**
 * What the backend must not take from this computer: its database, its stored runs and replays, and the person named in its
 * settings. A value already set wins over `backend/.env`.
 */
function isolated(db) {
  return {
    DATABASE_URL: `sqlite:///${db.replaceAll('\\', '/')}`,
    SP_RUNS_DIR: path.join(scratch, 'runs'),
    SP_BUNDLES_DIR: path.join(scratch, 'bundles'),
    SP_REPLAYS_DIR: path.join(scratch, 'replays'),
    SP_EDGAR_IDENTITY: 'Scratch Backend scratch@example.com',
  }
}

/** Seeds a scratch database and starts the backend on it. Returns the backend's address. */
export async function startScratchBackend(caller, seedOptions = []) {
  name = caller
  // However the script ends (an error thrown after the servers started, Ctrl+C, a kill), nothing is left running or on disk.
  process.on('exit', cleanup)
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130))

  if (!existsSync(python)) fail(`the backend's Python is not at ${python} (set BACKEND_DIR to the backend checkout)`)
  scratch = mkdtempSync(path.join(os.tmpdir(), `${caller}-`))
  if (!path.resolve(scratch).startsWith(path.resolve(os.tmpdir()))) fail(`the scratch folder ${scratch} is not inside the OS temp folder`)
  const db = path.join(scratch, 'scratch.db')

  console.log(`${name}: seeding ${db}`)
  const seeded = spawnSync(python, ['scripts/seed_e2e.py', '--db', db, ...seedOptions], { cwd: backend, stdio: 'inherit' })
  if (seeded.status !== 0) fail('the seed failed')

  const port = await freePort()
  start(python, ['-m', 'uvicorn', 'api.main:app', '--app-dir', 'src', '--port', String(port)], 'backend.log', {
    cwd: backend,
    env: { ...process.env, ...isolated(db) },
  })
  const url = `http://127.0.0.1:${port}`
  await waitFor(`${url}/api/users`, 'the backend')
  return url
}
