import { ChevronDown, ChevronLeft, ChevronRight, Filter, Search, SlidersHorizontal, UserRound } from 'lucide-react'
import { brandPresentation, filterTasks, formatDate, isOverdue, PRIORITIES, sortBrands, TASK_STATUSES } from '../lib/workspace.js'
import { BrandAvatar, DataNotice, EmptyState, PageHeader, StatusBadge } from './common.jsx'
import { useEffect, useState } from 'react'

const PAGE_SIZE = 10

export default function Checklist({ data, local, online, filters, onFiltersChange, onOpenTask, onNewTask }) {
  const [page, setPage] = useState(1)
  const results = filterTasks(data.tareas, filters)
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const findBrand = name => data.marcas.find(brand => brand.nombre === name)
  const hasFilters = filters.search || filters.brand || filters.status || filters.priority || filters.attention
  const change = (key, value) => onFiltersChange({ ...filters, [key]: value })
  const clear = () => onFiltersChange({ search: '', brand: '', status: '', priority: '', attention: '' })

  useEffect(() => setPage(1), [filters.search, filters.brand, filters.status, filters.priority, filters.attention])

  return <>
    <PageHeader eyebrow="MANOS A LA OBRA" title="Checklist" description="Todas las tareas para convertir tus ideas en realidad." action={<button type="button" className="primary-button" onClick={onNewTask}><span>+</span> Nueva tarea</button>} />
    <DataNotice local={local} online={online} />
    <section className="surface list-surface" aria-label="Lista de tareas">
      <div className="list-intro"><div><div className="section-title-line"><h2>Todas las tareas</h2><span className="count-chip">{results.length}</span></div><p>Haz clic en una tarea para ver sus detalles y actualizarla.</p></div><div className="list-hint"><SlidersHorizontal size={16} /> ORGANIZA A TU MANERA</div></div>
      <div className="filters">
        <label className="search-control"><Search size={18} /><span className="sr-only">Buscar tareas</span><input type="search" placeholder="Buscar tarea, marca o responsable..." value={filters.search} onChange={event => change('search', event.target.value)} /></label>
        <label className="select-control"><span className="sr-only">Filtrar por marca</span><select value={filters.brand} onChange={event => change('brand', event.target.value)}><option value="">Marca: todas</option>{sortBrands(data.marcas).map(brand => <option key={brand.id} value={brand.nombre}>{brand.nombre}</option>)}</select><ChevronDown size={15} /></label>
        <label className="select-control"><span className="sr-only">Filtrar por estado</span><select value={filters.status} onChange={event => change('status', event.target.value)}><option value="">Estado: todos</option>{TASK_STATUSES.map(status => <option key={status}>{status}</option>)}</select><ChevronDown size={15} /></label>
        <label className="select-control priority-filter"><span className="sr-only">Filtrar por prioridad</span><select value={filters.priority} onChange={event => change('priority', event.target.value)}><option value="">Prioridad</option>{PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select><ChevronDown size={15} /></label>
        <label className="select-control attention-filter"><span className="sr-only">Filtrar por atención</span><select value={filters.attention || ''} onChange={event => change('attention', event.target.value)}><option value="">Atención</option><option value="overdue">Vencidas</option><option value="evidence">Hechas sin evidencia</option></select><ChevronDown size={15} /></label>
      </div>
      <div className="results-caption"><span><Filter size={14} /> {results.length} {results.length === 1 ? 'tarea encontrada' : 'tareas encontradas'}</span>{hasFilters && <button type="button" onClick={clear}>Limpiar filtros</button>}</div>
      {visible.length ? <>
        <div className="task-table-head" aria-hidden="true"><span>TAREA</span><span>MARCA</span><span>ESTADO</span><span>RESPONSABLE</span><span>FECHA</span><span /></div>
        <div className="task-table">{visible.map(task => {
          const brand = findBrand(task.marca)
          return <button type="button" className="task-row" key={task.id} onClick={() => onOpenTask(task)}>
            <span className="task-primary"><span className={`task-row-icon ${task.estado === 'Hecho' ? 'task-row-icon-done' : ''}`}>{task.estado === 'Hecho' ? '✓' : ''}</span><span className="task-text"><strong>{task.tarea}</strong><small>{task.id} <i>·</i> {task.frente || 'Sin frente'}</small></span></span>
            <span className="task-brand"><BrandAvatar brand={brand || { nombre: task.marca }} size="small" /><span>{brand ? brandPresentation(brand).short : task.marca}</span></span>
            <span className="task-status"><StatusBadge status={task.estado} /></span>
            <span className="task-owner"><UserRound size={14} />{task.responsable || 'Sin asignar'}</span>
            <span className={`task-date ${isOverdue(task) ? 'overdue' : ''}`}>{formatDate(task.fecha)}</span>
            <ChevronRight size={17} className="task-chevron" />
          </button>
        })}</div>
        <div className="pagination"><span>Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, results.length)} de {results.length}</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior"><ChevronLeft size={17} /></button><span>Página {currentPage} de {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} aria-label="Página siguiente"><ChevronRight size={17} /></button></div></div>
      </> : <EmptyState title="No encontramos tareas" description={hasFilters ? 'Prueba con otra búsqueda o cambia los filtros.' : 'Agrega una tarea para comenzar a organizar tu trabajo.'} action={hasFilters ? <button type="button" className="secondary-button" onClick={clear}>Limpiar filtros</button> : <button type="button" className="secondary-button" onClick={onNewTask}>Crear una tarea</button>} />}
    </section>
    <div className="list-footnote"><span>✳</span> Las tareas marcadas como “No aplica” no se incluyen en el cálculo de avance.</div>
  </>
}
