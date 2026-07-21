import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Exclude Payload admin/API, Next internals, media files and static assets
  matcher: ['/((?!api|admin|_next|media|.*\\..*).*)'],
}
