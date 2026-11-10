import { createApp } from '@/app'
import { checkStartup } from '@/config/startup'

// The API as a Vercel Function (the `server` service in vercel.json). Vercel
// routes /api/* here with the path unchanged, which matches the app's /api base path.
checkStartup()

export default createApp()
