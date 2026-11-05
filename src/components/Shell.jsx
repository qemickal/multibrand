import { CalendarDays, ClipboardList, Grid2X2, LayoutDashboard, LogOut, ShieldAlert } from 'lucide-react'
import { AppLogo } from './common.jsx'

const NAV_ITEMS = [
  { id: 'panel', label: 'Vista general', icon: LayoutDashboard },
  { id: 'checklist', label: 'Checklist', icon: ClipboardList },
  { id: 'marcas', label: 'Marcas', icon: Grid2X2 },
  { id: 'riesgos', label: 'Riesgos', icon: ShieldAlert },
]

export default function Shell({ page, onNavigate, local, email, canExit, onExit, online, children }) {
  const date = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()).replace('.', '')
  return <div className="app-layout">
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <div className="workspace-frame">
      <header className={`topbar ${canExit ? 'has-account' : ''}`}>
        <div className="top-brand"><AppLogo /></div>
        <nav className="top-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onNavigate(id)} className={`nav-item ${page === id ? 'active' : ''}`} aria-current={page === id ? 'page' : undefined}>
            <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
          </button>)}
        </nav>
        <div className="topbar-right">
          <span className="top-date"><CalendarDays size={15} />{date}</span>
          <span className={`connection-pill ${!online && !local ? 'offline' : ''}`}><span />{local ? 'Modo local' : online ? 'Supabase' : 'Sin conexión'}</span>
          {canExit ? <button type="button" className="account-button" onClick={onExit} aria-label={local ? 'Volver al acceso' : 'Cerrar sesión'} title={local ? 'Volver al acceso' : `Cerrar sesión${email ? ` · ${email}` : ''}`}><LogOut size={16} /></button> : <span className="account-mark" aria-hidden="true">MC</span>}
        </div>
      </header>
      <main id="contenido" className="main-content">{children}</main>
      <footer className="main-footer"><span>MONO CROMAT & CO. <i>✳</i> SISTEMA DE PREAPERTURA</span><span>COLOR · FORMA · MENSAJE · CULTURA</span></footer>
    </div>
  </div>
}
