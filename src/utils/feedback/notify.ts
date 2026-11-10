import { toast } from 'sonner'

// Toasts announce progress and completed changes, coloured by kind: success
// (green), info (blue), warning (amber), error (red); colours are the theme's
// tokens (components/ui/sonner.tsx). Failed API calls are still never toasted:
// they get an ErrorBanner with the exact cause (see CLAUDE.md).

/** Starts a progress toast and returns its id, so the result can replace it in place. */
export function notifyProgress(message: string): string | number {
  return toast.loading(message)
}

/** Replaces a progress toast with a success message (or shows a new one). */
export function notifyDone(message: string, options: { id?: string | number; description?: string } = {}) {
  toast.success(message, { id: options.id, description: options.description })
}

/** A change the user didn't directly cause, e.g. auto-fill or new results. */
export function notifyChange(message: string, description?: string) {
  toast.info(message, { description })
}

/** Something that needs attention soon but isn't an error, e.g. a court going over its time limit. */
export function notifyWarning(message: string, description?: string) {
  toast.warning(message, { description })
}

/** Removes a progress toast when its action failed; the error banner takes over. */
export function dismissProgress(id: string | number | undefined) {
  if (id !== undefined) toast.dismiss(id)
}
