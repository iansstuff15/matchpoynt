/** The splash's loading bar: a stripe sweeping across while the app loads, full once it has (`done`). */
export default function SplashLoadingBar({ done = false }: { done?: boolean }) {
  return (
    <div className="splash-loading-bar" role="progressbar" aria-label="Loading the app" aria-valuemin={0} aria-valuemax={100} aria-valuenow={done ? 100 : undefined} data-done={done || undefined}>
      <span className="splash-loading-bar-fill" />
    </div>
  )
}
