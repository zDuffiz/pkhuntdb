import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)

  let username: string
  let password: string
  try {
    const body = await request.json()
    username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return jsonResponse({ error: 'Dados inválidos.' }, 400)
  }

  if (!/^[a-z0-9_]{3,24}$/.test(username) || password.length < 6 || password.length > 128) {
    return jsonResponse({ error: 'Usuário ou senha inválidos.' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Serviço de autenticação indisponível.' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (lookupError) return jsonResponse({ error: 'Serviço de autenticação indisponível.' }, 500)
  if (!profile) return jsonResponse({ error: 'Usuário ou senha inválidos.' }, 401)

  const { data: account, error: accountError } = await admin.auth.admin.getUserById(profile.id)
  const accountEmail = account.user?.email
  if (accountError || !accountEmail) return jsonResponse({ error: 'Usuário ou senha inválidos.' }, 401)

  const authenticator = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await authenticator.auth.signInWithPassword({
    email: accountEmail,
    password,
  })

  if (authError || !authData.session) return jsonResponse({ error: 'Usuário ou senha inválidos.' }, 401)
  return jsonResponse({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  })
})