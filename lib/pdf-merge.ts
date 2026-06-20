import { PDFDocument } from 'pdf-lib'

export interface PdfMergeInfo {
  name: string
  pageCount: number
  fromPage: number
  toPage: number
}

// Führt mehrere clientseitig ausgewählte PDFs zu einem durchgehenden Dokument
// zusammen, damit Pre-Scan, Seiten-Batching und Bild-Rendering (die alle von
// einer einzigen, fortlaufenden Seitennummerierung ausgehen) unverändert
// weiterfunktionieren. `info` mappt die finalen Seitenzahlen zurück auf die
// jeweilige Quelldatei, damit der User z.B. "Folie 12" einer Datei zuordnen kann.
export async function mergePdfFiles(files: File[]): Promise<{ file: File; info: PdfMergeInfo[] }> {
  if (files.length === 1) {
    const bytes = await files[0].arrayBuffer()
    const pageCount = (await PDFDocument.load(bytes)).getPageCount()
    return { file: files[0], info: [{ name: files[0].name, pageCount, fromPage: 1, toPage: pageCount }] }
  }

  const merged = await PDFDocument.create()
  const info: PdfMergeInfo[] = []
  let cursor = 1
  for (const f of files) {
    const bytes = await f.arrayBuffer()
    const src = await PDFDocument.load(bytes)
    const pages = await merged.copyPages(src, src.getPageIndices())
    pages.forEach((p) => merged.addPage(p))
    info.push({ name: f.name, pageCount: pages.length, fromPage: cursor, toPage: cursor + pages.length - 1 })
    cursor += pages.length
  }
  const mergedBytes = await merged.save()
  const mergedFile = new File([mergedBytes], 'Zusammengeführt.pdf', { type: 'application/pdf' })
  return { file: mergedFile, info }
}
