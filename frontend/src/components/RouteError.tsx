import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ButtonLink } from '@/components/ButtonLink'
import { Button } from '@/components/ui/button'

/**
 * Route-level error element: shown instead of a blank screen when a page throws
 * during render or a route doesn't exist.
 */
export function RouteError() {
  const error = useRouteError()
  // No error in context means we were rendered by the catch-all `*` route.
  const notFound = error == null || (isRouteErrorResponse(error) && error.status === 404)

  if (!notFound) {
    // Keep the stack visible in devtools. (Reporting to POST /api/errors goes here
    // once that endpoint exists — see frontend/CLAUDE.md "Error Handling".)
    console.error(error)
  }

  return (
    <div role="alert" className="max-w-md mx-auto text-center py-16 space-y-3">
      <h1 className="text-lg font-semibold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="text-sm text-muted-foreground">
        {notFound
          ? 'The page you were looking for doesn’t exist.'
          : 'This page hit an unexpected error. Reloading usually fixes it.'}
      </p>
      <div className="flex justify-center gap-2">
        {!notFound && (
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload
          </Button>
        )}
        <ButtonLink size="sm" to="/">
          Go home
        </ButtonLink>
      </div>
    </div>
  )
}
