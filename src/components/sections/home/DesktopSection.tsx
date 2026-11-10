import { useRef } from 'react'
import { landingSection } from '@/animations/landingSection'
import { useMotion } from '@/animations/useMotion'
import { Download, LayoutGrid, Monitor } from 'lucide-react'
import { Link } from 'react-router'
import SectionHeading from '@/components/landing/SectionHeading'
import { Button } from '@/components/ui/button'
import { useFeatures } from '@/utils/hooks/useFeatures'

export default function DesktopSection() {
  const ref = useRef<HTMLElement>(null)
  useMotion(ref, landingSection)
  const { web } = useFeatures()
  return (
    <section ref={ref} aria-labelledby="desktop-title" className="section-deep py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <SectionHeading
          id="desktop-title"
          align="left"
          eyebrow="04 / ~/desktop"
          parts={[{ text: 'The board, on the ' }, { text: 'venue laptop.', strong: true }]}
          lead="The same session board as a desktop app for macOS, Windows and Linux, built for a corner of the gym with patchy Wi-Fi."
        />
        <div className="glass-panel grid gap-6 p-8" data-reveal>
          <Monitor className="size-8 text-mesh-2" aria-hidden />
          <p className="text-deep-muted">Run the queue from the desk while players check their standings on their phones from a published link.</p>
          <div className="flex flex-wrap gap-3">
            {web.desktopDownload && (
              <Button className="rounded-full" asChild>
                <a href="/download" title="Download the Matchpoynt desktop app">
                  <Download />
                  Download for desktop
                </a>
              </Button>
            )}
            <Button variant="ghost" className="rounded-full border border-glass-border bg-glass text-deep-foreground hover:bg-white/20 hover:text-deep-foreground" asChild>
              <Link to="/app" title="Try the session board in your browser">
                <LayoutGrid />
                Try it in the browser
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
