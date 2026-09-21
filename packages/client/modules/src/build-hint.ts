/**
 * Recovery instructions for missing and stale client bundles: locate the
 * failing package's pnpm workspace and point the rebuild at it. A bundle
 * inside the running harness workspace rebuilds through the harness root
 * scripts; any other package rebuilds in its own workspace, which the harness
 * build never touches.
 * @module @deepseek-ai/dsh-client-modules/build-hint
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** File that marks a pnpm workspace root. */
const WORKSPACE_MARKER = 'pnpm-workspace.yaml'

/**
 * Nearest enclosing directory holding the workspace marker, walked up from `from`.
 * @param from - Absolute directory to walk up from.
 * @returns The workspace root, or undefined when no ancestor holds the marker.
 */
export function enclosingWorkspaceRoot(from: string): string | undefined {
  let directory = from
  for (;;) {
    if (existsSync(join(directory, WORKSPACE_MARKER))) return directory
    const parent = dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
}

/**
 * Recovery instruction for one missing or stale client bundle. A bundle inside
 * the running workspace rebuilds through the harness root scripts; any other
 * bundle rebuilds in the workspace that contains it, and a bundle outside any
 * workspace carries no command (its path is printed beside the instruction).
 * @param clientPath - Absolute path of the missing or stale bundle.
 * @param runningWorkspaceRoot - Workspace root of the running client-modules package, or undefined when it lives outside any workspace.
 * @returns The instruction sentence embedded before the diagnostic detail lines.
 */
export function clientBundleBuildHint(clientPath: string, runningWorkspaceRoot: string | undefined): string {
  const packageWorkspaceRoot = enclosingWorkspaceRoot(dirname(clientPath))
  if (packageWorkspaceRoot === undefined) return 'rebuild the package in its own project before launch'
  if (packageWorkspaceRoot === runningWorkspaceRoot)
    return 'run `pnpm run build:lib:client` (full `pnpm run build` on a clean checkout) before launch'
  return `rebuild the package in its own workspace: run \`pnpm run build\` at ${packageWorkspaceRoot} before launch`
}
