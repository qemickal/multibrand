import { useState } from 'react'
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react'
import { AppLogo } from './common.jsx'

export default function Login({ supabase, onDemo, sessionError }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async event => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) throw authError
    } catch {
      setError('No pudimos iniciar sesión. Revisa tus datos y tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }
  return <div className="login-layout">
    <div className="login-left"><AppLogo /><div className="login-message"><span><Sparkles size={15} /> IDEAS EN MOVIMIENTO</span><h1>Todo gran comienzo<br />tiene un plan<span>.</span></h1><p>Un lugar para organizar lo que importa y darle forma a todo lo que viene.</p><div className="login-art" aria-hidden="true"><span /><span /><span /><b>✳</b></div></div><small>MONO CROMAT & CO. · SISTEMA DE PREAPERTURA</small></div>
    <div className="login-right"><div className="login-form-wrap"><div className="login-lock"><LockKeyhole size={22} /></div><div className="eyebrow"><span /> TU ESPACIO TE ESPERA</div><h2>Qué gusto verte.</h2><p>Inicia sesión para continuar preparando tus marcas.</p>
      <form onSubmit={submit}><label className="form-field"><span>Correo electrónico</span><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" required /></label><label className="form-field"><span>Contraseña</span><input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña" required /></label>{(error || sessionError) && <div className="form-error" role="alert">{error || sessionError}</div>}<button className="primary-button login-submit" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar a mi espacio'} <ArrowRight size={17} /></button></form>
      <div className="login-demo"><span>¿Quieres conocer la aplicación?</span><button type="button" onClick={onDemo}>Explorar la vista local <ArrowRight size={15} /></button><small>Los cambios de la vista local se guardan únicamente en este navegador.</small></div>
    </div></div>
  </div>
}
