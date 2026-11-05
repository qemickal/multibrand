import test from 'node:test'
import assert from 'node:assert/strict'
import { readStoredWorkspace, writeStoredWorkspace } from '../src/lib/storage.js'

function fakeStorage(initial) {
  let value = initial
  return { getItem: () => value, setItem: (_key, next) => { value = next }, get value() { return value } }
}
const seed = { marcas: [{ id: 'A' }], tareas: [], riesgos: [] }

test('inicia con una copia de los datos y guarda cambios en el navegador', () => {
  const storage = fakeStorage(null)
  const data = readStoredWorkspace(storage, 'workspace', seed)
  data.marcas[0].id = 'B'
  assert.equal(seed.marcas[0].id, 'A')
  writeStoredWorkspace(storage, 'workspace', data)
  assert.equal(readStoredWorkspace(storage, 'workspace', seed).marcas[0].id, 'B')
})

test('no reemplaza datos locales corruptos ni incompletos', () => {
  for (const raw of ['{', JSON.stringify({ marcas: [], tareas: [] })]) {
    const storage = fakeStorage(raw)
    assert.throws(() => readStoredWorkspace(storage, 'workspace', seed), /No se modificaron tus datos/)
    assert.equal(storage.value, raw)
  }
})

test('si falla el almacenamiento, propaga el error en vez de aparentar que guardó', () => {
  const storage = { setItem() { throw new Error('Sin espacio') } }
  assert.throws(() => writeStoredWorkspace(storage, 'workspace', seed), /Sin espacio/)
})
