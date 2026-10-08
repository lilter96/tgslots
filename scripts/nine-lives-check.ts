import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { SIM_CONFIG } from '../packages/games/nine-lives/src/index'
const text = await readFile(
  new URL('../packages/games/nine-lives/config/config.json', import.meta.url),
  'utf8',
)
const audit = JSON.parse(
  await readFile(
    new URL('../packages/games/nine-lives/config/math-audit.json', import.meta.url),
    'utf8',
  ),
) as { configurationSha256: string; results: { mode: string; summary: { rtp: number } }[] }
if (createHash('sha256').update(text).digest('hex') !== audit.configurationSha256)
  throw new Error('Nine Lives audit is stale; rerun the audit')
for (const mode of ['base', 'buy'])
  if (!audit.results.some((result) => result.mode === mode))
    throw new Error(`Nine Lives ${mode} audit is missing`)
for (const result of audit.results)
  if (
    Math.abs(result.summary.rtp - SIM_CONFIG.parsheet.targetRTP) > SIM_CONFIG.parsheet.rtpTolerance
  )
    throw new Error(`Nine Lives ${result.mode} RTP outside tolerance`)
console.log('Nine Lives math audit matches the configuration')
