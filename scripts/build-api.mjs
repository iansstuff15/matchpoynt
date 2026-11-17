// Bundles the API, including @matchpoynt/shared and every dependency, into
// single files so nothing at runtime needs node_modules: server/dist/index.js
// (the Node server, for Docker) and server/dist/vercel/index.js (the Vercel
// Function). dist/vercel/ is self-contained (bundle, codecs and a package.json
// marking it ESM) because Vercel deploys that folder as the function's root.
// `@/` paths come from server/tsconfig.json. Run with `pnpm --filter @matchpoynt/server build`.
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const serverDir = path.resolve(import.meta.dirname, '../server')
// esbuild is a dependency of the server package, not of the workspace root.
const { build } = createRequire(path.join(serverDir, 'package.json'))('esbuild')

await build({
  absWorkingDir: serverDir,
  tsconfig: path.join(serverDir, 'tsconfig.json'),
  entryPoints: { index: 'src/index.ts', 'vercel/index': 'src/vercel.ts' },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: true,
  banner: {
    // Aliased, so source files that import createRequire themselves don't clash with it.
    js: "import { createRequire as __gpCreateRequire } from 'node:module'; const require = __gpCreateRequire(import.meta.url);",
  },
})

// Photo codecs are WebAssembly (server/src/utils/image/webp.ts). esbuild can't
// inline them, so every jSquash .wasm file goes to a wasm/ folder next to each bundle.
const wasmOuts = ['dist/wasm', 'dist/vercel/wasm'].map((dir) => path.join(serverDir, dir))
for (const dir of wasmOuts) mkdirSync(dir, { recursive: true })
const jsquash = path.join(serverDir, 'node_modules/@jsquash')
for (const pkg of readdirSync(jsquash)) {
  const codecDir = path.join(path.dirname(createRequire(path.join(serverDir, 'package.json')).resolve(`@jsquash/${pkg}/package.json`)), 'codec')
  for (const entry of readdirSync(codecDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.wasm')) continue
    for (const dir of wasmOuts) copyFileSync(path.join(entry.parentPath, entry.name), path.join(dir, entry.name))
  }
}
console.log(`📦 ${new Date().toISOString()} copied photo codecs to ${wasmOuts.map((dir) => `${path.relative(serverDir, dir)}/`).join(' and ')}`)

// Vercel runs dist/vercel/index.js without server/package.json beside it, so the
// folder says it's ESM itself.
writeFileSync(path.join(serverDir, 'dist/vercel/package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`)
console.log(`📦 ${new Date().toISOString()} wrote dist/vercel/package.json`)
