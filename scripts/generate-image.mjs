import { fal } from '@fal-ai/client'
import fs from 'node:fs'
import path from 'node:path'

const [, , prompt, filename, imageSize] = process.argv

if (!prompt || !filename) {
  console.error('Verwendung: npm run generate-image -- "<prompt>" "<dateiname.png>" [image_size]')
  console.error('Beispiel:   npm run generate-image -- "modern tech startup hero illustration, isometric, blue and neon colors" "hero.png"')
  process.exit(1)
}

if (!process.env.FAL_KEY) {
  console.error('FAL_KEY fehlt in .env.local')
  process.exit(1)
}

fal.config({ credentials: process.env.FAL_KEY })

console.log(`Generiere Bild für: "${prompt}"...`)

const result = await fal.subscribe('fal-ai/flux/schnell', {
  input: {
    prompt,
    image_size: imageSize || 'landscape_16_9',
    num_inference_steps: 4,
  },
})

const imageUrl = result.data.images[0].url

const targetDir = path.join(process.cwd(), 'public', 'images')
fs.mkdirSync(targetDir, { recursive: true })

const targetPath = path.join(targetDir, filename)
const response = await fetch(imageUrl)
const buffer = Buffer.from(await response.arrayBuffer())
fs.writeFileSync(targetPath, buffer)

console.log(`Bild gespeichert: public/images/${filename}`)
