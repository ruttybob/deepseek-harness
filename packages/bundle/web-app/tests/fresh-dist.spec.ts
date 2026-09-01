/** The web shell refuses to serve a frontend dist older than its build inputs. */

import { mkdirSync, mkdtempSync, realpathSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertFreshFrontendDist } from '../src/index.ts'

let root: string | undefined

afterEach(() => {
  if (root !== undefined) rmSync(root, { recursive: true, force: true })
  root = undefined
})

/** Write one file with an mtime shifted by the supplied offset, creating its directory. */
function writeDatedFile(path: string, offsetMs: number, body = 'export const value = true\n'): string {
  root ??= realpathSync(mkdtempSync(join(tmpdir(), 'dsh-web-app-fresh-dist-')))
  const filePath = join(root, path)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, body)
  const shifted = new Date(Date.now() + offsetMs)
  utimesSync(filePath, shifted, shifted)
  return filePath
}

interface BuiltWorkspace {
  distIndex: string
  newestInputPath: string
}

/** Lay out a frontend package plus one workspace dependency it links through node_modules. */
function buildWorkspace(): BuiltWorkspace {
  writeDatedFile('packages/frontend/package.json', 0, JSON.stringify({
    name: '@fixture/frontend',
    dependencies: { '@fixture/dep': 'workspace:^' },
  }))
  const distIndex = writeDatedFile('packages/frontend/dist/index.html', -60_000, '<html></html>')
  const newestInputPath = writeDatedFile('packages/frontend/src/app.ts', -30_000)
  writeDatedFile('packages/dep/package.json', 0, JSON.stringify({ name: '@fixture/dep', main: 'lib/index.js' }))
  writeDatedFile('packages/dep/lib/index.js', -45_000)
  const link = join(root!, 'packages/frontend/node_modules/@fixture/dep')
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(relative(dirname(link), join(root!, 'packages/dep')), link, 'dir')
  return { distIndex, newestInputPath }
}

describe('assertFreshFrontendDist', () => {
  it('fails activation when the dist predates a workspace input', () => {
    const { distIndex, newestInputPath } = buildWorkspace()
    expect(() => { assertFreshFrontendDist(distIndex, root) }).toThrow([
      'web-app: frontend dist older than its inputs; run `pnpm run build` before launch:',
      `  dist: ${distIndex} at ${new Date(statSync(distIndex).mtimeMs).toISOString()}`,
      `  newest input: ${newestInputPath} at ${new Date(statSync(newestInputPath).mtimeMs).toISOString()}`,
    ].join('\n'))
  })

  it('serves a dist that is not older than any input', () => {
    const { distIndex } = buildWorkspace()
    writeDatedFile('packages/frontend/dist/index.html', -10_000, '<html></html>')
    expect(() => { assertFreshFrontendDist(distIndex, root) }).not.toThrow()
  })

  it('counts a workspace dependency lib as an input', () => {
    const { distIndex } = buildWorkspace()
    const depLib = writeDatedFile('packages/dep/lib/index.js', -5_000)
    expect(() => { assertFreshFrontendDist(distIndex, root) }).toThrow(`newest input: ${depLib}`)
  })

  it('ignores dependencies that live outside the workspace packages tree', () => {
    const { distIndex } = buildWorkspace()
    writeDatedFile('packages/frontend/package.json', 0, JSON.stringify({
      name: '@fixture/frontend',
      dependencies: {
        '@fixture/dep': 'workspace:^',
        '@fixture/outside': '^1.0.0',
      },
    }))
    writeDatedFile('node_modules/@fixture/outside/package.json', 0, JSON.stringify({
      name: '@fixture/outside',
      main: 'lib/index.js',
    }))
    writeDatedFile('node_modules/@fixture/outside/lib/index.js', -1_000)
    writeDatedFile('packages/frontend/dist/index.html', -10_000, '<html></html>')
    expect(() => { assertFreshFrontendDist(distIndex, root) }).not.toThrow()
  })

  it('counts a vendored dependency lib as an input', () => {
    const { distIndex } = buildWorkspace()
    writeDatedFile('packages/frontend/package.json', 0, JSON.stringify({
      name: '@fixture/frontend',
      dependencies: {
        '@fixture/dep': 'workspace:^',
        '@fixture/vendored': 'workspace:^',
      },
    }))
    writeDatedFile('vendor/vendored/package.json', 0, JSON.stringify({
      name: '@fixture/vendored',
      main: 'lib/index.js',
    }))
    writeDatedFile('vendor/vendored/lib/index.js', 0)
    const link = join(root!, 'packages/frontend/node_modules/@fixture/vendored')
    mkdirSync(dirname(link), { recursive: true })
    symlinkSync(relative(dirname(link), join(root!, 'vendor/vendored')), link, 'dir')
    expect(() => { assertFreshFrontendDist(distIndex, root) }).toThrow('vendor/vendored/lib/index.js')
  })

  it('skips a dependency that does not resolve', () => {
    const { distIndex } = buildWorkspace()
    writeDatedFile('packages/frontend/package.json', 0, JSON.stringify({
      name: '@fixture/frontend',
      dependencies: { '@fixture/dep': 'workspace:^', '@fixture/absent': '^1.0.0' },
    }))
    writeDatedFile('packages/frontend/dist/index.html', -10_000, '<html></html>')
    expect(() => { assertFreshFrontendDist(distIndex, root) }).not.toThrow()
  })

  it('skips the check when the composition serves no dist', () => {
    const workspace = root ?? realpathSync(mkdtempSync(join(tmpdir(), 'dsh-web-app-fresh-dist-')))
    expect(() => { assertFreshFrontendDist(join(workspace, 'packages/frontend/dist/index.html'), workspace) }).not.toThrow()
  })
})
