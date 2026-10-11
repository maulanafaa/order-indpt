/**
 * npm run check:images
 *
 * Lists menu items and stores with no photo in the Supabase Storage bucket
 * `images` yet (menu/{item.slug}.webp, stores/{store.slug}.webp), and photos in
 * the local drop folder (photos/) that are not uploaded yet. No key needed:
 * the bucket is public.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { itemSchema, storeSchema } from '../src/data/schema'

const root = fileURLToPath(new URL('..', import.meta.url))
const base = `${process.env.VITE_SUPABASE_URL ?? 'https://yloquiitacrevnmcsfvw.supabase.co'}/storage/v1/object/public/images`

const load = <T>(file: string, schema: z.ZodType<T>): T => schema.parse(JSON.parse(readFileSync(join(root, 'src/data', file), 'utf8')))

/** HEAD every expected file, 12 at a time. */
async function online(dir: string, slugs: string[]) {
  const found = new Set<string>()
  let i = 0
  const worker = async () => {
    while (i < slugs.length) {
      const slug = slugs[i++]
      const res = await fetch(`${base}/${dir}/${slug}.webp`, { method: 'HEAD' })
      if (res.ok) found.add(slug)
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker))
  return found
}

async function check(label: string, dir: string, rows: { slug: string; name: string }[]) {
  const found = await online(dir, rows.map((r) => r.slug))
  const missing = rows.filter((r) => !found.has(r.slug))
  const folder = join(root, 'photos', dir)
  const local = existsSync(folder) ? readdirSync(folder).filter((f) => parse(f).ext === '.webp').map((f) => parse(f).name) : []
  const waiting = local.filter((s) => !found.has(s))

  console.log(`\n${label}: ${found.size} of ${rows.length} have a photo in Supabase (images/${dir}/)`)
  if (waiting.length) console.log(`  In photos/${dir}/ but not uploaded yet (${waiting.length}): run npm run images:upload`)
  if (missing.length) {
    console.log(`  Missing (${missing.length}), name the file:`)
    for (const r of missing) console.log(`    ${r.slug}.webp  ${r.name}`)
  }
  return missing.length
}

try {
  const items = load('items.json', z.array(itemSchema))
  const stores = load('stores.json', z.array(storeSchema))
  const missing = (await check('Menu items', 'menu', items)) + (await check('Stores', 'stores', stores))
  console.log(`\n${missing} photos still missing. Missing photos show a grey placeholder in the app.`)
} catch (err) {
  console.error('Could not reach Supabase Storage:', err instanceof Error ? err.message : err)
  process.exit(1)
}
