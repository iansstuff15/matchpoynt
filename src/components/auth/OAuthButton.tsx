import { Button } from '@/components/ui/button'

interface OAuthButtonProps {
  provider: 'google' | 'apple'
  label: string
  /** Page to return to; the API checks it. */
  next?: string
}

const logos = {
  google: { light: '/brand/google.png', dark: '/brand/google.png' },
  apple: { light: '/brand/apple.png', dark: '/brand/apple-white.png' },
}

/** A plain link to the API, which runs the whole OAuth flow and sets the session cookie. */
export default function OAuthButton({ provider, label, next }: OAuthButtonProps) {
  const logo = logos[provider]
  return (
    <Button variant="outline" size="lg" className="w-full rounded-full" asChild>
      <a href={`/api/auth/oauth/${provider}${next ? `?next=${encodeURIComponent(next)}` : ''}`} title={`Sign in with your ${label} account`}>
        <img src={logo.light} alt="" width={20} height={20} className="size-5 dark:hidden" />
        <img src={logo.dark} alt="" width={20} height={20} className="hidden size-5 dark:block" />
        Continue with {label}
      </a>
    </Button>
  )
}
