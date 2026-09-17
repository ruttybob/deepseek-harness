import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { describe, expect, it } from 'vitest'

/**
 * Keyless smoke for SOURCE `dsh` execution: run `apps/cli/src/bin.ts`
 * with the exact production runtime vector (`node --import tsx/esm` plus the
 * `TSX_TSCONFIG_PATH` facade the root `dsh` script invokes) and assert the
 * required-config diagnostic. The Node compatibility matrix runs this
 * WHOLE file, so a Node release changing module hooks or TypeScript handling
 * breaks this gate instead of every developer's `pnpm dsh`; the built-bin
 * suite covers the published `lib/` entry, not this source chain.
 *
 * The runtime tsconfig resolves bare imports through package `exports`, so the
 * launch needs built `lib/` output; the launch case self-skips where a lane
 * runs the ordinary inventory unbuilt, while the Node compatibility gate
 * builds first.
 */

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const dshSourceBin = 'apps/cli/src/bin.ts'
const runtimeTsconfig = 'tsconfig.runtime.json'
const builtRuntimeEntry = join(repoRoot, 'apps/cli/lib/bin.js')

describe('dsh SOURCE launcher (node --import tsx/esm)', () => {
  it('declares the production runtime vector in the root dsh script', async () => {
    const rootPackage = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as {
      readonly scripts?: Record<string, string>
    }
    expect(rootPackage.scripts?.dsh).toBe(
      `TSX_TSCONFIG_PATH=${runtimeTsconfig} node --import tsx/esm ${dshSourceBin}`,
    )
  })

  it.skipIf(!existsSync(builtRuntimeEntry))('boots the source entry and requires a profile', async () => {
    const result = await execa(process.execPath, ['--import', 'tsx/esm', dshSourceBin], {
      cwd: repoRoot,
      input: '',
      env: { ...process.env, TSX_TSCONFIG_PATH: runtimeTsconfig },
      timeout: 25_000,
      killSignal: 'SIGKILL',
      reject: false,
    })
    if (result.timedOut) {
      throw new Error(`dsh source launch did not exit within 25s. stdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
    }
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('--profile <name> is required')
    expect(result.stdout).toBe('')
  }, 30_000)
})
