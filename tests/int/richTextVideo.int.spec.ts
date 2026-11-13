import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RichText } from '@/components/RichText'

const upload = (mimeType: string, filename: string, alt = 'Robopipe S on a conveyor') => ({
  type: 'upload',
  relationTo: 'media',
  value: { id: 1, alt, filename, mimeType, url: `/api/media/file/${filename}` },
  fields: null,
  format: '',
  version: 3,
})

const doc = (...children: object[]) => ({
  root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
})

const render = (content: object) =>
  renderToStaticMarkup(React.createElement(RichText, { data: content as never }))

describe('rich text upload rendering', () => {
  it('renders an uploaded video as a player with a caption, without autoplay', () => {
    const html = render(doc(upload('video/mp4', 'demo.mp4')))
    expect(html).toContain('<video')
    expect(html).toContain('controls=""')
    expect(html).toContain('preload="metadata"')
    expect(html).toContain('playsInline=""')
    expect(html).toContain('src="/api/media/file/demo.mp4"')
    expect(html).not.toContain('autoplay')
    expect(html).toContain('<figcaption>Robopipe S on a conveyor</figcaption>')
  })

  it('omits the caption when the video has no alt text', () => {
    const html = render(doc(upload('video/webm', 'demo.webm', '')))
    expect(html).toContain('<video')
    expect(html).not.toContain('<figcaption')
  })

  it('keeps the default rendering for images and other files', () => {
    const image = render(doc(upload('image/jpeg', 'line.jpg')))
    expect(image).toContain('<img')
    expect(image).not.toContain('<video')

    const pdf = render(doc(upload('application/pdf', 'sheet.pdf')))
    expect(pdf).toContain('href="/api/media/file/sheet.pdf"')
    expect(pdf).not.toContain('<video')
  })
})
