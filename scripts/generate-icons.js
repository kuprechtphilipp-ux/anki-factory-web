#!/usr/bin/env node
// Generates solid-color PNG placeholder icons for the PWA manifest
// violet #6d28d9 = rgb(109, 40, 217)

const { deflateSync } = require('zlib')
const { mkdirSync, writeFileSync } = require('fs')
const { join } = require('path')

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = (table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const body = Buffer.concat([t, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(body))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8  // bit depth
  ihdrData[9] = 2  // RGB color type
  // compression, filter, interlace = 0 (already zeroed)

  // Raw image data: one filter byte per row + RGB pixels
  const rowSize = size * 3 + 1
  const raw = Buffer.alloc(rowSize * size)
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      const o = y * rowSize + 1 + x * 3
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// violet primary color: #6d28d9
const [R, G, B] = [109, 40, 217]

writeFileSync(join(outDir, 'icon-192.png'), makePNG(192, R, G, B))
writeFileSync(join(outDir, 'icon-512.png'), makePNG(512, R, G, B))
writeFileSync(join(__dirname, '..', 'public', 'apple-touch-icon.png'), makePNG(180, R, G, B))

console.log('✓ Icons generated: icon-192.png, icon-512.png, apple-touch-icon.png')
