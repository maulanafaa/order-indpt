/**
 * phone-login: the prototype's fake OTP, backed by a real Supabase account.
 *
 * POST { mobile: "551234567", code: "123456" }
 *   → 200 { token_hash, created }  the client calls auth.verifyOtp({ token_hash, type: 'magiclink' })
 *   → 400 bad input, 401 code rejected (000000 incorrect, 111111 expired), 500 server error
 *
 * No SMS is sent: any 6 digits except the two test codes pass, as in src/lib/otp.ts.
 * Each mobile maps to one user with the email alias 966{mobile}@phone.order-indpt.app.
 * Prototype only: anyone who knows a number can sign in as it.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  let mobile = ''
  let code = ''
  try {
    const body = await req.json()
    mobile = String(body.mobile ?? '')
    code = String(body.code ?? '')
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!/^5\d{8}$/.test(mobile) || !/^\d{6}$/.test(code)) return json({ error: 'bad_request' }, 400)
  if (code === '000000') return json({ error: 'incorrect' }, 401)
  if (code === '111111') return json({ error: 'expired' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const email = `966${mobile}@phone.order-indpt.app`

  // Create on first login. An "already registered" error just means a returning user.
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { mobile },
  })
  const created = !createError

  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data?.properties?.hashed_token) {
    console.error('generateLink failed', error, createError)
    return json({ error: 'server' }, 500)
  }
  return json({ token_hash: data.properties.hashed_token, created })
})
