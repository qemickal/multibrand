import { ArrowRight, Pencil, Sparkles } from 'lucide-react'
import { brandAlertLabels, brandPresentation, brandStats } from '../lib/workspace.js'
import { BrandAvatar, DataNotice, EmptyState, PageHeader, ProgressBar } from './common.jsx'

export default function Brands({ data, local, online, onNavigate, onEditBrand }) {
  const brands = brandStats(data.marcas, data.tareas)
  return <>
    <PageHeader eyebrow="UN UNIVERSO DE IDEAS" title="Tus marcas" description="Cada marca tiene su esencia y su propio camino hacia la apertura." />
    <DataNotice local={local} online={online} />
    <div className="brands-intro"><div><span className="brands-intro-icon"><Sparkles size={19} /></span><div><strong>Una visión, diferentes historias.</strong><p>Explora el progreso y los detalles de cada una de tus marcas.</p></div></div><span className="brands-count">{brands.length} {brands.length === 1 ? 'MARCA' : 'MARCAS'} EN TU ESPACIO</span></div>
    {brands.length ? <div className="brand-cards">{brands.map(brand => {
      const presentation = brandPresentation(brand)
      return <article className="brand-card surface" key={brand.id}>
        <div className="brand-card-header"><BrandAvatar brand={brand} size="large" /><button type="button" className="icon-button edit-brand" onClick={() => onEditBrand(brand)} aria-label={`Editar información de ${brand.nombre}`} title="Editar información"><Pencil size={16} /></button></div>
        <div className="brand-card-name"><div className="brand-card-id">{brand.id === 'MCC' ? 'CASA MATRIZ' : 'MARCA'} <span>·</span> {brand.id}</div><h2>{presentation.short}</h2><p>{brand.rol || 'Sin rol definido'}</p></div>
        <div className="brand-market"><span>DIRIGIDA A</span><p>{brand.mercado || 'Aún por definir'}</p></div>
        <div className="brand-card-progress"><div><span>Avance de preparación</span><strong>{brand.percent}%</strong></div><ProgressBar value={brand.percent} label={`Avance de ${brand.nombre}`} /><small>{brand.done} de {brand.applicable} tareas aplicables completadas</small>{(brand.blocked > 0 || brand.overdue > 0 || brand.missingEvidence > 0) && <small className="brand-attention">{brandAlertLabels(brand).join(' · ')}</small>}</div>
        <button type="button" className="brand-card-link" onClick={() => onNavigate('checklist', { brand: brand.nombre })}>Ver checklist <ArrowRight size={16} /></button>
      </article>
    })}</div> : <div className="surface"><EmptyState title="Aún no tienes marcas" description="Cuando existan marcas en tu espacio, aparecerán aquí." /></div>}
    <div className="list-footnote"><span>✳</span> Cada marca se evalúa por sí misma; un avance alto no sustituye una revisión de apertura.</div>
  </>
}
