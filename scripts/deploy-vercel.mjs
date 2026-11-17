#!/usr/bin/env node
// Deploys the web app and the API to Vercel (the `app` and `server` services in
// vercel.json): copies the API's secrets from .env into the Vercel project,
// checks every required variable is there, deploys, then calls /api/config on
// the new deployment to prove the API starts. Each run's logs go to
// .output/deploy/<timestamp>/.
//
//   pnpm deploy:vercel                    preview deployment
//   pnpm deploy:vercel --prod             preview, then production once the preview answers
//   pnpm deploy:vercel --dry-run          print what would happen, change nothing
//   pnpm deploy:vercel --help             every option
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

const help = `
Usage: pnpm deploy:vercel [options]

Steps: check the Vercel CLI and project link, copy secrets from .env to Vercel
(production and preview), check required variables, deploy a preview, call its
/api/config, and with --prod do the same for production.

  --prod                Also deploy to production after the preview passes
  --env-file=<path>     Where to read secrets from (default .env)
  --app-url=<url>       Set APP_URL for production (the site's public https URL; --url works too)
  --skip-env            Don't copy secrets; only check they're on Vercel
  --skip-preview        With --prod, deploy straight to production
  --scope=<team>        Vercel team id or slug (default: the linked project's team)
  --verbose             Stream command output instead of a spinner
  --dry-run             Print what would run, change nothing
  --help                This text

Secrets copied when they have a value in the env file:
  SUPABASE_URL, SUPABASE_ANON_KEY, FIREBASE_API_KEY, FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, GIPHY_API_KEY,
  RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO
Empty ones are left as they are on Vercel. APP_URL is never copied from the
env file (locally it points at localhost); pass --app-url to set it.
`

// Every run's logs go in their own folder.
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const runDir = join(root, '.output', 'deploy', runId)
const logFile = join(runDir, 'deploy.log')

// ── Output ───────────────────────────────────────────────────────────────────
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19)
function log(emoji, message) {
  const line = `${emoji} [${stamp()}] ${message}`
  console.log(line)
  if (existsSync(runDir)) appendFileSync(logFile, `${line}\n`)
}
function fail(message) {
  const line = `❌ [${stamp()}] ${message}`
  console.error(line)
  if (existsSync(runDir)) appendFileSync(logFile, `${line}\n`)
  process.exit(1)
}

// ── Arguments ────────────────────────────────────────────────────────────────
// Options that take a value accept both --name=value and --name value.
const valued = ['env-file', 'app-url', 'scope']
const aliases = { url: 'app-url' }
const flags = new Map()
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '--') continue
  const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg)
  if (!match) fail(`Unknown argument "${arg}". Run with --help to see the options.`)
  const name = aliases[match[1]] ?? match[1]
  let value = match[2]
  if (value === undefined && valued.includes(name)) {
    value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) fail(`--${name} needs a value, e.g. --${name}=<value>.`)
    i++
  }
  flags.set(name, value ?? true)
}
const known = ['prod', 'env-file', 'app-url', 'skip-env', 'skip-preview', 'scope', 'verbose', 'dry-run', 'help']
for (const name of flags.keys()) if (!known.includes(name)) fail(`Unknown option --${name}. Run with --help to see the options.`)
if (flags.has('help')) {
  console.log(help)
  process.exit(0)
}
const text = (name) => (typeof flags.get(name) === 'string' ? flags.get(name) : undefined)
const dryRun = flags.has('dry-run')
const prod = flags.has('prod')
const skipPreview = flags.has('skip-preview')
if (skipPreview && !prod) fail('--skip-preview only makes sense with --prod.')
const envFile = resolve(root, text('env-file') ?? '.env')
const appUrl = text('app-url')
if (appUrl !== undefined) {
  let parsed
  try {
    parsed = new URL(appUrl)
  } catch {
    fail(`--app-url "${appUrl}" isn't a URL. Use the site's public address, e.g. --app-url=https://matchpoynt.vercel.app.`)
  }
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/') fail(`--app-url must be an https origin with no path, e.g. https://matchpoynt.vercel.app (got "${appUrl}").`)
}

/** Secrets the API reads (server/src/config/env.ts). `required` ones stop the API starting when missing. */
const secrets = [
  { key: 'SUPABASE_URL', required: true },
  { key: 'SUPABASE_ANON_KEY', required: true },
  { key: 'FIREBASE_API_KEY', required: true },
  { key: 'FIREBASE_PROJECT_ID', required: true },
  { key: 'FIREBASE_CLIENT_EMAIL', required: true },
  { key: 'FIREBASE_PRIVATE_KEY', required: true },
  { key: 'GIPHY_API_KEY', required: false },
  { key: 'RESEND_API_KEY', required: false },
  { key: 'EMAIL_FROM', required: false },
  { key: 'EMAIL_REPLY_TO', required: false },
]
const requiredOnVercel = ['APP_URL', ...secrets.filter((s) => s.required).map((s) => s.key)]
const environments = ['production', 'preview']

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

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '')

