#!/usr/bin/env node
// Runs every Matchpoynt test suite one after the other: API unit tests
// (Vitest), then UI tests (Playwright). Each suite's output goes to a log in
// test/.output/runs/<timestamp>/, with a summary.json beside it.
//
//   pnpm test                         every suite
//   pnpm test --only=ui --headless    one suite, no browser window
//   pnpm test --help                  every option
import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const testDir = join(root, 'test')

const help = `
Usage: pnpm test [options]

Suites run in this order: unit (API rules, Vitest), ui (web app, Playwright).

  --only=<suites>       Run only these, comma-separated (e.g. --only=ui)
  --skip=<suites>       Skip these, comma-separated
  --grep=<pattern>      Only tests whose name matches (both suites)
  --project=<name>      UI viewport: desktop or mobile (default both)
  --headless            Hide the browser window during UI tests (shown by default; always hidden in CI)
  --slow-mo=<ms>        Pause before each browser action (default 300 with the window shown, 0 headless)
  --workers=<n>         Parallel workers for UI tests
  --retries=<n>         Retries for failing UI tests (default 0, CI 2)
  --base-url=<url>      Test an app that's already running instead of starting Vite
  --install-browsers    Install Playwright's Chromium before the UI suite
  --bail                Stop at the first failing suite
  --verbose             Stream each suite's output instead of a spinner
  --dry-run             Print what would run, run nothing
  --help                This text
`

// ── Arguments ────────────────────────────────────────────────────────────────
const flags = new Map()
for (const arg of process.argv.slice(2)) {
  if (arg === '--') continue
  const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg)
  if (!match) fail(`Unknown argument "${arg}". Run with --help to see the options.`)
  flags.set(match[1], match[2] ?? true)
}
const known = ['only', 'skip', 'grep', 'project', 'headless', 'slow-mo', 'workers', 'retries', 'base-url', 'install-browsers', 'bail', 'verbose', 'dry-run', 'help']
for (const name of flags.keys()) if (!known.includes(name)) fail(`Unknown option --${name}. Run with --help to see the options.`)
if (flags.has('help')) {
  console.log(help)
  process.exit(0)
}

const list = (name) => (typeof flags.get(name) === 'string' ? flags.get(name).split(',').map((s) => s.trim()).filter(Boolean) : [])
const number = (name) => {
  if (!flags.has(name)) return undefined
  const value = Number(flags.get(name))
  if (!Number.isInteger(value) || value < 0) fail(`--${name} needs a whole number, e.g. --${name}=2.`)
  return value
}
const grep = typeof flags.get('grep') === 'string' ? flags.get('grep') : undefined
const project = typeof flags.get('project') === 'string' ? flags.get('project') : undefined
if (project && !['desktop', 'mobile'].includes(project)) fail(`--project must be desktop or mobile, not "${project}".`)
const baseUrl = typeof flags.get('base-url') === 'string' ? flags.get('base-url') : undefined
const workers = number('workers')
const slowMo = number('slow-mo')
const retries = number('retries')

// Every run's logs and results go in their own folder.
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const runDir = join(testDir, '.output', 'runs', runId)

// ── Suites ───────────────────────────────────────────────────────────────────
const suites = [
  {
    id: 'unit',
    title: 'API unit tests (Vitest)',
    emoji: '🧪',
    command: ['pnpm', 'exec', 'vitest', 'run', ...(grep ? ['-t', grep] : [])],
    env: {},
  },
  {
    id: 'ui',
    title: 'UI tests (Playwright)',
    emoji: '🎭',
    before: flags.has('install-browsers') ? ['pnpm', 'exec', 'playwright', 'install', 'chromium'] : undefined,
    command: [
      'pnpm',
      'exec',
      'playwright',
      'test',
      ...(grep ? ['--grep', grep] : []),
      ...(project ? ['--project', project] : []),
    ],
    env: {
      // This run's own results and report folder (relative to test/).
      UI_OUTPUT_DIR: relative(testDir, join(runDir, 'ui')),
      ...(flags.has('headless') ? { UI_HEADLESS: '1' } : {}),
      ...(slowMo !== undefined ? { UI_SLOW_MO: String(slowMo) } : {}),
      ...(baseUrl ? { UI_BASE_URL: baseUrl } : {}),
      ...(workers !== undefined ? { UI_WORKERS: String(workers) } : {}),
      ...(retries !== undefined ? { UI_RETRIES: String(retries) } : {}),
    },
  },
]
const ids = suites.map((s) => s.id)
for (const id of [...list('only'), ...list('skip')]) if (!ids.includes(id)) fail(`No suite called "${id}". Suites: ${ids.join(', ')}.`)
const chosen = suites.filter((s) => (list('only').length === 0 || list('only').includes(s.id)) && !list('skip').includes(s.id))
if (chosen.length === 0) fail('Those options leave no suite to run.')

