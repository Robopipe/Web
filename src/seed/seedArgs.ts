import { parseRemoteUrl } from './remoteClient'

export type SeedArgs = { dryRun: boolean; production: boolean; remote?: string }

/**
 * Reads the command line of a content script: --dry-run, --production and
 * --remote=<URL>. Any unknown argument stops the run before it logs in or
 * writes, so a typo such as --dryrun never writes. `usage` ends each error.
 */
export const parseSeedArgs = (args: string[], usage: string): SeedArgs => {
  const out: SeedArgs = { dryRun: false, production: false }
  const seen = new Set<string>()
  const fail = (message: string): never => {
    throw new Error(`${message}\n${usage}`)
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
