#!/usr/bin/env node
/**
 * Section 31 version safety.
 *
 * Fails clearly when the installed Meteora DBC SDK drifts from the pin recorded
 * in docs/sdk-versions.md. Resolves the package entry and walks up to its
 * package.json, because the package's `exports` map does not expose it.
 */
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const EXPECTED_DBC_SDK = '1.5.12'
const MIN_NODE = [20, 9]
const SDK = '@meteora-ag/dynamic-bonding-curve-sdk'

// Resolve from packages/meteora, where the SDK is a dependency.
const require = createRequire(join(process.cwd(), 'packages', 'meteora', 'package.json'))

function installedVersion(name) {
  try {
    let dir = dirname(require.resolve(name))
    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = join(dir, 'package.json')
      if (existsSync(candidate)) {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8'))
        if (pkg.name === name) return pkg.version ?? null
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return null
  } catch {
    return null
  }
}

function checkNode() {
  const [major, minor] = process.versions.node.split('.').map(Number)
  const [minMajor, minMinor] = MIN_NODE
  const ok = major > minMajor || (major === minMajor && minor >= minMinor)
  console.log(`  node ${process.versions.node} (>= ${MIN_NODE.join('.')}): ${ok ? 'OK' : 'TOO OLD'}`)
  return ok
}

console.log('Auctra version check')

let ok = checkNode()

const sdk = installedVersion(SDK)
console.log(`  ${SDK} expected ${EXPECTED_DBC_SDK}, installed ${sdk ?? 'not installed'}`)
if (sdk === null) {
  console.error('  -> FAIL: the Meteora DBC SDK is a dependency and could not be resolved.')
  ok = false
} else if (sdk !== EXPECTED_DBC_SDK) {
  console.error('  -> FAIL: version mismatch. Verify the SDK, then update docs/sdk-versions.md.')
  ok = false
} else {
  console.log('  -> OK')
}

process.exit(ok ? 0 : 1)
