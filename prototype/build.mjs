// Build the bd panel UX prototype: inject the real DSH theme token sheets and
// the real .beads/ snapshot into the hand-written template. Throwaway tooling
// for wayfinder ticket dsh-01e.4.
// Usage: node prototype/build.mjs   (run from the repo root)
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const template = readFileSync(join(here, 'bd-panel-ux.template.html'), 'utf8')
const theme = readFileSync(join(root, 'packages/client/ui-theme/src/styles/design-platform.css'), 'utf8')
const base = readFileSync(join(root, 'packages/client/ui-theme/src/styles/base.css'), 'utf8')

const listJson = execFileSync('bd', ['list', '--all', '--json', '-n', '0'], { cwd: root, encoding: 'utf8' })
const issues = JSON.parse(listJson)

// Comments live outside `bd list`; collect them per issue via `bd show`.
const comments = {}
for (const i of issues) {
  const shown = JSON.parse(execFileSync('bd', ['show', i.id, '--json', '--include-comments'], { cwd: root, encoding: 'utf8' }))
  const entry = Array.isArray(shown) ? shown[0] : shown
  if ((entry.comments || []).length) comments[i.id] = entry.comments
}

const data = JSON.stringify({ generatedAt: new Date().toISOString(), issues, comments })
  .replace(/<\/script/gi, '<\\/script')

const html = template
  .replace('/* __THEME_CSS__ */', '/* ===== real ui-theme design-platform.css (tokens, light + dark) ===== */\n' + theme)
  .replace('/* __BASE_CSS__ */', '/* ===== real ui-theme base.css (font stacks) ===== */\n' + base)
  .replace('__BD_DATA__', () => data)

writeFileSync(join(here, 'bd-panel-ux.html'), html)
console.log(`built prototype/bd-panel-ux.html — ${issues.length} issues, ${Object.keys(comments).length} commented`)
