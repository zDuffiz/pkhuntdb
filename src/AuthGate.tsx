import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useState } from 'react'
import { ArrowLeft, Globe, LogIn, ShieldCheck, UserPlus, X } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import './auth.css'

type AuthScreen = 'welcome' | 'signin' | 'signup' | 'forgot-password' | 'reset-password'
type MembershipLevel = 'free' | 'vip'

const MembershipContext = createContext<{ level: MembershipLevel; loading: boolean }>({ level: 'free', loading: false })

export const useMembership = () => useContext(MembershipContext)

const isSecurePassword = (value: string) => value.length >= 10
  && /\p{Lu}/u.test(value)
  && /\p{Ll}/u.test(value)
  && /\p{N}/u.test(value)
  && /[\p{P}\p{S}]/u.test(value)

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<MembershipLevel>('free')
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [guest, setGuest] = useState(false)
  const [screen, setScreen] = useState<AuthScreen>('welcome')
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase) {
      setReady(true)
      return
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (_event === 'PASSWORD_RECOVERY') {
        setScreen('reset-password')
        setPassword('')
        setConfirmPassword('')
        setMessage('')
      }
      setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    }).catch(() => setReady(true))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) {
      setMembership('free')
      setMembershipLoading(false)
      return
    }

    let active = true
    setMembershipLoading(true)
    void supabase.functions.invoke('get-membership').then(({ data, error }) => {
      if (!active) return
      setMembership(!error && data?.level === 'vip' ? 'vip' : 'free')
      setMembershipLoading(false)
    }).catch(() => {
      if (!active) return
      setMembership('free')
      setMembershipLoading(false)
    })

    return () => { active = false }
  }, [session?.user.id])

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setMessage('O cadastro ainda não está configurado neste site. Consulte Autenticação (Supabase) no README.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      if (screen === 'signup') {
        const normalizedUsername = username.trim().toLowerCase()
        if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
          throw new Error('Use um nome de usuário de 3 a 24 caracteres: letras, números ou _.')
        }
        if (!isSecurePassword(password)) {
          throw new Error('A senha precisa cumprir todos os requisitos de segurança.')
        }
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.')
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: normalizedUsername }, emailRedirectTo: window.location.href },
        })
        if (error) throw error
        if (!data.session) setMessage('Conta criada. Confira seu e-mail para confirmar o cadastro e entrar.')
      } else if (identifier.trim().includes('@')) {
        const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password })
        if (error?.message === 'Invalid login credentials') throw new Error('E-mail ou senha inválidos.')
        if (error) throw error
      } else {
        const { data, error } = await supabase.functions.invoke('login-with-username', {
          body: { username: identifier.trim().toLowerCase(), password },
        })
        if (error) {
          const context = 'context' in error ? error.context : null
          if (context instanceof Response) {
            const responseBody = await context.clone().json().catch(() => null) as { error?: unknown } | null
            if (typeof responseBody?.error === 'string') throw new Error(responseBody.error)
          }
          throw error
        }
        if (!data?.access_token || !data?.refresh_token) throw new Error('Não foi possível iniciar a sessão. Tente novamente.')
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        if (sessionError) throw sessionError
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a autenticação.')
    } finally {
      setBusy(false)
    }
  }

  async function requestPasswordReset(recoveryIdentifier: string) {
    if (!supabase) {
      setMessage('O serviço de recuperação de senha não está configurado.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      if (recoveryIdentifier.trim().includes('@')) {
        const { error } = await supabase.auth.resetPasswordForEmail(recoveryIdentifier.trim(), {
          redirectTo: window.location.href,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.functions.invoke('request-password-reset', {
          body: {
            username: recoveryIdentifier.trim().toLowerCase(),
            redirectTo: window.location.href,
          },
        })
        if (error) throw new Error('Não foi possível solicitar o e-mail agora. Tente novamente.')
      }
      setMessage('Se houver uma conta associada a esses dados, enviaremos um link de redefinição para o e-mail cadastrado.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível solicitar a redefinição de senha.')
    } finally {
      setBusy(false)
    }
  }

  async function updateRecoveredPassword(nextPassword: string, nextConfirmPassword: string) {
    if (!supabase) return
    if (!isSecurePassword(nextPassword)) {
      setMessage('Use pelo menos 10 caracteres, incluindo maiúscula, minúscula, número e símbolo.')
      return
    }
    if (nextPassword !== nextConfirmPassword) {
      setMessage('As senhas não coincidem.')
      return
    }
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.updateUser({ password: nextPassword })
    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }
    await supabase.auth.signOut()
    setSession(null)
    setScreen('signin')
    setPassword('')
    setConfirmPassword('')
    setMessage('Senha redefinida. Entre com a nova senha.')
    setBusy(false)
  }

  async function signInWithGoogle() {
    if (!supabase) return
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
    if (error) {
      setMessage(error.message)
      setBusy(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setGuest(false)
    setScreen('welcome')
    setMessage('')
  }

  function closeAuthentication() {
    setGuest(true)
    setScreen('welcome')
    setMessage('')
  }

  if (!ready) return <div className="auth-gate-shell">{children}<div className="auth-screen auth-loading-screen"><div className="auth-loading" aria-label="Carregando sessão" /></div></div>

  const displayName = session?.user.user_metadata.username || session?.user.email || 'Treinador'
  const showWelcome = !session && !guest && screen === 'welcome'
  const showForm = !session && (screen === 'signin' || screen === 'signup')
  const showRecoveryForm = !session && screen === 'forgot-password'
  const showPasswordResetForm = screen === 'reset-password'

  return <MembershipContext.Provider value={{ level: membership, loading: membershipLoading }}><div className="auth-gate-shell">
    {children}
    {(session || guest) && <div className="auth-userbar">
      {session ? <><span><ShieldCheck size={15} /> {displayName}</span><span className={`auth-tier-badge auth-tier-badge-${membership}`}>{membershipLoading ? '...' : membership.toUpperCase()}</span><button type="button" onClick={signOut}>Sair</button></> : <><span className="auth-tier-badge auth-tier-badge-free">FREE</span><button type="button" onClick={() => { setMessage(''); setScreen('signin') }}>Entrar</button></>}
    </div>}
    {showWelcome && <WelcomeScreen
      message={message}
      configured={Boolean(supabase)}
      onSignIn={() => { setMessage(''); setScreen('signin') }}
      onSignUp={() => { setMessage(''); setScreen('signup') }}
      onGoogle={signInWithGoogle}
      onGuest={closeAuthentication}
      onClose={closeAuthentication}
    />}
    {showForm && <div className="auth-screen auth-form-screen"><div className="auth-form-frame"><AuthForm
      screen={screen as 'signin' | 'signup'}
      identifier={identifier}
      email={email}
      username={username}
      password={password}
      confirmPassword={confirmPassword}
      busy={busy}
      configured={Boolean(supabase)}
      message={message}
      onIdentifier={setIdentifier}
      onEmail={setEmail}
      onUsername={setUsername}
      onPassword={setPassword}
      onConfirmPassword={setConfirmPassword}
      onSubmit={submitCredentials}
      onForgotPassword={() => { setMessage(''); setScreen('forgot-password') }}
      onBack={() => { setMessage(''); setScreen('welcome') }}
      onClose={closeAuthentication}
      onGoogle={signInWithGoogle}
    /></div></div>}
    {showRecoveryForm && <div className="auth-screen auth-form-screen"><div className="auth-form-frame"><PasswordRecoveryForm
      identifier={identifier}
      busy={busy}
      configured={Boolean(supabase)}
      message={message}
      onIdentifier={setIdentifier}
      onSubmit={requestPasswordReset}
      onBack={() => { setMessage(''); setScreen('signin') }}
      onClose={closeAuthentication}
    /></div></div>}
    {showPasswordResetForm && <div className="auth-screen auth-form-screen"><div className="auth-form-frame"><PasswordResetForm
      password={password}
      confirmPassword={confirmPassword}
      busy={busy}
      message={message}
      onPassword={setPassword}
      onConfirmPassword={setConfirmPassword}
      onSubmit={updateRecoveredPassword}
      onClose={closeAuthentication}
    /></div></div>}
  </div></MembershipContext.Provider>
}

function WelcomeScreen({
  message, configured, onSignIn, onSignUp, onGoogle, onGuest, onClose,
}: {
  message: string
  configured: boolean
  onSignIn: () => void
  onSignUp: () => void
  onGoogle: () => void
  onGuest: () => void
  onClose: () => void
}) {
  return <div className="auth-screen"><section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-welcome-title">
    <button className="auth-close" type="button" aria-label="Fechar acesso" title="Fechar e navegar" onClick={onClose}><X size={19} /></button>
    <div className="auth-panel-heading"><span>PK HUNT DATABASE</span><span className="auth-lock"><ShieldCheck size={15} /> ACESSO OPCIONAL</span></div>
    <h2 id="auth-welcome-title">Acesse sua jornada</h2>
    <p className="auth-panel-description">Entre para manter sua conta conectada ou continue explorando sem login.</p>
    {message && <p className="auth-message" role="alert">{message}</p>}
    {!configured && <p className="auth-setup-note">Login ainda não configurado. A navegação como visitante está disponível.</p>}
    <button className="auth-action auth-action-primary" type="button" onClick={onSignIn}><LogIn size={17} /> Entrar com e-mail ou usuário</button>
    <button className="auth-action auth-action-secondary" type="button" onClick={onSignUp}><UserPlus size={17} /> Criar conta</button>
    <div className="auth-divider"><span>ou</span></div>
    <button className="auth-action auth-action-google" type="button" onClick={onGoogle} disabled={!configured}><Globe size={17} /> Continuar com Google</button>
    <button className="auth-guest" type="button" onClick={onGuest}>Navegar sem entrar <span>→</span></button>
  </section></div>
}

function AuthForm({
  screen, identifier, email, username, password, confirmPassword, busy, configured, message,
  onIdentifier, onEmail, onUsername, onPassword, onConfirmPassword, onSubmit, onForgotPassword, onBack, onClose, onGoogle,
}: {
  screen: 'signin' | 'signup'
  identifier: string
  email: string
  username: string
  password: string
  confirmPassword: string
  busy: boolean
  configured: boolean
  message: string
  onIdentifier: (value: string) => void
  onEmail: (value: string) => void
  onUsername: (value: string) => void
  onPassword: (value: string) => void
  onConfirmPassword: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onForgotPassword: () => void
  onBack: () => void
  onClose: () => void
  onGoogle: () => void
}) {
  const signingUp = screen === 'signup'
  const passwordRequirements = [
    { label: '10 caracteres ou mais', met: password.length >= 10 },
    { label: 'Uma letra maiúscula', met: /\p{Lu}/u.test(password) },
    { label: 'Uma letra minúscula', met: /\p{Ll}/u.test(password) },
    { label: 'Um número', met: /\p{N}/u.test(password) },
    { label: 'Um símbolo', met: /[\p{P}\p{S}]/u.test(password) },
  ]
  return <section className="auth-form-panel" role="dialog" aria-modal="true" aria-labelledby="auth-form-title">
    <button className="auth-close" type="button" aria-label="Fechar acesso" title="Fechar e navegar" onClick={onClose}><X size={19} /></button>
    <button className="auth-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Voltar</button>
    <div className="auth-panel-heading"><span>{signingUp ? 'NOVO TREINADOR' : 'BEM-VINDO DE VOLTA'}</span><span className="auth-lock"><ShieldCheck size={15} /> SUPABASE</span></div>
    <h2 id="auth-form-title">{signingUp ? 'Criar sua conta' : 'Entrar na conta'}</h2>
    <p className="auth-panel-description">{signingUp ? 'Seus dados ficam salvos para a próxima visita.' : 'Use seu e-mail ou nome de usuário.'}</p>
    {message && <p className="auth-message" role="alert">{message}</p>}
    {!configured && !signingUp && <p className="auth-setup-note">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o login.</p>}
    <form className="auth-form" onSubmit={onSubmit}>
      {signingUp ? <>
        <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => onEmail(event.target.value)} placeholder="voce@exemplo.com" /></label>
        <label>Nome de usuário<input type="text" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" value={username} onChange={(event) => onUsername(event.target.value)} placeholder="Seu nome no jogo" /></label>
      </> : <label>E-mail ou nome de usuário<input type="text" autoComplete="username" required value={identifier} onChange={(event) => onIdentifier(event.target.value)} placeholder="E-mail ou usuário" /></label>}
      <label>Senha<input type="password" autoComplete={signingUp ? 'new-password' : 'current-password'} required minLength={signingUp ? 10 : 6} value={password} onChange={(event) => onPassword(event.target.value)} placeholder={signingUp ? 'Crie uma senha segura' : 'Sua senha'} />{signingUp && <span className="auth-password-hint">A senha deve conter:</span>}</label>
      {signingUp && <>
        <ul className="auth-password-rules" aria-label="Requisitos da senha">
          {passwordRequirements.map((requirement) => <li key={requirement.label} className={requirement.met ? 'met' : ''}><span aria-hidden="true">{requirement.met ? '✓' : '○'}</span>{requirement.label}</li>)}
        </ul>
        <label>Confirmar senha<input type="password" autoComplete="new-password" required minLength={10} value={confirmPassword} onChange={(event) => onConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" />{confirmPassword && <span className={password === confirmPassword ? 'auth-password-match matched' : 'auth-password-match'}>{password === confirmPassword ? 'As senhas coincidem.' : 'As senhas ainda não coincidem.'}</span>}</label>
      </>}
      <button className="auth-action auth-action-primary" type="submit" disabled={busy}>{busy ? 'Aguarde...' : signingUp ? 'Criar conta' : 'Entrar'} <span>→</span></button>
      {!signingUp && <button className="auth-forgot-link" type="button" onClick={onForgotPassword}>Esqueci minha senha</button>}
    </form>
    <div className="auth-divider"><span>ou</span></div>
    <button className="auth-action auth-action-google" type="button" onClick={onGoogle} disabled={!configured || busy}><Globe size={17} /> Continuar com Google</button>
  </section>
}

function PasswordRecoveryForm({
  identifier, busy, configured, message, onIdentifier, onSubmit, onBack, onClose,
}: {
  identifier: string
  busy: boolean
  configured: boolean
  message: string
  onIdentifier: (value: string) => void
  onSubmit: (identifier: string) => void
  onBack: () => void
  onClose: () => void
}) {
  return <section className="auth-form-panel" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
    <button className="auth-close" type="button" aria-label="Fechar recuperação" title="Fechar e navegar" onClick={onClose}><X size={19} /></button>
    <button className="auth-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Voltar</button>
    <div className="auth-panel-heading"><span>RECUPERAÇÃO DE CONTA</span><span className="auth-lock"><ShieldCheck size={15} /> SUPABASE</span></div>
    <h2 id="recovery-title">Esqueceu sua senha?</h2>
    <p className="auth-panel-description">Informe seu e-mail ou nome de usuário. Se houver uma conta, enviaremos as instruções para o e-mail cadastrado.</p>
    {message && <p className="auth-message" role="status">{message}</p>}
    {!configured && <p className="auth-setup-note">A recuperação de senha não está configurada neste site.</p>}
    <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onSubmit(identifier) }}>
      <label>E-mail ou nome de usuário<input type="text" autoComplete="username" required value={identifier} onChange={(event) => onIdentifier(event.target.value)} placeholder="E-mail ou usuário" /></label>
      <button className="auth-action auth-action-primary" type="submit" disabled={!configured || busy}>{busy ? 'Enviando...' : 'Enviar link de recuperação'} <span>→</span></button>
    </form>
  </section>
}

