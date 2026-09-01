/** Freshness primitives for built artifacts: the newest-source scan and the predates comparison. */

import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { artifactPredates, newestSourceUnder } from '../src/artifact-freshness.ts'

let root: string | undefined

afterEach(() => {
  if (root !== undefined) rmSync(root, { recursive: true, force: true })
  root = undefined
})

/** Write one file with an mtime shifted by the supplied offset, creating its directory. */
function writeDatedFile(directory: string, name: string, offsetMs: number): string {
  root ??= realpathSync(mkdtempSync(join(tmpdir(), 'dsh-artifact-freshness-')))
  const directoryPath = join(root, directory)
  mkdirSync(directoryPath, { recursive: true })
  const filePath = join(directoryPath, name)
  writeFileSync(filePath, 'export const value = true\n')
  const shifted = new Date(Date.now() + offsetMs)
  utimesSync(filePath, shifted, shifted)
  return filePath
}

describe('newestSourceUnder', () => {
  it('returns the newest file when a later root holds it', () => {
    writeDatedFile('early', 'source.ts', -120_000)
    const late = writeDatedFile('late', 'source.ts', -60_000)
    expect(newestSourceUnder([join(root!, 'early'), join(root!, 'late')]))
      .toEqual({ path: late, mtimeMs: statSync(late).mtimeMs })
  })

  it('returns the newest file when an earlier root holds it', () => {
    const late = writeDatedFile('late', 'source.ts', -60_000)
    writeDatedFile('early', 'source.ts', -120_000)
    expect(newestSourceUnder([join(root!, 'late'), join(root!, 'early')]))
      .toEqual({ path: late, mtimeMs: statSync(late).mtimeMs })
  })

  it('scans nested directories and skips the directory entries themselves', () => {
    const nested = writeDatedFile('outer/inner', 'source.ts', 0)
    expect(newestSourceUnder([join(root!, 'outer')])).toEqual({ path: nested, mtimeMs: statSync(nested).mtimeMs })
    expect(readdirSync(join(root!, 'outer'), { recursive: true }).length).toBeGreaterThan(1)
  })

  it('returns undefined when a root does not exist', () => {
    expect(newestSourceUnder([join(tmpdir(), 'dsh-artifact-freshness-missing-root')])).toBeUndefined()
  })

  it('fails loud on a filesystem condition other than a missing root', () => {
    const filePath = writeDatedFile('plain', 'source.ts', 0)
    expect(() => newestSourceUnder([filePath])).toThrow(/ENOTDIR/u)
  })
})

describe('artifactPredates', () => {
  it('reports an artifact stale only when it predates the newest source', () => {
    const newest = { path: '/pkg/src/late.ts', mtimeMs: 5 }
    expect(artifactPredates(5, undefined)).toBe(false)
    expect(artifactPredates(5, newest)).toBe(false)
    expect(artifactPredates(4, newest)).toBe(true)
    expect(artifactPredates(6, newest)).toBe(false)
  })
})
