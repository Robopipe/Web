/**
 * Safe log fields for an error (issue #26, tester finding C1). A database error carries the
 * query and its `params`, so the whole error object puts the lead's personal data in the log.
 * Log only the error name and the driver code, never the message, the query, or the values.
 */
export const safeErrorFields = (error: unknown): { errorName: string; errorCode?: string } => {
  const errorName = error instanceof Error ? error.name : typeof error
  const code =
    (error as { code?: unknown; cause?: { code?: unknown } } | null | undefined)?.cause?.code ??
    (error as { code?: unknown } | null | undefined)?.code
  return typeof code === 'string' || typeof code === 'number'
    ? { errorName, errorCode: String(code) }
    : { errorName }
}
