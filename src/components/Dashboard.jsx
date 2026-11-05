import { AlertTriangle, ArrowRight, ArrowUpRight, Check, CircleDot, ClipboardList, Lightbulb, Plus, Sparkles } from 'lucide-react'
import { brandAlertLabels, brandPresentation, brandStats, focusTasks, formatDate, isOverdue, RISK_STATUSES, statusCounts, TASK_STATUSES, workspaceMetrics } from '../lib/workspace.js'
import { BrandAvatar, DataNotice, PageHeader, ProgressBar, StatusBadge, TextLink } from './common.jsx'

function StatusChart({ tasks, onNavigate }) {
  const compactLabels = { Pendiente: 'Pend.', 'En revisión': 'En rev.', Bloqueado: 'Bloq.' }
  const counts = statusCounts(tasks, TASK_STATUSES)
  const max = Math.max(1, ...counts.map(item => item.count))
  return <div className="status-chart" role="group" aria-label="Distribución actual de tareas por estado">
    <div className="chart-guide" aria-hidden="true"><span /><span /><span /></div>
    <div className="chart-columns">{counts.map(({ status, count }, index) => <button type="button" className={`chart-column chart-color-${index}`} key={status} onClick={() => onNavigate('checklist', { status })} title={`Ver tareas: ${status}`}>
      <span className="chart-well"><span className="chart-stem" style={{ height: `${(count / max) * 100}%` }}><span className="chart-count">{count}</span><span className="chart-dot" /></span></span>
      <span className="chart-label"><span className={compactLabels[status] ? 'chart-label-full chart-label-can-shorten' : 'chart-label-full'}>{status}</span>{compactLabels[status] && <><span className="chart-label-short" aria-hidden="true">{compactLabels[status]}</span><span className="sr-only chart-label-mobile-sr">{status}</span></>}</span><span className="sr-only">. Ver tareas</span>
    </button>)}</div>
  </div>
}

