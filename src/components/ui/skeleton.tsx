import { cn } from "@/utils/cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // Matchpoynt: muted, not the lime accent, so loading states stay calm.
      className={cn("animate-pulse rounded-md bg-muted-foreground/15", className)}
      {...props}
    />
  )
}

export { Skeleton }
