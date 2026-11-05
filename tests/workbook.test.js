import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hydrateWorkbookData, readLocalData, writeLocalData } from '../src/lib/local-data.js'
import { MODULE_BY_ID, MODULES, validateModuleFields } from '../src/lib/modules.js'
import workbook from '../src/lib/workbook-data.json' with { type: 'json' }

function storageWith(raw) {
  let saved = raw
  return { getItem: () => saved, setItem: (_key, value) => { saved = value }, get value() { return saved } }
}

test('la copia de las hojas incluye datos iniciales y no inventa registros vacíos', () => {
  assert.equal(Object.keys(workbook.marcas).length, 6)
  assert.equal(Object.keys(workbook.alcanceTareas).length, 139)
  assert.equal(workbook.registros.filter(row => row.modulo === 'matriz').length, 17)
  assert.equal(workbook.registros.filter(row => row.modulo === 'operacion').length, 10)
  assert.equal(workbook.registros.filter(row => row.modulo === 'priorizacion').length, 6)
  assert.equal(workbook.registros.filter(row => row.modulo === 'equilibrio').length, 6)
  assert.equal(workbook.registros.filter(row => ['productos', 'costeo', 'gastos', 'proveedores', 'decisiones'].includes(row.modulo)).length, 0)
  assert.equal(workbook.guia.reglas.length, 6)
  assert.equal(workbook.criterios.map(item => Number.parseInt(item.peso, 10)).reduce((a, b) => a + b, 0), 100)
})

test('la migración local conserva ediciones previas y no escribe hasta que el usuario guarde', () => {
  const old = {
    marcas: [{ id: 'MCC', nombre: 'Mono Cromat & Co.', rol: 'Mi rol editado', estado: 'Mi estado' }],
    tareas: [{ id: 'MAT-001', tarea: 'Mi tarea editada', alcance: 'Mi alcance', estado: 'En curso' }],
    riesgos: [{ id: 'R-001', notas: 'Mi nota', riesgo: 'Mi riesgo' }],
  }
  const raw = JSON.stringify(old)
  const storage = storageWith(raw)
  const upgraded = readLocalData(storage)
  assert.equal(storage.value, raw)
  assert.equal(upgraded.marcas[0].rol, 'Mi rol editado')
  assert.equal(upgraded.marcas[0].estado, 'Mi estado')
  assert.match(upgraded.marcas[0].modelo_negocio, /B2B/)
  assert.equal(upgraded.tareas[0].alcance, 'Mi alcance')
  assert.equal(upgraded.tareas[0].estado, 'En curso')
  assert.equal(upgraded.riesgos[0].notas, 'Mi nota')
  assert.equal(upgraded.registros.length, 39)
  upgraded.registros = []
  writeLocalData(upgraded, storage)
  assert.deepEqual(readLocalData(storage).registros, [], 'no deben reaparecer registros borrados')
})

test('la migración rechaza áreas corruptas sin modificar los datos', () => {
  const raw = JSON.stringify({ marcas: [], tareas: [], riesgos: [], registros: [{ id: 'mal' }] })
  const storage = storageWith(raw)
  assert.throws(() => readLocalData(storage), /No se modificaron tus datos/)
  assert.equal(storage.value, raw)
  assert.throws(() => hydrateWorkbookData({ marcas: [], tareas: [], riesgos: [], registros: null }), /No se modificaron tus datos/)
})

test('los campos de todas las hojas se conservan y los resultados sin fórmula son manuales', () => {
  const counts = { matriz: 13, productos: 17, costeo: 24, gastos: 12, proveedores: 15, operacion: 8, decisiones: 12, priorizacion: 10, equilibrio: 8 }
  for (const module of MODULES) assert.equal(module.fields.length, counts[module.id], module.title)
  for (const [id, keys] of Object.entries({
    equilibrio: ['ventas_equilibrio', 'unidades_equilibrio', 'contribucion_prevista'],
  })) for (const key of keys) assert.equal(MODULE_BY_ID[id].fields.find(field => field.key === key)?.manual, true, `${id}.${key}`)
  for (const key of ['costo_variable', 'precio_sugerido', 'precio_con_tasa', 'contribucion_unidad', 'margen_real']) {
    const field = MODULE_BY_ID.costeo.fields.find(field => field.key === key)
    assert.equal(field?.calculated, true)
    assert.equal(field?.readOnly, true)
    assert.notEqual(field?.manual, true)
  }
  const monthly = MODULE_BY_ID.gastos.fields.find(field => field.key === 'mensual')
  assert.equal(monthly?.calculated, true)
  assert.equal(monthly?.readOnly, true)
  assert.notEqual(monthly?.manual, true)
  const score = MODULE_BY_ID.priorizacion.fields.find(field => field.key === 'puntaje_ponderado')
  assert.equal(score?.calculated, true)
  assert.equal(score?.readOnly, true)
  assert.notEqual(score?.manual, true)
  const lectura = MODULE_BY_ID.priorizacion.fields.find(field => field.key === 'lectura')
  assert.equal(lectura?.calculated, true)
  assert.equal(lectura?.readOnly, true)
  assert.notEqual(lectura?.manual, true)
})

test('la captura valida porcentajes y escalas sin redondear las entradas', () => {
  const cost = MODULE_BY_ID.costeo
  assert.match(validateModuleFields(cost, { producto_variante: 'Playera', tasa: 'inválida' }), /Tasa/)
  assert.equal(validateModuleFields(cost, { producto_variante: 'Playera', tasa: '101' }), '')
  assert.equal(validateModuleFields(cost, { producto_variante: 'Playera', tasa: '-20' }), '')
  assert.equal(validateModuleFields(cost, { producto_variante: 'Playera', materiales: '-1', merma: '150', comision_canal: '101' }), '')
  assert.equal(validateModuleFields(cost, { producto_variante: 'Playera', materiales: '1.2345', margen_objetivo: '-250' }), '')
  assert.equal(validateModuleFields(MODULE_BY_ID.gastos, { concepto: 'Ajuste', importe: '-25.50' }), '')
  assert.match(validateModuleFields(MODULE_BY_ID.gastos, { concepto: 'Renta', importe: 'no numérico' }), /Importe/)
  assert.equal(validateModuleFields(MODULE_BY_ID.priorizacion, { demanda: '2.5' }), '')
  assert.equal(validateModuleFields(MODULE_BY_ID.priorizacion, { demanda: '5' }), '')
  assert.match(validateModuleFields(MODULE_BY_ID.priorizacion, { demanda: '0' }), /Demanda/)
  assert.match(validateModuleFields(MODULE_BY_ID.priorizacion, { demanda: '5.1' }), /Demanda/)
})

test('el seed SQL y los datos locales contienen los mismos registros adicionales', async () => {
  const sql = await readFile(new URL('../supabase/workbook-seed.sql', import.meta.url), 'utf8')
  const ids = [...sql.matchAll(/insert into registros_preapertura\(id,modulo,campos\) values\('([^']+)'/g)].map(match => match[1])
  assert.deepEqual(ids, workbook.registros.map(row => row.id))
  assert.match(sql, /on conflict \(id\) do nothing/)
  assert.match(sql, /coalesce\(modelo_negocio/)
})
