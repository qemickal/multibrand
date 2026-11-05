import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Boxes, Calculator, ChartNoAxesCombined, ClipboardCheck, Factory, FileText, ListChecks, Package, Plus, Search, Store, Truck, Wallet } from 'lucide-react'
import workbookData from '../lib/workbook-data.json' with { type: 'json' }
import { MODULE_BY_ID, MODULES } from '../lib/modules.js'
import { calculateReading, calculateWeightedScore } from '../lib/priorizacion.js'
import { formatVariableCost } from '../lib/costeo.js'
import { sortBrands } from '../lib/workspace.js'
import { DataNotice, EmptyState, PageHeader } from './common.jsx'

const ICONS = { matriz: Factory, productos: Package, costeo: Calculator, gastos: Wallet, proveedores: Truck, operacion: ListChecks, decisiones: FileText, priorizacion: ChartNoAxesCombined, equilibrio: ClipboardCheck }

function Guide({ onBack }) {
  const sections = [
    ['Cómo usar el sistema', workbookData.guia.instrucciones],
    ['Reglas de control', workbookData.guia.reglas],
    ['Estados del checklist', workbookData.guia.estados],
  ]
  return <>
    <button type="button" className="area-back" onClick={onBack}><ArrowLeft size={15} /> Todas las áreas</button>
    <PageHeader eyebrow="GUÍA DE PREAPERTURA" title="Cómo usar el sistema" description="Las instrucciones y reglas de control recuperadas de la hoja INICIO." />
    <div className="guide-sections">{sections.map(([title, entries]) => <section className="surface guide-section" key={title}>
      <h2>{title}</h2><div>{entries.map(entry => <article className="guide-entry" key={entry.titulo}><strong>{entry.titulo}</strong><p>{entry.detalle}</p></article>)}</div>
    </section>)}</div>
  </>
}

function AreaCard({ id, title, description, count, icon: Icon, onSelect, index }) {
  return <button type="button" className="area-card surface" onClick={() => onSelect(id)}>
    <span className={`area-icon area-tone-${index % 4}`}><Icon size={20} /></span>
    <span className="area-card-copy"><strong>{title}</strong><small>{description}</small><em>{count}</em></span>
    <ArrowRight size={17} className="area-arrow" />
  </button>
}

function FormulaNotice({ module }) {
  const message = module.id === 'costeo'
    ? <><strong>Cálculos de costeo automatizados.</strong> El costo variable, los precios, la contribución y el margen real usan las fórmulas compartidas. No publiques precios sin validar los datos.</>
    : module.id === 'gastos'
      ? <><strong>Equivalente mensual automatizado.</strong> Cada gasto usa la fórmula compartida; si la periodicidad no coincide, el resultado es 0. El panel suma hasta 100 gastos y avisa si se supera ese límite.</>
      : module.id === 'priorizacion'
        ? <><strong>Puntaje y lectura automatizados.</strong> El puntaje y la lectura usan las fórmulas compartidas de priorización.</>
        : <><strong>Resultados manuales, sin cálculo automático.</strong> La copia HTML no incluyó las fórmulas originales. Los campos señalados como «manual» no se recalculan; revísalos cada vez que cambies los datos.</>
  return <div className="data-notice warning formula-notice" role="note"><Calculator size={17} /><span>{message}</span></div>
}

function Criteria() {
  return <section className="surface criteria-panel" aria-labelledby="criteria-title">
    <h2 id="criteria-title">Criterios y pesos de la hoja</h2><p>Evalúa del 1 al 5 con evidencia; 1 es muy débil y 5 es muy sólido.</p>
    <div className="criteria-grid">{workbookData.criterios.map(item => <article key={item.criterio}><div><strong>{item.criterio}</strong><b>{item.peso}</b></div><p>{item.detalle}</p></article>)}</div>
  </section>
}

function RecordList({ module, records, onOpenRecord }) {
  if (!records.length) return <EmptyState title="Aún no hay registros" description={module.fixed ? 'Estas fichas iniciales aparecen al importar los datos de la hoja. Si usas Supabase, revisa las instrucciones de instalación.' : 'Agrega el primero cuando tengas información para capturar.'} />
  return <div className="record-list">{records.map(record => {
    const values = record.campos || {}
    const title = values[module.titleField] || 'Sin título'
    const score = module.id === 'priorizacion' ? calculateWeightedScore(values) : null
    const reading = module.id === 'priorizacion' ? calculateReading(values, score) : null
    return <button type="button" className="record-row" key={record.id} onClick={() => onOpenRecord(module.id, record)}>
      <span className="record-row-icon"><Store size={17} /></span>
      <span className="record-row-content"><strong>{title}</strong><span className="record-metadata">{module.summary.map(key => {
        let value
        if (score && key === 'puntaje_ponderado') value = score.error ? 'No disponible' : formatVariableCost(score.value)
        else if (reading && key === 'lectura') value = reading.error ? 'No disponible' : reading.value
        else value = values[key]
        const field = module.fields.find(item => item.key === key)
        return value !== undefined && value !== null && String(value).trim() ? <span key={key}>{field?.label}: <b>{value}</b></span> : null
      })}</span>{module.id === 'priorizacion' && values.riesgo_critico === 'Sí' && <span className="critical-risk">Riesgo crítico abierto: no recomendar lanzamiento</span>}</span>
      <ArrowRight size={16} className="record-arrow" />
    </button>
  })}</div>
}

