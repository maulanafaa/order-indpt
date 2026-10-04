/**
 * npm run check:images
 *
 * Lists menu items and stores that have no photo yet. Photos are matched by slug:
 *   public/images/menu/{item.slug}.webp     square 800 x 800, under 200 KB
 *   public/images/stores/{store.slug}.webp  1200 x 600, under 200 KB
 * .jpg, .jpeg and .png also count. Files that match nothing are listed too.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { itemSchema, storeSchema } from '../src/data/schema'

const root = fileURLToPath(new URL('..', import.meta.url))
const exts = ['.webp', '.jpg', '.jpeg', '.png']
const maxBytes = 200 * 1024

function load<T>(file: string, schema: z.ZodType<T>): T {
  const path = join(root, 'src/data', file)
  if (!existsSync(path)) {
    console.error(`src/data/${file} is missing. Run npm run scrape first.`)
    process.exit(1)
  }
  return schema.parse(JSON.parse(readFileSync(path, 'utf8')))
}

function check(label: string, dir: string, rows: { slug: string; name: string }[]) {
  const folder = join(root, 'public/images', dir)
  const files = existsSync(folder) ? readdirSync(folder).filter((f) => exts.includes(parse(f).ext.toLowerCase())) : []
  const bySlug = new Map(files.map((f) => [parse(f).name, f]))
  const missing = rows.filter((r) => !bySlug.has(r.slug))
  const slugs = new Set(rows.map((r) => r.slug))
  const unmatched = files.filter((f) => !slugs.has(parse(f).name))
  const tooBig = files.filter((f) => statSync(join(folder, f)).size > maxBytes)

  console.log(`\n${label}: ${rows.length - missing.length} of ${rows.length} have a photo (public/images/${dir}/)`)
  if (missing.length) {
    console.log(`  Missing (${missing.length}):`)
    for (const r of missing) console.log(`    ${r.slug}.webp  ${r.name}`)
  }
  if (unmatched.length) {
    console.log(`  Files that match no ${dir === 'menu' ? 'item' : 'store'} (check the name):`)
    for (const f of unmatched) console.log(`    ${f}`)
  }
  if (tooBig.length) {
    console.log('  Over 200 KB:')
    for (const f of tooBig) console.log(`    ${f}  ${Math.round(statSync(join(folder, f)).size / 1024)} KB`)
  }
  return missing.length
}

const items = load('items.json', z.array(itemSchema))
const stores = load('stores.json', z.array(storeSchema))
const missing = check('Menu items', 'menu', items) + check('Stores', 'stores', stores)
console.log(`\n${missing} photos still missing. Missing photos show a grey placeholder in the app.`)
