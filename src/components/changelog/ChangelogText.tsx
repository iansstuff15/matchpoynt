import { Fragment } from 'react'

/** One changelog line, with its `**bold**` and `` `code` `` drawn; everything else is plain text. */
export default function ChangelogText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : part.startsWith('`') ? (
          <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}
