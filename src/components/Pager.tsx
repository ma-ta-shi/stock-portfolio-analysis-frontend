import { Button } from '@/components/ui/button'

interface PagerProps {
  /** 1-based, from the response's `meta`. */
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
  /** What the rows are, for the label ("transactions"). */
  noun?: string
}

/** Previous / next for a server-paged list. Shows nothing when everything fits on one page. */
export function Pager({ page, pages, total, onPage, noun = 'rows' }: PagerProps) {
  if (pages <= 1) return null
  return (
    <nav aria-label={`Pages of ${noun}`} className="flex items-center justify-between gap-3 text-sm text-muted-foreground mt-3">
      <span>
        Page {page} of {pages} ({total} {noun})
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
