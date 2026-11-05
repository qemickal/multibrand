export const TASK_STATUSES = ['Pendiente', 'En curso', 'En revisión', 'Bloqueado', 'Hecho', 'No aplica']
export const RISK_STATUSES = ['Abierto', 'Mitigado', 'Cerrado']
export const PRIORITIES = ['Alta', 'Media', 'Baja']

const BRAND_ORDER = ['MCC', 'SIM', 'EST', 'CRN', 'ICO', 'PER']
const BRAND_PRESENTATION = {
  MCC: { initials: 'MC', color: 'blue', short: 'Mono Cromat' },
  SIM: { initials: 'S', color: 'purple', short: 'Simbol & Co.' },
  EST: { initials: 'E', color: 'orange', short: 'Estat & Co.' },
  CRN: { initials: 'C', color: 'green', short: 'Cron & Co.' },
  ICO: { initials: 'I', color: 'pink', short: 'Icon & Co.' },
  PER: { initials: 'P', color: 'yellow', short: 'Perifer & Co.' },
}

export function brandPresentation(brand) {
  const known = BRAND_PRESENTATION[brand?.id]
  if (known) return { ...known, short: brand?.nombre === 'Mono Cromat & Co.' ? 'Mono Cromat' : brand?.nombre || known.short }
  return {
    initials: (brand?.nombre || '?').split(' ').filter(Boolean).map(word => word[0]).slice(0, 2).join('').toUpperCase(),
    color: 'blue',
    short: brand?.nombre || 'Sin marca',
  }
}

export function sortBrands(brands) {
  return [...brands].sort((a, b) => {
    const aIndex = BRAND_ORDER.indexOf(a.id)
    const bIndex = BRAND_ORDER.indexOf(b.id)
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex) || (a.nombre || '').localeCompare(b.nombre || '', 'es')
  })
}

export function todayLocal(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(value) {
  if (!value) return 'Sin fecha'
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day)).replace('.', '')
}

export function isClosed(task) {
  return task.estado === 'Hecho' || task.estado === 'No aplica'
}

export function isOverdue(task, today = todayLocal()) {
  return Boolean(task.fecha && task.fecha < today && !isClosed(task))
}

export function progress(tasks) {
  const applicable = tasks.filter(task => task.estado !== 'No aplica').length
  const done = tasks.filter(task => task.estado === 'Hecho').length
  return { done, applicable, percent: applicable ? Math.round((done / applicable) * 100) : 0 }
}

// Keep zero-count states visible, in the same order as their filters.
export function statusCounts(rows, statuses) {
  const counts = new Map(statuses.map(status => [status, 0]))
  for (const row of rows) {
    if (counts.has(row.estado)) counts.set(row.estado, counts.get(row.estado) + 1)
  }
  return statuses.map(status => ({ status, count: counts.get(status) }))
}

export function workspaceMetrics(tasks, risks, today = todayLocal()) {
  return {
    total: tasks.length,
    ...progress(tasks),
    inProgress: tasks.filter(task => task.estado === 'En curso').length,
    blocked: tasks.filter(task => task.estado === 'Bloqueado').length,
    overdue: tasks.filter(task => isOverdue(task, today)).length,
    missingEvidence: tasks.filter(task => task.estado === 'Hecho' && !String(task.evidencia || '').trim()).length,
    openRisks: risks.filter(risk => risk.estado === 'Abierto').length,
  }
}

export function brandStats(brands, tasks, today = todayLocal()) {
  return sortBrands(brands).map(brand => {
    const brandTasks = tasks.filter(task => task.marca === brand.nombre)
    return {
      ...brand,
      ...progress(brandTasks),
      total: brandTasks.length,
      blocked: brandTasks.filter(task => task.estado === 'Bloqueado').length,
      overdue: brandTasks.filter(task => isOverdue(task, today)).length,
      missingEvidence: brandTasks.filter(task => task.estado === 'Hecho' && !String(task.evidencia || '').trim()).length,
    }
  })
}

export function brandAlertLabels(brand) {
  const labels = []
  if (brand.blocked) labels.push(`${brand.blocked} bloqueada${brand.blocked === 1 ? '' : 's'}`)
  if (brand.overdue) labels.push(`${brand.overdue} vencida${brand.overdue === 1 ? '' : 's'}`)
  if (brand.missingEvidence) labels.push(`${brand.missingEvidence} sin evidencia`)
  return labels
}

export function focusTasks(tasks, today = todayLocal()) {
  const priority = { Alta: 0, Media: 1, Baja: 2 }
  return tasks.map((task, index) => ({ task, index }))
    .filter(({ task }) => !isClosed(task))
    .sort((a, b) => {
      const aOverdue = isOverdue(a.task, today) ? 0 : 1
      const bOverdue = isOverdue(b.task, today) ? 0 : 1
      return aOverdue - bOverdue
        || Number(b.task.estado === 'Bloqueado') - Number(a.task.estado === 'Bloqueado')
        || (a.task.fecha || '9999-99-99').localeCompare(b.task.fecha || '9999-99-99')
        || (priority[a.task.prioridad] ?? 3) - (priority[b.task.prioridad] ?? 3)
        || a.index - b.index
    })
    .map(({ task }) => task)
}

export function filterTasks(tasks, filters) {
  const query = (filters.search || '').trim().toLocaleLowerCase('es')
  return tasks.filter(task => {
    const text = [task.id, task.tarea, task.frente, task.marca, task.responsable].join(' ').toLocaleLowerCase('es')
    return (!filters.brand || task.marca === filters.brand)
      && (!filters.status || task.estado === filters.status)
      && (!filters.priority || task.prioridad === filters.priority)
      && (!filters.attention || (filters.attention === 'overdue' ? isOverdue(task) : filters.attention === 'evidence' && task.estado === 'Hecho' && !String(task.evidencia || '').trim()))
      && (!query || text.includes(query))
  })
}

export function validateTask(task) {
  if (!String(task.tarea || '').trim()) return 'Escribe el nombre de la tarea.'
  if (!String(task.marca || '').trim()) return 'Selecciona una marca.'
  if (!TASK_STATUSES.includes(task.estado)) return 'Selecciona un estado válido.'
  if (task.estado === 'Hecho' && !String(task.evidencia || '').trim()) return 'Para marcar una tarea como hecha, agrega una evidencia o enlace.'
  if (task.estado === 'No aplica' && !String(task.notas || '').trim()) return 'Explica en las notas por qué esta tarea no aplica.'
  return ''
}

export function validateRisk(risk) {
  if (!String(risk.riesgo || '').trim()) return 'Describe el riesgo.'
  if (!String(risk.area || '').trim()) return 'Escribe el área del riesgo.'
  if (!RISK_STATUSES.includes(risk.estado)) return 'Selecciona un estado válido.'
  return ''
}

export function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${random.toUpperCase()}`
}
