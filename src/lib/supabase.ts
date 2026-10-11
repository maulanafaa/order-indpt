/// <reference types="vite/client" />
/**
 * Supabase client for the order-indpt project. VITE_SUPABASE_URL and
 * VITE_SUPABASE_PUBLISHABLE_KEY in .env override the defaults; set
 * VITE_SUPABASE_URL=off to run on bundled JSON alone. The publishable key is
 * meant for browsers: row level security guards the data.
 */
import { createClient } from '@supabase/supabase-js'

// `?? {}`: scripts run under Node (via lib/format) where import.meta.env is undefined.
const env: Partial<ImportMetaEnv> = import.meta.env ?? {}
const url = (env.VITE_SUPABASE_URL as string | undefined) ?? 'https://yloquiitacrevnmcsfvw.supabase.co'
const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? 'sb_publishable_Z559wZcvrnhCERbOJ9X_Jg_Sc-hf1gw'

export const supabase = url !== 'off' && key ? createClient(url, key) : null

/**
 * Public URL of a file in the `images` bucket (menu/{slug}.webp, stores/{slug}.webp).
 * Without Supabase it points at public/images instead.
 */
export const imageUrl = (path: string) => (supabase ? `${url}/storage/v1/object/public/images/${path}` : `/images/${path}`)
