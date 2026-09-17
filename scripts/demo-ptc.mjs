/** Run one headless task through the shipped PTC mode composition. Requires a model credential. */
import { spawn } from 'node:child_process'

const task = process.argv.slice(2).join(' ').trim()
  || 'Inspect this repository with PTC mode and report its top-level architecture.'

const child = spawn(process.execPath, [
  '--import',
  'tsx/esm',
  'apps/cli/src/bin.ts',
  '--profile',
  'headless',
  task,
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DSH_TOOLS_MODE: 'ptc',
    // Same resolution facade as the `dsh` script: bare imports must resolve
    // through package exports, not the source `paths` map, or built bundles
    // and their source copies load as two module identities.
    TSX_TSCONFIG_PATH: 'tsconfig.runtime.json',
  },
})
child.on('exit', (code, signal) => { process.exit(signal !== null ? 1 : code ?? 1) })