function PasswordResetForm({
  password, confirmPassword, busy, message, onPassword, onConfirmPassword, onSubmit, onClose,
}: {
  password: string
  confirmPassword: string
  busy: boolean
  message: string
  onPassword: (value: string) => void
  onConfirmPassword: (value: string) => void
  onSubmit: (password: string, confirmPassword: string) => void
  onClose: () => void
}) {
  const passwordRequirements = [
    { label: '10 caracteres ou mais', met: password.length >= 10 },
    { label: 'Uma letra maiúscula', met: /\p{Lu}/u.test(password) },
    { label: 'Uma letra minúscula', met: /\p{Ll}/u.test(password) },
    { label: 'Um número', met: /\p{N}/u.test(password) },
    { label: 'Um símbolo', met: /[\p{P}\p{S}]/u.test(password) },
  ]
  return <section className="auth-form-panel" role="dialog" aria-modal="true" aria-labelledby="reset-title">
    <button className="auth-close" type="button" aria-label="Fechar redefinição" title="Fechar e navegar" onClick={onClose}><X size={19} /></button>
    <div className="auth-panel-heading"><span>RECUPERAÇÃO DE CONTA</span><span className="auth-lock"><ShieldCheck size={15} /> NOVA SENHA</span></div>
    <h2 id="reset-title">Defina uma nova senha</h2>
    <p className="auth-panel-description">Escolha uma senha segura para sua conta.</p>
    {message && <p className="auth-message" role="alert">{message}</p>}
    <form className="auth-form" onSubmit={(event) => { event.preventDefault(); onSubmit(password, confirmPassword) }}>
      <label>Nova senha<input type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(event) => onPassword(event.target.value)} placeholder="Crie uma senha segura" /></label>
      <ul className="auth-password-rules" aria-label="Requisitos da senha">
        {passwordRequirements.map((requirement) => <li key={requirement.label} className={requirement.met ? 'met' : ''}><span aria-hidden="true">{requirement.met ? '✓' : '○'}</span>{requirement.label}</li>)}
      </ul>
      <label>Confirmar senha<input type="password" autoComplete="new-password" required minLength={10} value={confirmPassword} onChange={(event) => onConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" />{confirmPassword && <span className={password === confirmPassword ? 'auth-password-match matched' : 'auth-password-match'}>{password === confirmPassword ? 'As senhas coincidem.' : 'As senhas ainda não coincidem.'}</span>}</label>
      <button className="auth-action auth-action-primary" type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Redefinir senha'} <span>→</span></button>
    </form>
  </section>
}