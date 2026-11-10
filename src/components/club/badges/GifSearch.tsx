import { gifSearch, type GifResult } from '@matchpoynt/shared'
import { Check, Search } from 'lucide-react'
import { useState } from 'react'
import GifSearchSkeleton from '@/components/club/badges/GifSearchSkeleton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import { useGifSearch } from '@/utils/hooks/useGifSearch'

interface GifSearchProps {
  selected: GifResult | null
  onSelect: (gif: GifResult) => void
}

/** Searches GIPHY (through the API) and picks a GIF for a badge icon. */
export default function GifSearch({ selected, onSelect }: GifSearchProps) {
  const [query, setQuery] = useState('')
  const search = useGifSearch(query, true)
  const results = search.data?.pages.flatMap((p) => p.results) ?? []

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          maxLength={gifSearch.maxQueryLength}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs, e.g. trophy, smash, champion"
          aria-label="Search GIFs"
          className="pl-9"
        />
      </div>

      {search.isError ? (
        <ErrorBanner error={search.error} action="search for GIFs" onRetry={() => void search.refetch()} />
      ) : search.isLoading ? (
        <GifSearchSkeleton />
      ) : query.trim() && search.isSuccess && results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No GIFs found for “{query.trim()}”. Try another word.</p>
      ) : results.length > 0 ? (
        <ul className="gif-grid" aria-label="GIF results">
          {results.map((gif) => {
            const picked = selected?.id === gif.id
            return (
              <li key={gif.id}>
                <button type="button" className={cn('gif-tile', picked && 'gif-tile-picked')} aria-pressed={picked} aria-label={gif.title} onClick={() => onSelect(gif)}>
                  <img src={gif.previewUrl} alt="" loading="lazy" decoding="async" width={gif.width} height={gif.height} />
                  {picked && <Check className="gif-tile-check" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{gifSearch.attribution}</p>
        {search.hasNextPage && (
          <Button type="button" variant="outline" size="sm" disabled={search.isFetchingNextPage} onClick={() => void search.fetchNextPage()}>
            <Search />
            More GIFs
          </Button>
        )}
      </div>
    </div>
  )
}