// ── Output ───────────────────────────────────────────────────────────────────
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19)
const log = (emoji, message) => console.log(`${emoji} [${stamp()}] ${message}`)
function fail(message) {
  console.error(`❌ [${stamp()}] ${message}`)
  process.exit(2)
}
const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`

const verbose = flags.has('verbose') || !process.stdout.isTTY

/** Shows a spinner with the elapsed time until `stop` is called. */
function spinner(label) {
  if (verbose) return { stop: () => {} }
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  const started = Date.now()
  let i = 0
  const timer = setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]} ${label} ${seconds(Date.now() - started)} `)
  }, 100)
  return {
    stop: () => {
      clearInterval(timer)
      process.stdout.write('\r\x1b[2K')
    },
  }
}

/** Runs one command in test/, sending its output to `logFile` (and the terminal with --verbose). */
function run(command, env, logFile, label) {
  return new Promise((done) => {
    const out = createWriteStream(logFile, { flags: 'a' })
    out.write(`$ ${command.join(' ')}\n\n`)
    const child = spawn(command[0], command.slice(1), {
      cwd: testDir,
      env: { ...process.env, ...env, FORCE_COLOR: verbose ? '1' : '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const spin = spinner(label)
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        out.write(chunk)
        if (verbose) process.stdout.write(chunk)
      })
    }
    child.on('error', (error) => {
      spin.stop()
      out.end(`\n${error.message}\n`)
      done(1)
    })
    child.on('close', (code) => {
      spin.stop()
      out.end()
      done(code ?? 1)
    })
  })
}

// ── Run ──────────────────────────────────────────────────────────────────────
log('🚀', `Matchpoynt tests: ${chosen.map((s) => s.id).join(' → ')}`)

if (flags.has('dry-run')) {
  for (const suite of chosen) {
    const env = Object.entries(suite.env).map(([k, v]) => `${k}=${v} `).join('')
    if (suite.before) log('📝', `would run in test/: ${suite.before.join(' ')}`)
    log('📝', `would run in test/: ${env}${suite.command.join(' ')}`)
  }
  log('📝', `would write logs to ${relative(root, runDir)}/`)
  log('✅', 'Dry run: nothing was run.')
  process.exit(0)
}

mkdirSync(runDir, { recursive: true })
log('📁', `Logs: ${relative(root, runDir)}/`)

const results = []
for (const suite of chosen) {
  const logFile = join(runDir, `${suite.id}.log`)
  log(suite.emoji, `${suite.title}…`)
  const started = Date.now()
  let code = 0
  if (suite.before) {
    log('📦', 'Installing Playwright Chromium…')
    code = await run(suite.before, {}, logFile, 'Installing Chromium')
  }
  if (code === 0) code = await run(suite.command, suite.env, logFile, suite.title)
  const duration = Date.now() - started
  const passed = code === 0
  results.push({ suite: suite.id, passed, exitCode: code, durationMs: duration, log: relative(root, logFile) })

  if (passed) {
    log('✅', `${suite.title} passed in ${seconds(duration)}`)
  } else {
    log('❌', `${suite.title} failed (exit ${code}) after ${seconds(duration)}. Full log: ${relative(root, logFile)}`)
    if (!verbose) {
      const tail = readFileSync(logFile, 'utf8').trimEnd().split('\n').slice(-30).join('\n')
      console.log(`\n${tail}\n`)
    }
    if (suite.id === 'ui') log('🔎', `Report with traces: pnpm --filter @matchpoynt/test exec playwright show-report ${relative(testDir, join(runDir, 'ui', 'report'))}`)
    if (flags.has('bail')) {
      log('🛑', 'Stopping: --bail was given.')
      break
    }
  }
}

writeFileSync(join(runDir, 'summary.json'), `${JSON.stringify({ runId, results }, null, 2)}\n`)
const failed = results.filter((r) => !r.passed)
console.log('')
for (const r of results) log(r.passed ? '✅' : '❌', `${r.suite.padEnd(5)} ${seconds(r.durationMs)}`)
log(failed.length ? '💥' : '🎉', failed.length ? `${failed.length} of ${results.length} suites failed.` : `All ${results.length} suites passed.`)
process.exit(failed.length ? 1 : 0)