function ModulePage({ module, records, onBack, onOpenRecord, local, online, schemaReady }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    if (!query) return records
    return records.filter(record => {
      const values = record.campos || {}
      if (module.id !== 'priorizacion') return Object.values(values).some(value => String(value ?? '').toLocaleLowerCase('es').includes(query))
      const score = calculateWeightedScore(values)
      const reading = calculateReading(values, score)
      const searchable = { ...values, puntaje_ponderado: score.error ? 'No disponible' : formatVariableCost(score.value), lectura: reading.error ? 'No disponible' : reading.value }
      return Object.values(searchable).some(value => String(value ?? '').toLocaleLowerCase('es').includes(query))
    })
  }, [records, search, module.id])
  return <>
    <button type="button" className="area-back" onClick={onBack}><ArrowLeft size={15} /> Todas las áreas</button>
    <PageHeader eyebrow={module.eyebrow} title={module.title} description={module.description} action={!module.fixed && schemaReady ? <button type="button" className="primary-button" onClick={() => onOpenRecord(module.id)}><Plus size={17} /> Agregar {module.singular}</button> : null} />
    <DataNotice local={local} online={online} />
    {!schemaReady && <div className="data-notice warning" role="status"><Boxes size={17} /><span><strong>Falta actualizar Supabase.</strong> Para usar esta área, ejecuta el esquema y el archivo de datos de la hoja indicados en el README. Tus datos anteriores siguen disponibles.</span></div>}
    {module.formulaNotice && <FormulaNotice module={module} />}
    <div className="module-context"><span>✳</span><p>{module.note}</p></div>
    {module.id === 'priorizacion' && <Criteria />}
    {schemaReady && <section className="surface module-list" aria-label={`Registros de ${module.title}`}>
      <div className="module-list-top"><div><strong>{records.length} {records.length === 1 ? 'registro' : 'registros'}</strong><p>Abre una ficha para ver o editar todos sus campos.</p></div><label className="search-control module-search"><Search size={16} /><span className="sr-only">Buscar en {module.title}</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar..." /></label></div>
      {records.length > 0 && filtered.length === 0 ? <EmptyState title="Sin resultados" description="Intenta con otra búsqueda." /> : <RecordList module={module} records={filtered} onOpenRecord={onOpenRecord} />}
    </section>}
  </>
}

export default function SystemAreas({ selected, onSelect, data, onOpenRecord, local, online, schemaReady }) {
  if (selected === 'guia') return <Guide onBack={() => onSelect(null)} />
  const module = MODULE_BY_ID[selected]
  if (module) {
    const records = (data.registros || []).filter(record => record.modulo === module.id)
    if (module.fixed) {
      const brandOrder = new Map(sortBrands(data.marcas).map((brand, index) => [brand.nombre, index]))
      records.sort((a, b) => (brandOrder.get(a.campos?.marca) ?? 999) - (brandOrder.get(b.campos?.marca) ?? 999))
    }
    return <ModulePage key={module.id} module={module} records={records} onBack={() => onSelect(null)} onOpenRecord={onOpenRecord} local={local} online={online} schemaReady={schemaReady} />
  }
  return <>
    <PageHeader eyebrow="SISTEMA DE PREAPERTURA" title="Áreas de trabajo" description="Cada parte de tu preapertura, organizada en un mismo lugar." />
    <DataNotice local={local} online={online} />
    {!schemaReady && <div className="data-notice warning" role="status"><Boxes size={17} /><span><strong>Falta actualizar Supabase.</strong> Las áreas nuevas se habilitan al ejecutar el esquema y los datos de la hoja indicados en el README; el panel, las marcas, el checklist y los riesgos siguen disponibles.</span></div>}
    <div className="area-intro"><div><span className="area-intro-icon"><Boxes size={19} /></span><div><strong>Un espacio para cada idea.</strong><p>Elige un área para consultar o completar sus fichas.</p></div></div><span>EXTRAÍDAS DE LAS HOJAS</span></div>
    <div className="area-grid">
      {MODULES.map((item, index) => <AreaCard key={item.id} id={item.id} title={item.title} description={item.description} icon={ICONS[item.icon]} index={index} count={schemaReady ? `${(data.registros || []).filter(record => record.modulo === item.id).length} registros` : 'Requiere actualización'} onSelect={onSelect} />)}
      <AreaCard id="guia" title="Guía de uso" description="Instrucciones, reglas de control y estados de la hoja de inicio." icon={BookOpen} index={9} count="LECTURA" onSelect={onSelect} />
    </div>
  </>
}
