// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

import { assertLocalDatabase } from './src/lib/dbGuard'

// Integration tests write to DATABASE_URL. Never let them run against production.
assertLocalDatabase(process.env.DATABASE_URL)
