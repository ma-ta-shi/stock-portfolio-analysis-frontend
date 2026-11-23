// Refreshes the frontend's two generated API files from a running backend:
//   src/types/openapi.gen.ts      the API's TypeScript types (openapi-typescript)
//   src/types/api-routes.gen.json every "METHOD /path" the backend serves ({} for a path parameter)
// Usage: npm run gen:api            (backend on http://localhost:8000)
//        API_URL=http://localhost:8010 npm run gen:api
// The API's documentation is the backend's generated reference (backend/docs/api-reference.md), built from the same
// schema; nothing is copied here.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const base = (process.env.API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const url = `${base}/openapi.json`

try {
  // Types first: the generator writes nothing when it fails, so a down backend changes nothing.
  execFileSync(process.execPath, ['node_modules/openapi-typescript/bin/cli.js', url, '-o', 'src/types/openapi.gen.ts'], {
    stdio: 'inherit',
  })
  const { paths } = await (await fetch(url)).json()
  const routes = Object.entries(paths)
    .flatMap(([path, item]) =>
      ['get', 'post', 'put', 'patch', 'delete']
        .filter((method) => method in item)
        .map((method) => `${method.toUpperCase()} ${path.replace(/\{[^}]+\}/g, '{}')}`),
    )
    .sort()
  writeFileSync('src/types/api-routes.gen.json', JSON.stringify(routes, null, 2) + '\n')
} catch (error) {
  console.error(`gen:api failed: ${error.message}`)
  process.exitCode = 1
}
