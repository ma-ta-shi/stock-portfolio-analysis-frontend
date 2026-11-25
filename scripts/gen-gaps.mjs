// Writes docs/gap-register.md from src/lib/gaps.json, so the register and the code that cites a gap id cannot differ.
// Usage: npm run gen:gaps              (write the document)
//        npm run gen:gaps -- --check   (write nothing; exit 1 when the document is out of date)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const OUT = 'docs/gap-register.md'
const check = process.argv.includes('--check')
const lf = (text) => text.replace(/\r\n/g, '\n')

const gaps = JSON.parse(readFileSync('src/lib/gaps.json', 'utf8'))
const kinds = {
  'not-connected': 'Not connected (a control that shows an error until its ticket)',
  missing: 'Missing (data or behaviour the screen needs and does not have)',
  documented: 'Documented difference (a deliberate choice)',
}
const cell = (text) => text.replaceAll('|', '\\|')

const lines = [
  '# Gap register',
  '',
  'Generated from `src/lib/gaps.json` by `npm run gen:gaps`; do not edit. Every place the frontend cannot show or do what the owner',
  'expects, with why and the ClickUp ticket that closes it. The code cites these ids (`notConnected(id)`, "unavailable (id)").',
  '',
]
for (const [kind, title] of Object.entries(kinds)) {
  const rows = Object.entries(gaps)
    .filter(([, gap]) => gap.kind === kind)
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
  if (!rows.length) continue
  lines.push(`## ${title}`, '', '| Id | Screen | What | Why | Ticket |', '|---|---|---|---|---|')
  for (const [id, gap] of rows) {
    lines.push(`| ${id} | ${gap.screen} | ${cell(gap.what)} | ${cell(gap.why)} | [${gap.ticket}](https://app.clickup.com/t/${gap.ticket}) |`)
  }
  lines.push('')
}
const text = lines.join('\n')

if (check) {
  if (!existsSync(OUT) || lf(readFileSync(OUT, 'utf8')) !== text) {
    console.error('gen:gaps --check: docs/gap-register.md is out of date. Run `npm run gen:gaps` and commit it.')
    process.exitCode = 1
  }
} else {
  mkdirSync('docs', { recursive: true })
  writeFileSync(OUT, text)
}
