import * as React from "react"
import { cn } from "@/utils/cn"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Drawer as DrawerPrimitive } from "vaul"

import { Button } from "@/components/ui/button"

/*
 * Brand change (Matchpoynt): on phones (below md) every dialog is a bottom
 * drawer instead: vaul's Drawer, itself built on a dialog (so it is still a
 * `dialog` to screen readers), sized to its content, with a grab handle; drag
 * it down to close, or let go to snap it back. Each part follows the root.
 */
const drawerQuery = "(max-width: 767px)"
const subscribeMedia = (onChange: () => void) => {
  const mql = window.matchMedia(drawerQuery)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}
const useDrawerMode = () =>
  React.useSyncExternalStore(subscribeMedia, () => window.matchMedia(drawerQuery).matches, () => false)
const DrawerModeContext = React.createContext(false)

function Dialog({
  dismissible = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & {
  /** `false` for a dialog that must not be closed (no dragging the phone's drawer away either). */
  dismissible?: boolean
}) {
  const drawer = useDrawerMode()
  return (
    <DrawerModeContext.Provider value={drawer}>
      {drawer ? <DrawerPrimitive.Root data-slot="dialog" dismissible={dismissible} {...props} /> : <DialogPrimitive.Root data-slot="dialog" {...props} />}
    </DrawerModeContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  if (React.useContext(DrawerModeContext)) return <DrawerPrimitive.Trigger data-slot="dialog-trigger" {...props} />
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  if (React.useContext(DrawerModeContext)) return <DrawerPrimitive.Close data-slot="dialog-close" {...props} />
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  if (React.useContext(DrawerModeContext)) {
    return (
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-50 bg-black/50" />
        <DrawerPrimitive.Content
          data-slot="dialog-content"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92svh] flex-col rounded-t-2xl border-t bg-background shadow-lg outline-none"
          {...props}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
          <div className={cn("grid min-h-0 gap-4 overflow-y-auto p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]", className)}>{children}</div>
          {showCloseButton && (
            <DrawerPrimitive.Close
              data-slot="dialog-close"
              className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DrawerPrimitive.Close>
          )}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    )
  }
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const Title = React.useContext(DrawerModeContext) ? DrawerPrimitive.Title : DialogPrimitive.Title
  return (
    <Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const Description = React.useContext(DrawerModeContext) ? DrawerPrimitive.Description : DialogPrimitive.Description
  return (
    <Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
