import * as fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

let cachedApex: string | null = null

export function loadApexChartsBundle(): string {
  if (cachedApex !== null) return cachedApex
  const path = require.resolve('apexcharts/dist/apexcharts.min.js')
  cachedApex = fs.readFileSync(path, 'utf-8')
  return cachedApex
}
