'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Expand } from 'lucide-react'

interface Props {
  src: string
  alt?: string
  className?: string
}

export function ExpandableImage({ src, alt = 'Folienbild', className }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full text-left cursor-zoom-in"
      >
        <img src={src} alt={alt} className={className} />
        <span className="absolute bottom-2 right-2 flex items-center justify-center h-7 w-7 rounded-full bg-black/50 text-white opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Expand className="h-3.5 w-3.5" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-4xl w-full p-2 bg-transparent border-none shadow-none"
          overlayClassName="bg-black/90"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img src={src} alt={alt} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
        </DialogContent>
      </Dialog>
    </>
  )
}
