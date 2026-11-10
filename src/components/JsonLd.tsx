import React from 'react'

import { serializeJsonLd, type JsonLdObject } from '@/lib/jsonLd'

/** Renders schema.org structured data. Null entries (e.g. no FAQs) are skipped. */
export const JsonLd: React.FC<{ data: (JsonLdObject | null)[] }> = ({ data }) => (
  <>
    {data.filter(Boolean).map((item, i) => (
      <script
        key={i}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(item as JsonLdObject) }}
      />
    ))}
  </>
)
