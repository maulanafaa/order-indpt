/**
 * npm run scrape              fetch everything, save the raw cache, write src/data
 * npm run scrape -- --offline re-run from scripts/scrape/.cache/raw.json (no network)
 * npm run scrape -- --fixtures run from the small real sample in scripts/scrape/fixtures
 *
 * Writes the scraped tables only. Seed files (storeAvailability, user, orders,
 * promos) are hand-written and only checked here.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { dataFiles } from '../../src/data/schema'
import { normalise, type Tables } from './normalise'
import { rawBundleSchema } from './raw'
import { fetchAll } from './sources'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../..')
const dataDir = join(root, 'src/data')
const cacheFile = join(here, '.cache/raw.json')
const fixtureFile = join(here, 'fixtures/raw.json')

const args = new Set(process.argv.slice(2))
const log = (m: string) => console.log(m)

const fileFor: Record<keyof Tables, keyof typeof dataFiles> = {
  stores: 'stores.json',
  storeHours: 'storeHours.json',
  storeServices: 'storeServices.json',
  categories: 'categories.json',
  items: 'items.json',
  modifierGroups: 'modifierGroups.json',
  modifiers: 'modifiers.json',
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function fail(msg: string): never {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

async function main() {
  let rawInput: unknown
  if (args.has('--fixtures')) {
    log(`Using fixtures: ${fixtureFile}`)
    rawInput = readJson(fixtureFile)
  } else if (args.has('--offline')) {
    if (!existsSync(cacheFile)) fail('No cache yet. Run `npm run scrape` once with a network connection.')
    log(`Using cache: ${cacheFile}`)
    rawInput = readJson(cacheFile)
  } else {
    try {
      rawInput = await fetchAll(log)
    } catch (e) {
      fail(`Fetching failed: ${(e as Error).message}`)
    }
    mkdirSync(dirname(cacheFile), { recursive: true })
    writeFileSync(cacheFile, JSON.stringify(rawInput))
    log(`Saved raw responses to ${cacheFile}`)
  }

  const parsed = rawBundleSchema.safeParse(rawInput)
  if (!parsed.success) fail(`A source changed shape:\n${z.prettifyError(parsed.error)}`)

  const { tables, warnings, notes } = normalise(parsed.data)

  // Validate every table against the app schema.
  for (const [key, file] of Object.entries(fileFor) as [keyof Tables, keyof typeof dataFiles][]) {
    const r = dataFiles[file].safeParse(tables[key])
    if (!r.success) fail(`${file} is invalid:\n${z.prettifyError(r.error)}`)
  }

  // Cross-table references.
  const refErrors = checkReferences(tables)
  if (refErrors.length) fail(`Broken references:\n  ${refErrors.slice(0, 20).join('\n  ')}`)

  mkdirSync(dataDir, { recursive: true })
  for (const [key, file] of Object.entries(fileFor) as [keyof Tables, string][]) {
    writeFileSync(join(dataDir, file), JSON.stringify(tables[key], null, 2) + '\n')
  }

  // Seed files: validate and check they still point at real rows.
  const seedProblems = checkSeeds(tables)

  const countries = tables.stores.reduce<Record<string, number>>((a, s) => ((a[s.country] = (a[s.country] ?? 0) + 1), a), {})
  log('\nWrote src/data:')
  console.table(
    Object.entries(fileFor).map(([key, file]) => ({ file, rows: (tables[key as keyof Tables] as unknown[]).length })),
  )
  log(`Stores by country: ${Object.entries(countries).map(([c, n]) => `${c} ${n}`).join(', ')}`)
  for (const n of notes) log(`• ${n}`)
  for (const w of warnings) log(`! ${w}`)
  if (seedProblems.length) {
    log('\nSeed files need attention:')
    for (const p of seedProblems) log(`! ${p}`)
    process.exitCode = 1
  } else {
    log('✔ Seed files are valid and match the scraped ids.')
  }
}

function checkReferences(t: Tables): string[] {
  const errs: string[] = []
  const ids = (rows: { id: string }[], name: string) => {
    const set = new Set<string>()
    for (const r of rows) {
      if (set.has(r.id)) errs.push(`duplicate ${name} id ${r.id}`)
      set.add(r.id)
    }
    return set
  }
  const stores = ids(t.stores, 'store')
  const cats = ids(t.categories, 'category')
  const items = ids(t.items, 'item')
  const groups = ids(t.modifierGroups, 'group')
  ids(t.modifiers, 'modifier')
  const slugs = (rows: { slug: string }[], name: string) => {
    const set = new Set<string>()
    for (const r of rows) {
      if (set.has(r.slug)) errs.push(`duplicate ${name} slug ${r.slug}`)
      set.add(r.slug)
    }
  }
  slugs(t.stores, 'store')
  slugs(t.items, 'item')
  for (const h of t.storeHours) if (!stores.has(h.storeId)) errs.push(`storeHours -> ${h.storeId}`)
  for (const s of t.storeServices) if (!stores.has(s.storeId)) errs.push(`storeServices -> ${s.storeId}`)
  for (const i of t.items) if (!cats.has(i.categoryId)) errs.push(`item ${i.id} -> ${i.categoryId}`)
  for (const g of t.modifierGroups) if (!items.has(g.itemId)) errs.push(`group ${g.id} -> ${g.itemId}`)
  for (const m of t.modifiers) if (!groups.has(m.groupId)) errs.push(`modifier ${m.id} -> ${m.groupId}`)
  return errs
}

function checkSeeds(t: Tables): string[] {
  const problems: string[] = []
  const load = (file: keyof typeof dataFiles) => {
    const path = join(dataDir, file)
    if (!existsSync(path)) {
      problems.push(`${file} is missing`)
      return null
    }
    const r = dataFiles[file].safeParse(readJson(path))
    if (!r.success) {
      problems.push(`${file}: ${z.prettifyError(r.error)}`)
      return null
    }
    return r.data
  }
  const stores = new Set(t.stores.map((s) => s.id))
  const items = new Set(t.items.map((i) => i.id))
  const mods = new Set(t.modifiers.map((m) => m.id))

  const avail = load('storeAvailability.json') as z.infer<(typeof dataFiles)['storeAvailability.json']> | null
  for (const a of avail ?? []) {
    if (!stores.has(a.storeId)) problems.push(`storeAvailability: unknown store ${a.storeId}`)
    if (a.itemId && !items.has(a.itemId)) problems.push(`storeAvailability: unknown item ${a.itemId}`)
    if (a.modifierId && !mods.has(a.modifierId)) problems.push(`storeAvailability: unknown add-on ${a.modifierId}`)
  }
  const users = load('user.json') as z.infer<(typeof dataFiles)['user.json']> | null
  for (const u of users ? [users.existing, users.new] : []) {
    if (u.favouriteStoreId && !stores.has(u.favouriteStoreId)) problems.push(`user ${u.id}: unknown favourite store`)
  }
  const orders = load('orders.json') as z.infer<(typeof dataFiles)['orders.json']> | null
  for (const o of orders ?? []) {
    if (!stores.has(o.storeId)) problems.push(`order ${o.id}: unknown store ${o.storeId}`)
    const lines = o.items.reduce(
      (sum, it) => sum + (it.unitPrice + it.modifiers.reduce((m, x) => m + x.price * x.quantity, 0)) * it.quantity,
      0,
    )
    const cents = (n: number) => Math.round(n * 100)
    if (cents(lines) !== cents(o.subtotal)) problems.push(`order ${o.id}: subtotal ${o.subtotal} but lines add up to ${lines}`)
    if (cents(o.subtotal - o.discount) !== cents(o.total)) problems.push(`order ${o.id}: total should be subtotal minus discount`)
    for (const it of o.items) {
      if (!items.has(it.itemId)) problems.push(`order ${o.id}: unknown item ${it.itemId}`)
      for (const m of it.modifiers) if (!mods.has(m.modifierId)) problems.push(`order ${o.id}: unknown add-on ${m.modifierId}`)
    }
  }
  load('promos.json')
  return problems
}

main()
