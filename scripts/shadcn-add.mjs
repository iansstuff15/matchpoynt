// Wraps `shadcn add`. shadcn 4.22 ships registry items importing `cn` from the
// bare specifier "cn" and installs an unrelated npm package of that name.
// Local files are switched back to the registry's import before the add, so
// unchanged dependencies (e.g. button) compare equal and are skipped instead
// of prompting to overwrite. Afterwards every import points at the `utils`
// alias again and the stray package is removed.
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const uiDir = 'src/components/ui'
const local = 'from "@/utils/cn"'
const registry = 'from "cn"'

function rewriteImports(from, to) {
  for (const file of readdirSync(uiDir)) {
    const path = join(uiDir, file)
    const source = readFileSync(path, 'utf8')
    const next = source.replaceAll(from, to).replace(/from 'cn'/g, to)
    if (next !== source) writeFileSync(path, next)
  }
}

const args = process.argv.slice(2).join(' ')
rewriteImports(local, registry)
try {
  execSync(`pnpm dlx shadcn@latest add ${args}`, { stdio: 'inherit' })
} finally {
  rewriteImports(registry, local)
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  if (pkg.dependencies?.cn) execSync('pnpm remove cn', { stdio: 'inherit' })
}
