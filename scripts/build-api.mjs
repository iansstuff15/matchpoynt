// Bundles the API, including @matchpoynt/shared and every dependency, into one
// file (server/dist/index.js) so the runtime image needs no node_modules.
// `@/` paths come from server/tsconfig.json. Run with `pnpm --filter @matchpoynt/server build`.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const serverDir = path.resolve(import.meta.dirname, '../server')
// esbuild is a dependency of the server package, not of the workspace root.
const { build } = createRequire(path.join(serverDir, 'package.json'))('esbuild')

await build({
  absWorkingDir: serverDir,
  tsconfig: path.join(serverDir, 'tsconfig.json'),
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
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
// inline them, so every jSquash .wasm file goes to dist/wasm, next to the bundle.
const wasmOut = path.join(serverDir, 'dist/wasm')
mkdirSync(wasmOut, { recursive: true })
const jsquash = path.join(serverDir, 'node_modules/@jsquash')
for (const pkg of readdirSync(jsquash)) {
  const codecDir = path.join(path.dirname(createRequire(path.join(serverDir, 'package.json')).resolve(`@jsquash/${pkg}/package.json`)), 'codec')
  for (const entry of readdirSync(codecDir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.wasm')) copyFileSync(path.join(entry.parentPath, entry.name), path.join(wasmOut, entry.name))
  }
}
console.log(`📦 ${new Date().toISOString()} copied photo codecs to ${path.relative(serverDir, wasmOut)}/`)
