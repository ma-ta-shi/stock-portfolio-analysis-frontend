/**
 * RFC 4180 CSV. Fields are always quoted and embedded quotes doubled.
 * Cells starting with = + - @ are prefixed with ' so spreadsheet apps don't execute
 * them as formulas (CSV injection) — except plain numbers like "-12.50".
 */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

function escapeCell(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(text) && !/^[+-]?\d+(\.\d+)?$/.test(text)) {
    text = `'${text}`
  }
  return `"${text.replaceAll('"', '""')}"`
}

/** Trigger a browser download of `content` as a file. */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8') {
  // BOM so Excel opens UTF-8 (accents in company names) correctly.
  const blob = new Blob(['﻿', content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