/**
 * Runs the Vercel CLI and resolves with its exit code and output. `input` is
 * written to stdin (secret values travel this way, never as arguments or in logs).
 */
function vercel(args, { input, label, secret = false } = {}) {
  const full = [...(scope ? ['--scope', scope] : []), ...args]
  appendFileSync(logFile, `\n$ vercel ${full.join(' ')}${secret ? ' < (secret from env file)' : ''}\n`)
  return new Promise((done) => {
    const child = spawn('vercel', full, { cwd: root, env: { ...process.env, FORCE_COLOR: '0' } })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      appendFileSync(logFile, chunk)
      if (verbose) process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      appendFileSync(logFile, chunk)
      if (verbose) process.stderr.write(chunk)
    })
    const spin = spinner(label ?? `vercel ${args[0]}`)
    child.on('error', (error) => {
      spin.stop()
      done({ code: 127, stdout, stderr: `${stderr}${error.message}` })
    })
    child.on('close', (code) => {
      spin.stop()
      done({ code: code ?? 1, stdout: stripAnsi(stdout), stderr: stripAnsi(stderr) })
    })
    if (input !== undefined) child.stdin.end(input)
    else child.stdin.end()
  })
}

/** The last few meaningful lines of a failed command, for the error message. */
const tail = ({ stdout, stderr }) =>
  `${stderr}\n${stdout}`
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-6)
    .join('\n   ')

/** Reads KEY=value lines; surrounding quotes are dropped, `\n` escapes kept (the API turns them into newlines). */
function readEnvFile(path) {
  const values = new Map()
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(raw)
    if (!match) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    values.set(match[1], value)
  }
  return values
}

/** Variable names set on Vercel for one environment. */
async function namesOn(environment) {
  const result = await vercel(['env', 'ls', environment], { label: `Reading ${environment} variables` })
  if (result.code !== 0) fail(`Couldn't list the ${environment} variables on Vercel:\n   ${tail(result)}`)
  const names = new Set()
  for (const line of result.stdout.split('\n')) {
    const match = /^\s*([A-Z][A-Z0-9_]+)\s+/.exec(line)
    if (match) names.add(match[1])
  }
  return names
}

/** Deploys, then calls /api/config on the result. Returns the deployment URL. */
async function deploy(target) {
  const args = ['deploy', '--yes', ...(target === 'production' ? ['--prod'] : [])]
  if (dryRun) {
    log('📝', `Would run: vercel ${args.join(' ')}, then GET /api/config on the new deployment`)
    return undefined
  }
  log('🚀', `Deploying ${target} (Vercel installs and builds both services; this takes a few minutes)`)
  const started = Date.now()
  const result = await vercel(args, { label: `Building ${target} on Vercel` })
  const output = `${result.stdout}\n${result.stderr}`
  if (result.code !== 0) fail(`The ${target} deployment failed after ${seconds(Date.now() - started)}:\n   ${tail(result)}\n   Full log: ${relative(root, logFile)}`)
  // The first *.vercel.app address the CLI prints is the deployment's own (the Inspect link is on vercel.com).
  const url = /https:\/\/[a-z0-9-]+\.vercel\.app/.exec(output)?.[0]
  if (!url) fail(`The ${target} deployment finished but its URL wasn't in the CLI output. See ${relative(root, logFile)}.`)
  log('✅', `${target} deployment ready in ${seconds(Date.now() - started)}: ${url}`)

  // The API checks its environment on start, so /api/config answering 200 means it runs.
  log('🩺', `Checking the API answers at ${url}/api/config`)
  const check = await vercel(['curl', `${url}/api/config`, '--', '-s', '-o', '/dev/null', '-w', 'HTTP_STATUS=%{http_code}\n'], { label: 'Calling /api/config' })
  const status = /HTTP_STATUS=(\d{3})/.exec(check.stdout)?.[1]
  if (status !== '200') {
    fail(
      `The API on ${url} answered ${status ?? 'nothing'} instead of 200. Most often a variable is missing or wrong.\n` +
        `   Read why: vercel logs --deployment ${url}${scope ? ` --scope ${scope}` : ''}\n   Full log: ${relative(root, logFile)}`,
    )
  }
  log('💚', `API is up on ${target}`)
  return url
}

