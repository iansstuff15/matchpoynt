// Matchpoynt's emails for Firebase Authentication (server/email-templates/):
// renders the logo the emails show (public/brand/logo-email.png, a PNG because
// many mail apps don't show SVG) from the same arches as the site's logo, and
// writes a preview of each template with sample values to
// server/email-templates/.preview/ (HTML and a screenshot) to check before
// pasting them into the Firebase console. Uses the test package's Playwright.
//
//   pnpm email:templates             render the logo and the previews
//   pnpm email:templates --dry-run   say what it would write, write nothing
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const templatesDir = path.join(root, 'server/email-templates')
const previewDir = path.join(templatesDir, '.preview')
const logoFile = path.join(root, 'public/brand/logo-email.png')
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')

if (args.has('--help')) {
  console.log('Usage: pnpm email:templates [--dry-run]\n  Renders public/brand/logo-email.png and previews of the emails the API sends (server/src/utils/email/templates.ts) and the Firebase console template (server/email-templates/*.html) into server/email-templates/.preview/.')
  process.exit(0)
}

const log = (emoji, message) => console.log(`${emoji} [${new Date().toISOString().replace('T', ' ').slice(0, 19)}] ${message}`)

/** A spinner on one line while something slow runs. */
async function withSpinner(label, work) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const timer = process.stdout.isTTY ? setInterval(() => process.stdout.write(`\r${frames[i++ % frames.length]} ${label}`), 80) : null
  try {
    return await work()
  } finally {
    if (timer) {
      clearInterval(timer)
      process.stdout.write('\r\x1b[2K')
    }
  }
}

// The logo's arches (src/components/brand/LogoMark.tsx), in navy and coral on a transparent background.
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 134 392 244" width="216" height="135">
  <mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
    <rect width="512" height="512" fill="#fff"/>
    <path d="M215,231.8 A108,108 0 0 1 319.3,162.1" fill="none" stroke="#000" stroke-width="72"/>
  </mask>
  <path d="M88,350 V270 A108,108 0 0 1 304,270 V350" fill="none" stroke="#101A33" stroke-width="48" stroke-linecap="round" mask="url(#cut)"/>
  <path d="M208,350 V270 A108,108 0 0 1 424,270 V350" fill="none" stroke="#FF5A4E" stroke-width="48" stroke-linecap="round"/>
</svg>`

const samples = { '%LINK%': 'https://matchpoynt.com/api/auth/action?mode=resetPassword&oobCode=SAMPLE', '%EMAIL%': 'ana@example.com', '%NEW_EMAIL%': 'ana.reyes@example.com', '%APP_NAME%': 'Matchpoynt' }
const config = JSON.parse(readFileSync(path.join(templatesDir, 'templates.json'), 'utf8'))
// The emails the API sends itself (Node loads the TypeScript directly: the file has no imports).
const apiTemplates = await import(path.join(root, 'server/src/utils/email/templates.ts'))
const sampleBase = { appUrl: 'https://matchpoynt.com', to: 'ana@example.com' }
const sampleLink = (mode) => `https://matchpoynt.com/api/auth/action?mode=${mode}&oobCode=SAMPLE&next=%2Fapp`
const apiEmails = {
  'api-password-reset': apiTemplates.passwordResetEmail({ ...sampleBase, link: sampleLink('resetPassword') }),
  'api-verify-email': apiTemplates.verifyEmailEmail({ ...sampleBase, link: sampleLink('verifyEmail') }),
  'api-change-email': apiTemplates.changeEmailEmail({ ...sampleBase, to: 'ana.reyes@example.com', currentEmail: 'ana@example.com', link: sampleLink('verifyAndChangeEmail') }),
  'api-club-invite': apiTemplates.clubInviteEmail({ ...sampleBase, clubName: 'Smash Club Manila', link: sampleLink('signIn') }),
}
log('📨', `${Object.keys(apiEmails).length} emails sent by the API: ${Object.values(apiEmails).map((e) => `"${e.subject}"`).join(', ')}`)

log('📧', `${config.templates.length} templates in ${path.relative(root, templatesDir)}/${dryRun ? ' (dry run: nothing is written)' : ''}`)
for (const t of config.templates) {
  const html = readFileSync(path.join(templatesDir, t.file), 'utf8')
  const missing = ['%LINK%'].filter((p) => !html.includes(p))
  if (missing.length) {
    log('❌', `${t.file} has no ${missing.join(', ')}: Firebase's link wouldn't be in the email`)
    process.exit(1)
  }
  log('✅', `${t.file} → Firebase "${t.console}", subject "${t.subject}"`)
}

if (dryRun) {
  log('🧪', `would write ${path.relative(root, logoFile)} and ${(config.templates.length + Object.keys(apiEmails).length) * 2} preview files to ${path.relative(root, previewDir)}/`)
  process.exit(0)
}

// Playwright lives in the test package.
const { chromium } = createRequire(path.join(root, 'test/package.json'))('@playwright/test')
await withSpinner('Starting a browser…', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 })
    await page.setContent(`<html><body style="margin:0;background:transparent">${logoSvg}</body></html>`)
    await page.locator('svg').screenshot({ path: logoFile, omitBackground: true })
    log('🖼️ ', `wrote ${path.relative(root, logoFile)} (216×135, shown at 72×45)`)

    mkdirSync(previewDir, { recursive: true })
    const desktop = await browser.newPage({ viewport: { width: 720, height: 900 } })
    for (const t of config.templates) {
      let html = readFileSync(path.join(templatesDir, t.file), 'utf8')
      for (const [placeholder, value] of Object.entries(samples)) html = html.replaceAll(placeholder, value)
      // The preview shows the logo from this checkout, not the live site.
      html = html.replace('https://matchpoynt.com/brand/logo-email.png', `file://${logoFile}`)
      const out = path.join(previewDir, t.file)
      writeFileSync(out, html)
      await desktop.goto(`file://${out}`)
      await desktop.screenshot({ path: out.replace(/\.html$/, '.png'), fullPage: true })
      log('👀', `preview ${path.relative(root, out)} (+ .png)`)
    }
    for (const [name, email] of Object.entries(apiEmails)) {
      const out = path.join(previewDir, `${name}.html`)
      writeFileSync(out, email.html.replace('https://matchpoynt.com/brand/logo-email.png', `file://${logoFile}`))
      writeFileSync(path.join(previewDir, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}`)
      await desktop.goto(`file://${out}`)
      await desktop.screenshot({ path: out.replace(/\.html$/, '.png'), fullPage: true })
      log('👀', `preview ${path.relative(root, out)} (+ .png, .txt)`)
    }
  } finally {
    await browser.close()
  }
})
log('🎉', 'Done. Paste email-change.html into Firebase > Authentication > Templates > Email address change (see templates.json); the api-* emails are sent by the API itself.')
