/**
 * Built-artifact freshness: the newest source mtime under a set of roots and
 * the predates comparison shared by boot diagnostics. A published package
 * ships no `src`, so a missing root contributes nothing instead of failing.
 * @module @deepseek-ai/dsh-client-modules/artifact-freshness
 */

import { readdirSync, statSync, type Dirent } from 'node:fs'
import { join } from 'node:path'

/** The newest file under a set of roots, as a path plus its modification time. */
export interface NewestSource {
  /** Absolute path of the newest file. */
  path: string
  /** Modification time in milliseconds. */
  mtimeMs: number
}

/**
 * Newest file under any of the roots, recursive.
 * @param roots - Absolute directories to scan; a missing root contributes nothing.
 * @returns The newest file, or undefined when no root exists or no root holds a file.
 */
export function newestSourceUnder(roots: readonly string[]): NewestSource | undefined {
  let newest: NewestSource | undefined
  for (const root of roots) {
    let entries: Dirent[]
    try {
      entries = readdirSync(root, { recursive: true, withFileTypes: true })
    } catch (error) {
      // Only a missing root is expected (a published package ships no `src`);
      // any other filesystem error is a real condition and fails loud.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      continue
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const path = join(entry.parentPath, entry.name)
      const mtimeMs = statSync(path).mtimeMs
      if (newest === undefined || mtimeMs > newest.mtimeMs) newest = { path, mtimeMs }
    }
  }
  return newest
}

/**
 * Whether an artifact was built before the newest source under its roots.
 * Equal times stay fresh: coarse filesystem mtime resolution must not demand a rebuild.
 * @param artifactMtimeMs - Modification time of the built artifact in milliseconds.
 * @param newest - Newest source under the artifact's source roots, or undefined when none exists.
 * @returns Whether the artifact predates the newest source.
 */
export function artifactPredates(artifactMtimeMs: number, newest: NewestSource | undefined): boolean {
  return newest !== undefined && artifactMtimeMs < newest.mtimeMs
}
