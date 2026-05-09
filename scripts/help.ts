const scripts: [string, string][] = [
  ['setup', 'Install deps + build all packages — run this after every clone or pull'],
  ['validate', 'Typecheck + lint + test — run before pushing'],
  ['build', 'Build all workspace packages'],
  ['typecheck', 'Full TypeScript type-check (tsc --noEmit)'],
  ['test', 'Run all tests across every workspace'],
  ['dev:all', 'Start API + web-client dev servers together'],
  ['dev:api', 'Start the API dev server only (port 3001)'],
  ['dev:client', 'Start the web-client dev server only'],
  ['eslint:lint', 'Lint the whole codebase'],
  ['eslint:fix', 'Lint + auto-fix the whole codebase'],
  ['help', 'Show this message'],
]

const pad = Math.max(...scripts.map(([name]) => name.length)) + 2

console.log('\nUsage: bun run <script>\n')
for (const [name, desc] of scripts) {
  console.log(`  ${name.padEnd(pad)}${desc}`)
}
console.log()
