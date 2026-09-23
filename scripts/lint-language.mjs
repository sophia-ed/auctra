#!/usr/bin/env node
/**
 * Financial-data language lint (AUCTRA.md Sections 7, 66, 67, 97, 98).
 *
 * Scans product copy for unsupported financial claims, AI-slop vocabulary and
 * copycat positioning. Run with `pnpm lint`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const ROOT = process.cwd()
const TARGETS = ['apps/web/src']
const EXTENSIONS = new Set(['.ts', '.tsx', '.md', '.css'])

const BANNED = [
  { phrase: 'guaranteed', section: '66' },
  { phrase: 'risk-free', section: '66' },
  { phrase: 'risk free', section: '66' },
  { phrase: 'safe investment', section: '66' },
  { phrase: 'fair price', section: '66' },
  { phrase: 'will converge', section: '66' },
  { phrase: 'will rise', section: '66' },
  { phrase: 'will fall', section: '66' },
  { phrase: 'best investment', section: '66' },
  { phrase: 'buy this', section: '66' },
  { phrase: 'sell this', section: '66' },
  { phrase: 'ai-powered', section: '67' },
  { phrase: 'revolutionary', section: '98' },
  { phrase: 'game-changing', section: '98' },
  { phrase: 'next generation', section: '98' },
  { phrase: 'seamless', section: '98' },
  { phrase: 'unlock the future', section: '98' },
  { phrase: 'mispricing', section: '7' },
  { phrase: 'stocklaunch but better', section: '97' },
  { phrase: 'better launchpad', section: '97' },
  { phrase: 'replacement for prestocks', section: '97' },
  { phrase: 'replacement for meteora', section: '97' },
  { phrase: 'ipo prediction engine', section: '97' },
]

function walk(dir, files = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (EXTENSIONS.has(extname(entry))) files.push(full)
  }
  return files
}

const findings = []
for (const target of TARGETS) {
  for (const file of walk(join(ROOT, target))) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, index) => {
      const lower = line.toLowerCase()
      for (const rule of BANNED) {
        if (lower.includes(rule.phrase)) {
          findings.push({
            file: file.replace(`${ROOT}/`, ''),
            line: index + 1,
            phrase: rule.phrase,
            section: rule.section,
          })
        }
      }
    })
  }
}

if (findings.length === 0) {
  console.log(`language lint: clean (${BANNED.length} rules)`)
  process.exit(0)
}

console.error('language lint: banned wording found')
for (const finding of findings) {
  console.error(`  ${finding.file}:${finding.line}  "${finding.phrase}"  (AUCTRA.md Section ${finding.section})`)
}
process.exit(1)
