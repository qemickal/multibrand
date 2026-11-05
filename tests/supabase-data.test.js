import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchAll } from '../src/lib/supabase-data.js'

function mockClient(respond) {
  return { from: table => ({ select: (_fields, options) => ({ order: () => ({ range: (from, to) => respond({ table, options, from, to }) }) }) }) }
}

test('recupera todas las filas aunque el servidor tenga un límite de página menor', async () => {
  const records = [{ id: '1' }, { id: '2' }, { id: '3' }]
  const calls = []
  const client = mockClient(({ from, options }) => {
    calls.push(from)
    assert.equal(options.count, 'exact')
    return { data: records.slice(from, from + 1), error: null, count: records.length }
  })
  assert.deepEqual(await fetchAll(client, 'tareas', 1000), records)
  assert.deepEqual(calls, [0, 1, 2])
})

test('señala errores y respuestas incompletas en lugar de mostrar datos parciales', async () => {
  const error = new Error('Sin permiso')
  await assert.rejects(fetchAll(mockClient(() => ({ data: null, error, count: null })), 'tareas'), /Sin permiso/)
  await assert.rejects(fetchAll(mockClient(({ from }) => ({ data: from ? [] : [{ id: '1' }], error: null, count: 2 })), 'tareas'), /todos los registros/)
})

test('sin conteo explícito utiliza el tamaño recibido para detectar la última página', async () => {
  const rows = [{ id: '1' }, { id: '2' }, { id: '3' }]
  const client = mockClient(({ from, to }) => ({ data: rows.slice(from, to + 1), error: null, count: null }))
  assert.deepEqual(await fetchAll(client, 'tareas', 2), rows)
})

test('si falta solo la nueva tabla, conserva disponibles las áreas anteriores', async () => {
  const { fetchWorkbookRecords } = await import('../src/lib/supabase-data.js')
  const missing = mockClient(() => ({ data: null, error: { code: 'PGRST205' }, count: null }))
  assert.deepEqual(await fetchWorkbookRecords(missing), { records: [], ready: false })
  const denied = { code: '42501', message: 'Permiso denegado' }
  await assert.rejects(fetchWorkbookRecords(mockClient(() => ({ data: null, error: denied, count: null }))), error => error === denied)
  const invalid = mockClient(() => ({ data: [{ id: '1', modulo: 'costeo', campos: null }], error: null, count: 1 }))
  await assert.rejects(fetchWorkbookRecords(invalid), /incompletos/)
  const valid = mockClient(() => ({ data: [{ id: '1', modulo: 'costeo', campos: { sku: 'X' } }], error: null, count: 1 }))
  assert.deepEqual(await fetchWorkbookRecords(valid), { records: [{ id: '1', modulo: 'costeo', campos: { sku: 'X' } }], ready: true })
})
