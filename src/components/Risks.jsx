import { ArrowUpRight, CheckCircle2, ChevronDown, Eye, Search, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react'
import { RISK_STATUSES } from '../lib/workspace.js'
import { DataNotice, EmptyState, PageHeader, StatusBadge } from './common.jsx'

export default function Risks({ data, local, online, filters, onFiltersChange, onOpenRisk, onNewRisk }) {
  const risks = data.riesgos
  const count = status => risks.filter(risk => risk.estado === status).length
  const query = (filters.search || '').trim().toLocaleLowerCase('es')
  const results = risks.filter(risk => (!filters.status || risk.estado === filters.status) && (!query || [risk.id, risk.riesgo, risk.area, risk.responsable, risk.mitigacion].join(' ').toLocaleLowerCase('es').includes(query)))
  const change = (key, value) => onFiltersChange({ ...filters, [key]: value })
  const clear = () => onFiltersChange({ search: '', status: '' })
  return <>
    <PageHeader eyebrow="MIRANDO HACIA ADELANTE" title="Riesgos" description="Identifica lo que puede interponerse y prepárate para resolverlo." action={<button type="button" className="primary-button" onClick={onNewRisk}><span>+</span> Nuevo riesgo</button>} />
    <DataNotice local={local} online={online} />
    <div className="risk-summary">
      {[{ label: 'Abiertos', status: 'Abierto', icon: ShieldAlert, tone: 'rose', note: 'Requieren seguimiento' }, { label: 'Mitigados', status: 'Mitigado', icon: ShieldCheck, tone: 'indigo', note: 'Con acciones en marcha' }, { label: 'Cerrados', status: 'Cerrado', icon: CheckCircle2, tone: 'mint', note: 'Resueltos y documentados' }].map(({ label, status, icon: Icon, tone, note }) => <button type="button" key={status} className={`risk-summary-card ${filters.status === status ? 'selected' : ''}`} onClick={() => change('status', filters.status === status ? '' : status)}><span className={`metric-icon tone-${tone}`}><Icon size={19} /></span><span><small>{label}</small><strong>{count(status)}</strong><em>{note}</em></span><ArrowUpRight size={16} /></button>)}
    </div>
    <section className="surface list-surface">
      <div className="list-intro"><div><div className="section-title-line"><h2>Registro de riesgos</h2><span className="count-chip">{results.length}</span></div><p>Documenta responsables, acciones y avances.</p></div><span className="list-hint"><Eye size={16} /> MEJOR PREVENIR</span></div>
      <div className="filters risk-filters"><label className="search-control"><Search size={18} /><span className="sr-only">Buscar riesgos</span><input type="search" placeholder="Buscar riesgo o área..." value={filters.search} onChange={event => change('search', event.target.value)} /></label><label className="select-control"><span className="sr-only">Filtrar riesgos por estado</span><select value={filters.status} onChange={event => change('status', event.target.value)}><option value="">Todos los estados</option>{RISK_STATUSES.map(status => <option key={status}>{status}</option>)}</select><ChevronDown size={15} /></label></div>
      {results.length ? <div className="risk-list">{results.map(risk => <button type="button" key={risk.id} className="risk-row" onClick={() => onOpenRisk(risk)}>
        <span className="risk-row-icon"><ShieldAlert size={18} /></span>
        <span className="risk-row-content"><span className="risk-meta">{risk.id} <i>·</i> {risk.area}</span><strong>{risk.riesgo}</strong><small>{risk.mitigacion || 'Sin acción de mitigación definida'}</small><span className="risk-row-tags"><span>Probabilidad: <b>{risk.probabilidad || 'Sin definir'}</b></span><span>Impacto: <b>{risk.impacto || 'Sin definir'}</b></span><span><UserRound size={13} /> {risk.responsable || 'Sin asignar'}</span></span></span>
        <span className="risk-row-end"><StatusBadge status={risk.estado} /><ArrowUpRight size={17} /></span>
      </button>)}</div> : <EmptyState title="No encontramos riesgos" description={filters.search || filters.status ? 'Prueba con otra búsqueda o cambia el estado.' : 'Puedes agregar un riesgo para empezar a darle seguimiento.'} action={filters.search || filters.status ? <button type="button" className="secondary-button" onClick={clear}>Limpiar filtros</button> : <button type="button" className="secondary-button" onClick={onNewRisk}>Agregar un riesgo</button>} />}
    </section>
  </>
}
