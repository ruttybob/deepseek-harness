/** Assembled keyless snapshot for the web profile's routed durable medium: the
 * Projection cache checkpoint domain must materialize the per-record sqlite
 * medium (`storages/projcache.db`) and never the json medium file at boot. */

import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { execa } from 'execa'
import { afterEach, describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const builtBin = join(repoRoot, 'apps/cli/lib/bin.js')
const frontendIndex = join(repoRoot, 'apps/web/dist/index.html')
const openerHook = new URL('./fixtures/web-browser-open/register.mjs', import.meta.url).href
const tempRoots: string[] = []
const builtArtifactsExist = existsSync(builtBin) && existsSync(frontendIndex)

if (process.env.DSH_EXAMPLE_MODE === 'lib' && !builtArtifactsExist) {
  throw new Error('dsh web projcache storage snapshot requires built CLI and Web artifacts in lib mode')
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe.skipIf(!builtArtifactsExist)('dsh web routed projection-cache medium snapshot', () => {
  it('materializes the routed sqlite medium and skips the json medium file', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-web-projcache-snapshot-'))
    tempRoots.push(root)
    const result = await execa(process.execPath, [
      '--import', openerHook,
      builtBin,
      'web',
      '--port', '0',
    ], {
      cwd: root,
      env: {
        ...process.env,
        DEEPSEEK_API_KEY: 'keyless-projcache-no-call',
        DSH_AGENTS_HOME: join(root, '.agents'),
        DSH_BROWSER_OPEN_TEST_EXIT_ON_READY: '1',
        DSH_HOME: join(root, '.dsh'),
        DSH_TELEMETRY_DISABLED: '1',
        NODE_NO_WARNINGS: '1',
        SSH_CONNECTION: '10.0.0.2 55000 10.0.0.9 22',
        SSH_TTY: '',
      },
      input: '',
      timeout: 30_000,
      killSignal: 'SIGKILL',
      reject: false,
    })
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')

    const storages = join(root, '.dsh', 'storages')
    const dbPath = join(storages, 'projcache.db')
    expect(existsSync(dbPath)).toBe(true)
    // The route carries the checkpoint domain away from the json default.
    expect(existsSync(join(storages, 'session_projcache.json'))).toBe(false)

    const db = new DatabaseSync(dbPath)
    try {
      const unit = db.prepare("SELECT version FROM units WHERE name = 'session_projcache'").get() as
        | { version: number }
        | undefined
      const checkpointTable = db.prepare(
        "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'u_session_projcache_sessions'",
      ).get() as { count: number }
      expect({
        unitVersion: unit?.version,
        checkpointTable: checkpointTable.count === 1,
        jsonMediumFile: existsSync(join(storages, 'session_projcache.json')),
      }).toMatchInlineSnapshot(`
        {
          "checkpointTable": true,
          "jsonMediumFile": false,
          "unitVersion": 3,
        }
      `)
    } finally {
      db.close()
    }
  }, 30_000)
})
