/** Workspace-scoped recovery instructions for missing and stale client bundles. */

import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { clientBundleBuildHint, enclosingWorkspaceRoot } from '../src/build-hint.ts'

let root: string | undefined

afterEach(() => {
  if (root !== undefined) rmSync(root, { recursive: true, force: true })
  root = undefined
})

/** Create a pnpm workspace root containing the supplied relative package directory. */
function writeWorkspace(relativePackageDirectory: string): { workspaceRoot: string; packageDirectory: string } {
  root ??= realpathSync(mkdtempSync(join(tmpdir(), 'dsh-client-build-hint-')))
  const workspaceRoot = join(root, 'workspace')
  const packageDirectory = join(workspaceRoot, relativePackageDirectory)
  mkdirSync(packageDirectory, { recursive: true })
  writeFileSync(join(workspaceRoot, 'pnpm-workspace.yaml'), 'packages:\n  - .\n')
  return { workspaceRoot, packageDirectory }
}

describe('enclosingWorkspaceRoot', () => {
  it('returns the nearest directory holding the workspace marker', () => {
    const { workspaceRoot, packageDirectory } = writeWorkspace('pkg/lib')
    expect(enclosingWorkspaceRoot(packageDirectory)).toBe(workspaceRoot)
  })

  it('returns undefined when no ancestor holds the marker', () => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-client-build-hint-bare-')))
    expect(enclosingWorkspaceRoot(join(root, 'pkg', 'lib'))).toBeUndefined()
  })
})

describe('clientBundleBuildHint', () => {
  it('names the harness root build when the package shares the running workspace', () => {
    const { workspaceRoot, packageDirectory } = writeWorkspace('pkg/lib')
    expect(clientBundleBuildHint(join(packageDirectory, 'client.js'), workspaceRoot))
      .toBe('run `pnpm run build:lib:client` (full `pnpm run build` on a clean checkout) before launch')
  })

  it('names the package workspace when it differs from the running workspace', () => {
    const { workspaceRoot, packageDirectory } = writeWorkspace('pkg/lib')
    expect(clientBundleBuildHint(join(packageDirectory, 'client.js'), join(root!, 'other-workspace')))
      .toBe(`rebuild the package in its own workspace: run \`pnpm run build\` at ${workspaceRoot} before launch`)
  })

  it('names the package workspace even when the running package lives outside any workspace', () => {
    const { workspaceRoot, packageDirectory } = writeWorkspace('pkg/lib')
    expect(clientBundleBuildHint(join(packageDirectory, 'client.js'), undefined))
      .toBe(`rebuild the package in its own workspace: run \`pnpm run build\` at ${workspaceRoot} before launch`)
  })

  it('carries no command when the package sits outside any workspace', () => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-client-build-hint-bare-')))
    expect(clientBundleBuildHint(join(root, 'pkg', 'lib', 'client.js'), root))
      .toBe('rebuild the package in its own project before launch')
  })
})
