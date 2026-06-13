// Clientseitiges Rendern einzelner PDF-Seiten zu base64-PNGs (für Visual-Deck-Modus).
// Läuft im Browser via pdfjs-dist — kein zusätzlicher Server-Call, kein Vercel-Timeout-Risiko.
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const MAX_WIDTH = 800

export async function loadPdfDocument(pdfBytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ data: pdfBytes }).promise
}

// Rendert eine 1-indexierte PDF-Seite zu einem auf MAX_WIDTH downgescalten JPEG (als base64, ohne data-URL-Prefix).
// JPEG statt PNG: kleinere DB-Grösse und passend zum bestehenden `data:image/jpeg;base64,...`-Rendering
// in lern-card/review-card/karte-list-item.
export async function renderPageToBase64(pdf: PDFDocumentProxy, pageNumber: number): Promise<string | null> {
  try {
    if (pageNumber < 1 || pageNumber > pdf.numPages) return null

    const page = await pdf.getPage(pageNumber)
    const baseViewport = page.getViewport({ scale: 1 })
    const scale = Math.min(2, MAX_WIDTH / baseViewport.width)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) return null

    // Weisser Hintergrund, da PDF-Seiten meist transparent gerendert werden und JPEG kein Alpha kennt
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvas, viewport }).promise

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return dataUrl.replace(/^data:image\/jpeg;base64,/, '')
  } catch (err) {
    console.error('[pdf-render] Seite konnte nicht gerendert werden:', err)
    return null
  }
}
