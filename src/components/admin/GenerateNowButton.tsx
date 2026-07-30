'use client'

import { Button, toast, useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'

/**
 * Sidebar button on a Blog topic: triggers generation immediately via
 * POST /api/blog-topics/:id/generate, then polls the topic until the job
 * finishes and reloads the view.
 */
export default function GenerateNowButton() {
  const { id } = useDocumentInfo()
  const [busy, setBusy] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  if (!id) return null // create view — save the topic first

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/blog-topics/${id}?depth=0`, { credentials: 'include' })
        if (!res.ok) return
        const doc = (await res.json()) as { status?: string; error?: string | null }
        if (doc.status === 'ready') {
          if (pollRef.current) clearInterval(pollRef.current)
          toast.success('Draft is ready for review.')
          window.location.reload()
        } else if (doc.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          toast.error(`Generation failed: ${doc.error ?? 'unknown error'}`)
          window.location.reload()
        }
      } catch {
        // transient poll error — keep polling
      }
    }, 5000)
  }

  const onClick = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/blog-topics/${id}/generate`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = (await res.json()) as { message?: string }
      if (!res.ok) throw new Error(json.message ?? res.statusText)
      toast.success('Generation started — this takes ~3–5 minutes. You can leave this page open.')
      startPolling()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <Button onClick={onClick} disabled={busy} buttonStyle="secondary" size="medium">
        {busy ? 'Generating…' : 'Generate now'}
      </Button>
      <div style={{ color: 'var(--theme-elevation-500)', fontSize: '0.8rem' }}>
        Runs generation immediately instead of waiting for the nightly job. Save any edits to the
        topic first — the job reads the saved version.
      </div>
    </div>
  )
}
