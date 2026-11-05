import test from 'node:test'
import assert from 'node:assert/strict'
import { brandStats, filterTasks, focusTasks, isOverdue, progress, RISK_STATUSES, statusCounts, TASK_STATUSES, validateRisk, validateTask, workspaceMetrics } from '../src/lib/workspace.js'

const task = (overrides = {}) => ({ id: 'T-1', tarea: 'Hacer algo', marca: 'Una marca', estado: 'Pendiente', prioridad: 'Alta', ...overrides })

test('el avance excluye las tareas que no aplican sin contarlas como hechas', () => {
  assert.deepEqual(progress([task({ estado: 'Hecho' }), task(), task({ estado: 'No aplica' })]), { done: 1, applicable: 2, percent: 50 })
  assert.deepEqual(progress([task({ estado: 'No aplica' })]), { done: 0, applicable: 0, percent: 0 })
})

test('no permite cerrar sin evidencia ni descartar sin explicación', () => {
  assert.match(validateTask(task({ estado: 'Hecho', evidencia: '  ' })), /evidencia/i)
  assert.equal(validateTask(task({ estado: 'Hecho', evidencia: 'https://ejemplo.test' })), '')
  assert.match(validateTask(task({ estado: 'No aplica', notas: '' })), /notas/i)
  assert.equal(validateTask(task({ estado: 'No aplica', notas: 'No corresponde' })), '')
})

test('las tareas cerradas no se consideran vencidas y la fecha de hoy aún no vence', () => {
  assert.equal(isOverdue(task({ fecha: '2026-11-04' }), '2026-11-05'), true)
  assert.equal(isOverdue(task({ fecha: '2026-11-05' }), '2026-11-05'), false)
  assert.equal(isOverdue(task({ fecha: '2026-11-04', estado: 'No aplica' }), '2026-11-05'), false)
})

test('el resumen usa solo los datos reales y detecta evidencia faltante', () => {
  const tasks = [task({ estado: 'Hecho', evidencia: '' }), task({ estado: 'Bloqueado', fecha: '2026-11-04' })]
  const metrics = workspaceMetrics(tasks, [{ estado: 'Abierto' }, { estado: 'Cerrado' }], '2026-11-05')
  assert.equal(metrics.percent, 50)
  assert.equal(metrics.missingEvidence, 1)
  assert.equal(metrics.blocked, 1)
  assert.equal(metrics.overdue, 1)
  assert.equal(metrics.openRisks, 1)
  const brands = brandStats([{ id: 'A', nombre: 'Una marca' }], tasks, '2026-11-05')
  assert.equal(brands[0].total, 2)
})

test('los filtros combinan búsqueda, marca y estado', () => {
  const tasks = [task({ tarea: 'Crear guía', frente: 'Identidad' }), task({ tarea: 'Aprobar guía', estado: 'En curso' })]
  assert.equal(filterTasks(tasks, { search: 'GUÍA', brand: 'Una marca', status: 'En curso' }).length, 1)
  assert.equal(filterTasks(tasks, { search: 'identidad', status: 'En curso' }).length, 0)
})

test('siguientes pasos prioriza vencidas y omite las cerradas', () => {
  const tasks = [task({ id: 'sin fecha' }), task({ id: 'vencida', fecha: '2026-01-01' }), task({ id: 'hecha', estado: 'Hecho' })]
  assert.deepEqual(focusTasks(tasks, '2026-11-05').map(item => item.id), ['vencida', 'sin fecha'])
})

test('un riesgo requiere área y descripción', () => {
  assert.match(validateRisk({ area: '', riesgo: 'Algo', estado: 'Abierto' }), /área/i)
  assert.equal(validateRisk({ area: 'Calidad', riesgo: 'Algo', estado: 'Abierto' }), '')
})

test('los datos iniciales locales están alineados con el seed de Supabase', async () => {
  const { readFile } = await import('node:fs/promises')
  const [sql, json] = await Promise.all([
    readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/demo-data.json', import.meta.url), 'utf8'),
  ])
  const seed = JSON.parse(json)
  for (const table of ['marcas', 'tareas', 'riesgos']) {
    const ids = [...sql.matchAll(new RegExp(`insert into ${table}\\([^\\n]*?values\\('([^']+)'`, 'g'))].map(match => match[1])
    assert.deepEqual(seed[table].map(row => row.id), ids, `Los IDs de ${table} no coinciden con el seed`)
  }
  assert.ok(seed.tareas.every(item => item.estado === 'Pendiente' && item.evidencia === ''))
  assert.ok(seed.riesgos.every(item => item.estado === 'Abierto'))
})

test('los filtros de atención encuentran tareas vencidas y cierres sin evidencia', () => {
  const past = '2000-01-01'
  const tasks = [task({ id: 'vencida', fecha: past }), task({ id: 'sin evidencia', estado: 'Hecho', evidencia: '' }), task({ id: 'con evidencia', estado: 'Hecho', evidencia: 'Foto' })]
  assert.deepEqual(filterTasks(tasks, { attention: 'overdue' }).map(item => item.id), ['vencida'])
  assert.deepEqual(filterTasks(tasks, { attention: 'evidence' }).map(item => item.id), ['sin evidencia'])
})

test('la distribución muestra todos los estados en orden, incluso cuando no hay registros', () => {
  assert.deepEqual(statusCounts([], TASK_STATUSES), TASK_STATUSES.map(status => ({ status, count: 0 })))
  const tasks = [task(), task({ estado: 'Hecho' }), task({ estado: 'Hecho' }), task({ estado: 'No aplica' })]
  assert.deepEqual(statusCounts(tasks, TASK_STATUSES).map(item => item.count), [1, 0, 0, 0, 2, 1])
  assert.deepEqual(statusCounts([{ estado: 'Abierto' }, { estado: 'Cerrado' }], RISK_STATUSES).map(item => item.count), [1, 0, 1])
})
