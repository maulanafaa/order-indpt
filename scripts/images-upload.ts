/**
 * npm run images:upload
 *
 * Uploads photos from the drop folder to the Supabase Storage bucket `images`:
 *   photos/menu/{item.slug}.webp     square 800 x 800, under 200 KB
 *   photos/stores/{store.slug}.webp  1200 x 600, under 200 KB
 * Existing files with the same name are replaced. Files whose name matches no
 * item or store, that are not .webp, or that are over 200 KB are skipped.
 *
 * Needs the service role key (Supabase dashboard > Project Settings > API Keys,
 * "secret" key) in .env.local, which git ignores:
 *   SUPABASE_SECRET_KEY=sb_secret_...
 * Never put this key in app code or commit it.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { itemSchema, storeSchema } from '../src/data/schema'

const root = fileURLToPath(new URL('..', import.meta.url))
try {
  process.loadEnvFile(join(root, '.env.local'))
} catch {
  // No .env.local: the key may come from the shell instead.
}

const url = process.env.VITE_SUPABASE_URL ?? 'https://yloquiitacrevnmcsfvw.supabase.co'
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key) {
  console.error('Missing SUPABASE_SECRET_KEY. Add it to .env.local (see the top of scripts/images-upload.ts).')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

const maxBytes = 200 * 1024
const slugsOf = (file: string, schema: z.ZodType<{ slug: string }[]>) =>
  new Set(schema.parse(JSON.parse(readFileSync(join(root, 'src/data', file), 'utf8'))).map((r) => r.slug))

const folders = [
  { dir: 'menu', slugs: slugsOf('items.json', z.array(itemSchema)) },
  { dir: 'stores', slugs: slugsOf('stores.json', z.array(storeSchema)) },
]

let uploaded = 0
let skipped = 0
for (const { dir, slugs } of folders) {
  const folder = join(root, 'photos', dir)
  if (!existsSync(folder)) continue
  for (const file of readdirSync(folder).filter((f) => !f.startsWith('.'))) {
    const { name, ext } = parse(file)
    const path = join(folder, file)
    const size = statSync(path).size
    const problem =
      ext.toLowerCase() !== '.webp'
        ? 'not .webp'
        : !slugs.has(name)
          ? `matches no ${dir === 'menu' ? 'item' : 'store'}`
          : size > maxBytes
            ? `${Math.round(size / 1024)} KB, over 200 KB`
            : null
    if (problem) {
      console.log(`  skip  photos/${dir}/${file}  (${problem})`)
      skipped++
      continue
    }
    const { error } = await supabase.storage.from('images').upload(`${dir}/${file}`, readFileSync(path), {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '3600',
    })
    if (error) {
      console.log(`  fail  photos/${dir}/${file}  (${error.message})`)
      skipped++
    } else {
      console.log(`  ok    ${dir}/${file}`)
      uploaded++
    }
  }
}
console.log(`\n${uploaded} uploaded, ${skipped} skipped. Run npm run check:images to see what is still missing.`)
