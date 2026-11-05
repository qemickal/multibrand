import { ArrowRight, CloudOff, Info, Sparkles } from 'lucide-react'
import { brandPresentation } from '../lib/workspace.js'

export function AppLogo({ compact = false }) {
  return <div className={`app-logo ${compact ? 'app-logo-compact' : ''}`}>
    <img src="/icon-192.png" alt="" className="app-logo-image" />
    <div className="app-logo-copy"><strong>MONO CROMAT <span className="app-logo-company">&amp; CO<span className="app-logo-dot">.</span></span></strong><small>PREAPERTURA</small></div>
  </div>
}

export function BrandAvatar({ brand, size = 'normal' }) {
  const presentation = brandPresentation(brand)
  return <span aria-hidden="true" className={`brand-avatar brand-${presentation.color} brand-avatar-${size}`}>{presentation.initials}</span>
}

const statusClasses = {
  'Pendiente': 'pending',
  'En curso': 'progress',
  'En revisión': 'review',
  'Bloqueado': 'blocked',
  'Hecho': 'done',
  'No aplica': 'neutral',
  'Abierto': 'blocked',
  'Mitigado': 'progress',
  'Cerrado': 'done',
}

export function StatusBadge({ status }) {
  return <span className={`status-badge status-${statusClasses[status] || 'neutral'}`}><span className="status-dot" />{status || 'Sin estado'}</span>
}

export function ProgressBar({ value, label = 'Avance' }) {
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
    <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
}

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-heading">
    <div>
      <div className="eyebrow"><span />{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action && <div className="page-heading-action">{action}</div>}
  </div>
}

export function DataNotice({ local, online }) {
  if (!online && !local) return <div className="data-notice warning" role="status"><CloudOff size={17} /><span><strong>Sin conexión.</strong> Los cambios en Supabase necesitan internet para guardarse.</span></div>
  if (!local) return null
  return <div className="data-notice" role="status"><Info size={17} /><span><strong>Estás en modo local.</strong> Esta vista parte de los datos iniciales del proyecto; tus cambios se guardan solo en este navegador y dirección web; no se sincronizan con el Excel ni con Supabase.</span></div>
}

export function EmptyState({ title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Sparkles size={20} /></span><strong>{title}</strong><p>{description}</p>{action}</div>
}

export function TextLink({ children, onClick, className = '' }) {
  return <button type="button" className={`text-link ${className}`} onClick={onClick}>{children}<ArrowRight size={15} /></button>
}
