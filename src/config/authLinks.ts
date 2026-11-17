import { KeyRound, LogIn, Mail, Users, type LucideIcon } from 'lucide-react'

/** The emailed links handled at /api/auth/action (the API's `ActionMode`). */
export type AuthLinkKind = 'signIn' | 'verifyEmail' | 'resetPassword' | 'verifyAndChangeEmail' | 'recoverEmail'

/** What the link problem page offers instead of each kind of link, and what that kind of link was for. */
export const authLinkHelp: Record<AuthLinkKind, { what: string; action: { label: string; href: string; icon: LucideIcon } }> = {
  resetPassword: { what: 'reset your password', action: { label: 'Send a new reset link', href: '/forgot-password', icon: KeyRound } },
  verifyEmail: { what: 'confirm your email', action: { label: 'Sign in for a new link', href: '/sign-in', icon: LogIn } },
  signIn: { what: 'join your club', action: { label: 'Sign in', href: '/sign-in', icon: LogIn } },
  verifyAndChangeEmail: { what: 'change your sign-in email', action: { label: 'Change your email again', href: '/account/email', icon: Mail } },
  recoverEmail: { what: 'undo a change to your sign-in email', action: { label: 'Reset your password', href: '/forgot-password', icon: KeyRound } },
}

/** For a club invite's link: who to ask for another. */
export const inviteLinkTip = 'Ask the club to send you a new invite.'

export const authLinkKinds = Object.keys(authLinkHelp) as AuthLinkKind[]

/** For anything we don't know: back to signing in. */
export const authLinkFallback = { label: 'Go to sign in', href: '/sign-in', icon: Users }
