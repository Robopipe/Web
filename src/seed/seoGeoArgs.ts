import { parseRemoteUrl } from './remoteClient'

export type SeoGeoArgs = {
  status: 'draft' | 'published'
  dryRun: boolean
  production: boolean
  remote?: string
}

export const SEO_GEO_USAGE =
  'Usage: pnpm seed:seo-geo [--status=draft|published] [--dry-run] [--production] [--remote=<URL>]'

/**
 * Reads the command line of seed:seo-geo. Any unknown argument or wrong form
 * stops the run before it logs in or writes, so a typo such as --dryrun never
 * starts a real write.
 */
export const parseSeoGeoArgs = (args: string[]): SeoGeoArgs => {
  const out: SeoGeoArgs = { status: 'draft', dryRun: false, production: false }
  const seen = new Set<string>()
  const fail = (message: string): never => {
    throw new Error(`${message}\n${SEO_GEO_USAGE}`)
  }
  for (const arg of args) {
    const [name, ...rest] = arg.split('=')
    const value = rest.length ? rest.join('=') : undefined
    if (seen.has(name)) fail(`${name} is given twice.`)
    seen.add(name)
    switch (name) {
      case '--dry-run':
      case '--production':
        if (value !== undefined) fail(`${name} takes no value, not "${arg}".`)
        if (name === '--dry-run') out.dryRun = true
        else out.production = true
        break
      case '--status':
        if (value !== 'draft' && value !== 'published') {
          fail(`--status must be --status=draft or --status=published, not "${arg}".`)
        }
        out.status = value as SeoGeoArgs['status']
        break
      case '--remote':
        if (!value) fail(`--remote needs a URL: --remote=https://robopipe.io, not "${arg}".`)
        parseRemoteUrl(value!)
        out.remote = value
        break
      default:
        fail(`Unknown argument "${arg}".`)
    }
  }
  return out
}