export default function Dashboard({ data, local, online, onNavigate, onOpenTask, onNewTask }) {
  const { marcas, tareas, riesgos } = data
  const metrics = workspaceMetrics(tareas, riesgos)
  const brands = brandStats(marcas, tareas)
  const upcoming = focusTasks(tareas).slice(0, 3)
  const findBrand = name => marcas.find(brand => brand.nombre === name) || { nombre: name }
  const riskCounts = statusCounts(riesgos, RISK_STATUSES)
  const riskLabels = { Abierto: 'Abiertos', Mitigado: 'Mitigados', Cerrado: 'Cerrados' }
  const summaryCards = [
    { label: 'Tareas totales', value: metrics.total, note: 'Tu hoja de ruta', action: () => onNavigate('checklist') },
    { label: 'Completadas', value: metrics.done, note: 'Con estado hecho', action: () => onNavigate('checklist', { status: 'Hecho' }) },
    { label: 'En curso', value: metrics.inProgress, note: 'En movimiento', action: () => onNavigate('checklist', { status: 'En curso' }) },
  ]

  return <>
    <PageHeader eyebrow="MONO CROMAT & CO. / ESPACIO DE TRABAJO" title="Vista general" description="Una mirada a todo lo que estamos preparando." action={<button type="button" className="primary-button" onClick={onNewTask}><Plus size={17} /> Nueva tarea</button>} />
    <DataNotice local={local} online={online} />

    {(metrics.blocked > 0 || metrics.overdue > 0 || metrics.missingEvidence > 0) && <section className="attention-banner" aria-label="Tareas que necesitan atención"><span className="attention-icon"><AlertTriangle size={18} /></span><div><strong>Hay tareas que necesitan tu atención</strong><p>Revisa estos pendientes para mantener el proyecto en movimiento.</p></div><div className="attention-actions">{metrics.blocked > 0 && <button type="button" onClick={() => onNavigate('checklist', { status: 'Bloqueado' })}>{metrics.blocked} bloqueada{metrics.blocked === 1 ? '' : 's'} <ArrowRight size={14} /></button>}{metrics.overdue > 0 && <button type="button" onClick={() => onNavigate('checklist', { attention: 'overdue' })}>{metrics.overdue} vencida{metrics.overdue === 1 ? '' : 's'} <ArrowRight size={14} /></button>}{metrics.missingEvidence > 0 && <button type="button" onClick={() => onNavigate('checklist', { attention: 'evidence' })}>{metrics.missingEvidence} sin evidencia <ArrowRight size={14} /></button>}</div></section>}

    <div className="overview-layout">
      <section className="surface progress-panel" aria-labelledby="progress-title">
        <div className="panel-topline"><span><span className="panel-symbol"><CircleDot size={15} /></span> SEGUIMIENTO GENERAL</span><span className="panel-index">01 / PANORAMA</span></div>
        <div className="progress-heading"><div><h2 id="progress-title">Avance de preapertura</h2><p>El estado actual de tus tareas, en un solo lugar.</p></div><span className="outline-pill">Todas las marcas</span></div>
        <div className="progress-visual">
          <div className="progress-figure"><strong>{metrics.percent}<span>%</span></strong><p>de avance general</p><small>{metrics.done} de {metrics.applicable} tareas aplicables completadas</small><TextLink onClick={() => onNavigate('checklist')}>Ver checklist</TextLink></div>
          <StatusChart tasks={tareas} onNavigate={onNavigate} />
        </div>
        <div className="progress-summary">{summaryCards.map(card => <button type="button" key={card.label} onClick={card.action}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small><ArrowUpRight size={15} /></button>)}</div>
      </section>

      <section className="upcoming-panel" aria-labelledby="upcoming-title">
        <div className="section-heading"><div><span className="section-kicker">TU HOJA DE RUTA</span><h2 id="upcoming-title">Siguientes pasos</h2><p>Un buen lugar para empezar.</p></div><TextLink onClick={() => onNavigate('checklist')}>Ver todo</TextLink></div>
        {upcoming.length ? <div className="focus-list">{upcoming.map(task => <button type="button" className="focus-item" key={task.id} onClick={() => onOpenTask(task)}>
          <BrandAvatar brand={findBrand(task.marca)} />
          <span className="focus-item-content"><span className="focus-meta">{brandPresentation(findBrand(task.marca)).short} <i>·</i> {task.id}</span><strong>{task.tarea}</strong><small>{task.frente || 'Sin frente'} <i>·</i> {isOverdue(task) ? 'Vencida' : formatDate(task.fecha)}</small></span>
          <span className="focus-item-end"><StatusBadge status={task.estado} /><ArrowUpRight size={15} /></span>
        </button>)}</div> : <div className="focus-empty"><span><Check size={19} /></span><strong>Todo al día</strong><p>No hay tareas pendientes por ahora.</p></div>}
        <div className="upcoming-footer"><span><ClipboardList size={16} /> Cada paso cuenta</span><button type="button" onClick={() => onNavigate('checklist')}>Ir al checklist <ArrowRight size={15} /></button></div>
      </section>

      <section className="surface brands-panel" aria-labelledby="brands-title">
        <div className="section-heading"><div><span className="section-kicker">EL UNIVERSO MONO CROMAT</span><h2 id="brands-title">Tus marcas <span className="count-chip">{brands.length}</span></h2></div><TextLink onClick={() => onNavigate('marcas')}>Ver todas</TextLink></div>
        {brands.length ? <div className="dashboard-brand-grid">{brands.map(brand => <button type="button" className="dashboard-brand" key={brand.id} onClick={() => onNavigate('checklist', { brand: brand.nombre })}>
          <BrandAvatar brand={brand} />
          <span className="dashboard-brand-name"><strong>{brandPresentation(brand).short}</strong><small>{brand.done} de {brand.applicable} tareas</small>{(brand.blocked > 0 || brand.overdue > 0 || brand.missingEvidence > 0) && <small className="brand-attention">{brandAlertLabels(brand).join(' · ')}</small>}</span>
          <span className="dashboard-brand-rate"><strong>{brand.percent}%</strong><ProgressBar value={brand.percent} label={`Avance de ${brand.nombre}`} /></span>
        </button>)}</div> : <p className="empty-inline">Aún no hay marcas registradas.</p>}
      </section>

      <section className="manifesto-panel" aria-labelledby="manifesto-title">
        <div className="manifesto-orbit orbit-a" aria-hidden="true" /><div className="manifesto-orbit orbit-b" aria-hidden="true" /><div className="manifesto-orbit orbit-c" aria-hidden="true" />
        <div className="manifesto-content"><div className="manifesto-kicker"><Sparkles size={15} /> HECHO PARA CREAR</div><h2 id="manifesto-title">Un plan.<br />Muchas ideas<span>.</span></h2><p>Todo gran comienzo se construye paso a paso.</p><button type="button" onClick={() => onNavigate('checklist')}>Ir al checklist <ArrowUpRight size={16} /></button></div>
        <div className="manifesto-signature" aria-hidden="true">MC / 01</div>
      </section>

      <section className="surface overview-risks" aria-labelledby="risks-title">
        <div className="section-heading"><div><span className="section-kicker">MEJOR PREVENIR</span><h2 id="risks-title">Riesgos en seguimiento</h2></div><TextLink onClick={() => onNavigate('riesgos')}>Ver riesgos</TextLink></div>
        <div className="risk-overview"><strong>{metrics.openRisks}</strong><span>{metrics.openRisks === 1 ? 'riesgo abierto' : 'riesgos abiertos'}<small>para dar seguimiento</small></span></div>
        <div className="risk-distribution" role="img" aria-label={riskCounts.map(item => `${item.count} ${riskLabels[item.status].toLowerCase()}`).join(', ')}>{riskCounts.map((item, index) => <span key={item.status} className={`risk-segment segment-${index}`} style={{ width: `${riesgos.length ? item.count / riesgos.length * 100 : 0}%` }} />)}</div>
        <div className="risk-overview-stats">{riskCounts.map((item, index) => <button type="button" key={item.status} onClick={() => onNavigate('riesgos', { status: item.status })}><span><i className={`risk-legend legend-${index}`} />{riskLabels[item.status]}</span><strong>{item.count}</strong></button>)}</div>
        <div className="review-note"><Lightbulb size={16} /><p>El avance no autoriza automáticamente la apertura. Revisa prototipos, números, permisos y capacidad.</p></div>
      </section>
    </div>
  </>
}
