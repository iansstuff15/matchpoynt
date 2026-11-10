import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      // Matchpoynt: coloured by kind (richColors), from the theme's tokens. Mixed in oklab: in oklch, white's hue (0) would swing green toward pink.
      richColors
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "color-mix(in oklab, var(--success) 14%, var(--popover))",
          "--success-border": "color-mix(in oklab, var(--success) 40%, var(--popover))",
          "--success-text": "var(--success-foreground)",
          "--info-bg": "color-mix(in oklab, var(--info) 14%, var(--popover))",
          "--info-border": "color-mix(in oklab, var(--info) 40%, var(--popover))",
          "--info-text": "var(--info-foreground)",
          "--warning-bg": "color-mix(in oklab, var(--warning) 18%, var(--popover))",
          "--warning-border": "color-mix(in oklab, var(--warning) 50%, var(--popover))",
          "--warning-text": "var(--warning-foreground)",
          "--error-bg": "color-mix(in oklab, var(--destructive) 12%, var(--popover))",
          "--error-border": "color-mix(in oklab, var(--destructive) 40%, var(--popover))",
          "--error-text": "var(--destructive)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
