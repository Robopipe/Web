import React from 'react'

import type { PlanComparisonBlock } from '@/payload-types'

const Cell: React.FC<{ value: string | null | undefined }> = ({ value }) => {
  const v = value?.trim()
  if (!v || v === '—' || v === '-') {
    return <span className="text-text-38">—</span>
  }
  if (v === '✓' || v.toLowerCase() === 'yes') {
    return (
      <svg
        className="inline h-4 w-4 text-brand-fg"
        viewBox="0 0 16 16"
        fill="none"
        aria-label="✓"
        role="img"
      >
        <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return <span className="text-text-90">{v}</span>
}

export const PlanComparisonComponent: React.FC<PlanComparisonBlock> = ({
  heading,
  columns,
  groups,
}) => {
  const cols = columns ?? []

  return (
    <section className="container-site py-16 lg:py-24">
      {heading && <h2 className="mb-10 text-center">{heading}</h2>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-12">
              <th className="py-4 pr-4 text-left font-medium text-text-60" scope="col" />
              {cols.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-4 py-4 text-center font-heading text-base font-bold text-text-heading"
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          {(groups ?? []).map((group, gi) => (
            <tbody key={gi}>
              <tr>
                <th
                  colSpan={cols.length + 1}
                  scope="rowgroup"
                  className="pt-8 pb-3 text-left text-xs font-medium tracking-[0.08em] text-text-38 uppercase"
                >
                  {group.label}
                </th>
              </tr>
              {(group.rows ?? []).map((row, ri) => (
                <tr key={ri} className="border-b border-border-5">
                  <th scope="row" className="py-3.5 pr-4 text-left font-normal text-text-60">
                    {row.label}
                  </th>
                  {cols.map((_, ci) => (
                    <td key={ci} className="px-4 py-3.5 text-center">
                      <Cell value={row.values?.[ci]?.value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  )
}
