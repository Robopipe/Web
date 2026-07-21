'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import React from 'react'

import { SERVER_URL } from '@/lib/paths'

export const LivePreviewListener: React.FC = () => {
  const router = useRouter()
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={SERVER_URL} />
}
