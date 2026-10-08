import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const recoveryMessage = 'Se houver uma conta associada a esses dados, enviaremos um link de redefinição para o e-mail cadastrado.'

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const isAllowedRedirect = (value: string) => {
  try {
    const url = new URL(value)
    const isLocal = url.protocol === 'http:'
      && ['localhost', '127.0.0.1'].includes(url.hostname)
      && url.port === '5173'
    const isPublished = url.protocol === 'https:' && url.hostname === 'zduffiz.github.io'
    return (isLocal || isPublished) && url.pathname.startsWith('/pkhuntdb/')
  } catch {
    return false
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)

  let body: { username?: unknown; redirectTo?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ message: recoveryMessage })
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : ''
  if (!/^[a-z0-9_]{3,24}$/.test(username) || !isAllowedRedirect(redirectTo)) {
    return jsonResponse({ message: recoveryMessage })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Password recovery is not configured.')
    return jsonResponse({ message: recoveryMessage })
  }

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (profileError) {
      console.error('Password recovery profile lookup failed.')
      return jsonResponse({ message: recoveryMessage })
    }
    if (!profile) return jsonResponse({ message: recoveryMessage })

    const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.id)
    const accountEmail = account.user?.email
    if (accountError || !accountEmail) return jsonResponse({ message: recoveryMessage })

    const authenticator = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: recoveryError } = await authenticator.auth.resetPasswordForEmail(accountEmail, { redirectTo })
    if (recoveryError) console.error('Password recovery email request failed.')
  } catch {
    console.error('Password recovery request failed.')
  }

  return jsonResponse({ message: recoveryMessage })
})