// ── Run ──────────────────────────────────────────────────────────────────────
mkdirSync(runDir, { recursive: true })
writeFileSync(logFile, '')
log('🏁', `Vercel deployment${dryRun ? ' (dry run: nothing will change)' : ''}. Log: ${relative(root, logFile)}`)

// 1. CLI, sign-in and project link
const link = join(root, '.vercel', 'project.json')
if (!existsSync(link)) fail('This folder isn\'t linked to a Vercel project. Run `vercel link` first.')
const project = JSON.parse(readFileSync(link, 'utf8'))
const scope = text('scope') ?? project.orgId
const who = await vercel(['whoami'], { label: 'Checking the Vercel CLI' })
if (who.code === 127) fail('The Vercel CLI isn\'t installed. Install it with `pnpm add -g vercel` (or `brew install vercel-cli`).')
if (who.code !== 0) fail(`The Vercel CLI isn't signed in. Run \`vercel login\`, then try again.\n   ${tail(who)}`)
log('👤', `Signed in as ${who.stdout.trim().split('\n').pop()}; project ${project.projectName ?? project.projectId}, team ${scope}`)

// 2. Secrets from the env file
const copied = new Set()
if (flags.has('skip-env')) {
  log('⏭️ ', 'Not copying secrets (--skip-env)')
} else {
  if (!existsSync(envFile)) fail(`No env file at ${relative(root, envFile)}. Pass --env-file=<path> or --skip-env.`)
  const values = readEnvFile(envFile)
  log('🔐', `Copying secrets from ${relative(root, envFile)} to ${environments.join(' and ')} (stored as Sensitive)`)
  for (const { key } of secrets) {
    const value = values.get(key) ?? ''
    if (!value) {
      log('⚪', `${key}: empty in ${relative(root, envFile)}, leaving Vercel's value as it is`)
      continue
    }
    copied.add(key)
    if (dryRun) {
      log('📝', `Would set ${key} (${value.length} characters) on ${environments.join(', ')}`)
      continue
    }
    const result = await vercel(['env', 'add', key, '--environment', environments.join(','), '--sensitive', '--force', '--yes'], {
      input: value,
      label: `Setting ${key}`,
      secret: true,
    })
    if (result.code !== 0) fail(`Couldn't set ${key} on Vercel:\n   ${tail(result)}`)
    log('🔑', `${key} set`)
  }
}

// 3. APP_URL
if (appUrl !== undefined) {
  if (dryRun) log('📝', `Would set APP_URL=${appUrl} on production`)
  else {
    const result = await vercel(['env', 'add', 'APP_URL', '--environment', 'production', '--no-sensitive', '--force', '--yes'], { input: appUrl, label: 'Setting APP_URL' })
    if (result.code !== 0) fail(`Couldn't set APP_URL on Vercel:\n   ${tail(result)}`)
    log('🌐', `APP_URL set to ${appUrl} on production`)
  }
}

// 4. Every required variable is on Vercel
for (const environment of prod && skipPreview ? ['production'] : prod ? environments : ['preview']) {
  const names = await namesOn(environment)
  const missing = requiredOnVercel.filter((key) => !names.has(key) && !(dryRun && copied.has(key)))
  const gifSearch = names.has('FEATURE_WEB_GIF_SEARCH') && !names.has('GIPHY_API_KEY') && !(dryRun && copied.has('GIPHY_API_KEY'))
  if (missing.length > 0 && !dryRun) {
    fail(
      `${environment} on Vercel is missing ${missing.join(', ')}; the API won't start without them.\n` +
        `   Add a value to ${relative(root, envFile)} and run again, or: vercel env add <NAME> --environment ${environment} --sensitive`,
    )
  }
  if (missing.length > 0) log('⚠️ ', `${environment} is missing ${missing.join(', ')}: the real run would stop here`)
  else log('✅', `${environment} has every required variable`)
  if (gifSearch) log('⚠️ ', `${environment} sets FEATURE_WEB_GIF_SEARCH but has no GIPHY_API_KEY: if the flag is true, the API refuses to start`)
}

// 5. Deploy: preview first, production only once the preview's API answers
const deployed = {}
if (!(prod && skipPreview)) deployed.preview = await deploy('preview')
if (prod) deployed.production = await deploy('production')

writeFileSync(join(runDir, 'summary.json'), `${JSON.stringify({ runId, dryRun, project: project.projectName, scope, deployed }, null, 2)}\n`)
log('🎉', dryRun ? 'Dry run finished; nothing was changed' : `Done. ${Object.entries(deployed).map(([t, u]) => `${t}: ${u}`).join(' · ')}`)
if (!prod && !dryRun) log('👉', 'Happy with the preview? Run `pnpm deploy:vercel --prod --skip-env` to ship it to production.')
