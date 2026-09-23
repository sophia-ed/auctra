#!/usr/bin/env node
/**
 * Section 31 version safety.
 *
 * Fails clearly when the installed Meteora DBC SDK drifts from the pin recorded
 * in docs/sdk-versions.md. If the SDK is not installed yet (this is the
 * domain-core phase), it reports that and exits 0.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const EXPECTED_DBC_SDK = '1.5.12'
const MIN_NODE = [20, 9]

const require = createRequire(import.meta.url)

function installedVersion(name) {
  try {
    const pkgPath = require.resolve(`${name}/package.json`)
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version ?? null
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

const sdk = installedVersion('@meteora-ag/dynamic-bonding-curve-sdk')
console.log(
  `  @meteora-ag/dynamic-bonding-curve-sdk expected ${EXPECTED_DBC_SDK}, installed ${sdk ?? 'not installed'}`,
)
if (sdk === null) {
  console.log('  -> SDK not installed (domain-core phase). Adapter uses the documented surface.')
} else if (sdk !== EXPECTED_DBC_SDK) {
  console.error('  -> FAIL: version mismatch. Verify the SDK, then update docs/sdk-versions.md.')
  ok = false
} else {
  console.log('  -> OK')
}

process.exit(ok ? 0 : 1)
