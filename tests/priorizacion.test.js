import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateReading, calculateWeightedScore, preparePrioritizationFields, previousManualReading, previousManualWeightedScore, PRIORITY_WEIGHTS, readingChanged, weightedScoreChanged } from '../src/lib/priorizacion.js'
import { formatVariableCost } from '../src/lib/costeo.js'

test('G13 queda vacío hasta contar las cinco calificaciones numéricas', () => {
  const incomplete = { demanda: '5', economia: '4', operacion: '3', producto: '2' }
  assert.deepEqual(calculateWeightedScore({}), { value: null, error: '' })
  assert.deepEqual(calculateWeightedScore(incomplete), { value: null, error: '' })
  for (const missing of ['', '  ', null, undefined, 'texto', '0x10', true]) {
    assert.equal(calculateWeightedScore({ ...incomplete, diferenciacion: missing }).value, null, String(missing))
  }
  // Numeric zero counts in CONTAR; UI separately enforces its 1–5 scale.
  assert.equal(calculateWeightedScore({ demanda: '0', economia: '0', operacion: '0', producto: '0', diferenciacion: '0' }).value, 0)
})

test('G13 aplica 25 %, 25 %, 20 %, 20 % y 10 % en el orden de la fórmula', () => {
  const fields = { demanda: '5', economia: '4', operacion: '3', producto: '2', diferenciacion: '1' }
  const expected = 5 * 0.25 + 4 * 0.25 + 3 * 0.2 + 2 * 0.2 + 1 * 0.1
  assert.deepEqual(PRIORITY_WEIGHTS.map(([, weight]) => weight), [0.25, 0.25, 0.2, 0.2, 0.1])
  assert.equal(calculateWeightedScore(fields).value, expected)
  assert.equal(formatVariableCost(expected), '3.35')
  assert.equal(calculateWeightedScore({ demanda: 5, economia: 5, operacion: 5, producto: 5, diferenciacion: 5 }).value, 5)
  // Numeric strings are how the app serializes number inputs.
  assert.equal(calculateWeightedScore({ demanda: '1e0', economia: '2.5', operacion: '-1', producto: '2', diferenciacion: '3' }).value, 1 * 0.25 + 2.5 * 0.25 + -1 * 0.2 + 2 * 0.2 + 3 * 0.1)
})

test('G13 guarda la precisión completa y recalcula la lectura I13', () => {
  const fields = { demanda: '1.2345', economia: '2.3456', operacion: '3.4567', producto: '4.5678', diferenciacion: '5.6789', lectura: 'Revisar evidencia', riesgo_critico: '' }
  const score = calculateWeightedScore(fields)
  const expected = 1.2345 * 0.25 + 2.3456 * 0.25 + 3.4567 * 0.2 + 4.5678 * 0.2 + 5.6789 * 0.1
  assert.equal(score.value, expected)
  const saved = preparePrioritizationFields(fields, score)
  assert.equal(saved.puntaje_ponderado, String(expected))
  assert.equal(saved.puntaje_ponderado_origen, 'formula_G13')
  // I13: score ~3.07 => Segunda ronda (since riesgo no es Sí y 3 <= score <4)
  const reading = calculateReading(fields, score)
  assert.equal(reading.value, expected >= 4 ? 'Candidata prioritaria' : expected >= 3 ? 'Segunda ronda' : 'No priorizar todavía')
  assert.equal(saved.lectura, reading.value)
  assert.equal(saved.lectura_origen, 'formula_I13')
  // Lectura anterior distinta se conserva, pero se usa la calculada
  assert.equal(saved.lectura_manual_anterior, 'Revisar evidencia')
  assert.throws(() => preparePrioritizationFields(fields, { value: null, error: 'Error de cálculo' }), /Error de cálculo/)
})

test('I13 sigue la anidación SI(G13="" ... SI(H13="Sí" ... SI(G13>=4 ... SI(G13>=3 ...)))', () => {
  // G vacío
  assert.equal(calculateReading({ riesgo_critico: 'Sí' }, { value: null, error: '' }).value, 'Completar evaluación')
  assert.equal(calculateReading({ riesgo_critico: '' }, { value: null, error: '' }).value, 'Completar evaluación')
  // Riesgo abierto domina sobre puntaje
  assert.equal(calculateReading({ riesgo_critico: 'Sí' }, { value: 5, error: '' }).value, 'No lanzar: riesgo abierto')
  assert.equal(calculateReading({ riesgo_critico: 'Sí' }, { value: 4.5, error: '' }).value, 'No lanzar: riesgo abierto')
  assert.equal(calculateReading({ riesgo_critico: 'Sí' }, { value: 2, error: '' }).value, 'No lanzar: riesgo abierto')
  // Comparación sensible a espacios y mayúsculas, Trim aplicado
  assert.equal(calculateReading({ riesgo_critico: ' Sí ' }, { value: 4, error: '' }).value, 'No lanzar: riesgo abierto')
  assert.equal(calculateReading({ riesgo_critico: 'si' }, { value: 4, error: '' }).value, 'Candidata prioritaria')
  assert.equal(calculateReading({ riesgo_critico: 'NO' }, { value: 4, error: '' }).value, 'Candidata prioritaria')
  assert.equal(calculateReading({ riesgo_critico: '' }, { value: 4, error: '' }).value, 'Candidata prioritaria')
  // Umbrales inclusivos
  assert.equal(calculateReading({}, { value: 4, error: '' }).value, 'Candidata prioritaria')
  assert.equal(calculateReading({}, { value: 4.0001, error: '' }).value, 'Candidata prioritaria')
  assert.equal(calculateReading({}, { value: 3.9999, error: '' }).value, 'Segunda ronda')
  assert.equal(calculateReading({}, { value: 3, error: '' }).value, 'Segunda ronda')
  assert.equal(calculateReading({}, { value: 2.9999, error: '' }).value, 'No priorizar todavía')
  assert.equal(calculateReading({}, { value: 0, error: '' }).value, 'No priorizar todavía')
  assert.equal(calculateReading({}, { value: -1, error: '' }).value, 'No priorizar todavía')
  // Score via CONTAR: incompleto => lectura Completar evaluación aunque riesgo Sí
  assert.equal(calculateReading({ demanda: '5', economia: '4', operacion: '3', producto: '2', diferenciacion: '', riesgo_critico: 'Sí' }).value, 'Completar evaluación')
})

test('G13 conserva el puntaje manual anterior y recalcula a partir de los criterios', () => {
  const old = { demanda: '5', economia: '4', operacion: '3', producto: '2', diferenciacion: '1', puntaje_ponderado: '4.8', lectura: 'Mi lectura', riesgo_critico: 'Sí' }
  const first = preparePrioritizationFields(old)
  assert.equal(first.puntaje_ponderado, String(3.35))
  assert.equal(first.puntaje_ponderado_origen, 'formula_G13')
  assert.equal(first.puntaje_ponderado_manual_anterior, '4.8')
  // I13: con riesgo Sí => No lanzar
  assert.equal(first.lectura, 'No lanzar: riesgo abierto')
  assert.equal(first.lectura_origen, 'formula_I13')
  assert.equal(first.lectura_manual_anterior, 'Mi lectura')
  assert.equal(first.riesgo_critico, 'Sí')
  assert.equal(old.puntaje_ponderado, '4.8')
  const second = preparePrioritizationFields({ ...first, demanda: '4' })
  assert.equal(second.puntaje_ponderado, String(4 * 0.25 + 4 * 0.25 + 3 * 0.2 + 2 * 0.2 + 1 * 0.1))
  assert.equal(previousManualWeightedScore(second), '4.8')
  // Lectura sigue calculada con riesgo Sí
  assert.equal(second.lectura, 'No lanzar: riesgo abierto')
  assert.equal(previousManualReading(second), 'Mi lectura')
  const third = preparePrioritizationFields({ ...second, demanda: '' })
  assert.equal(third.puntaje_ponderado, '')
  assert.equal(third.puntaje_ponderado_manual_anterior, '4.8')
  // Sin puntaje => Completar evaluación, no debe guardar lectura anterior de nuevo
  assert.equal(third.lectura, 'Completar evaluación')
  assert.equal(third.lectura_manual_anterior, 'Mi lectura')
  assert.equal(previousManualWeightedScore({ puntaje_ponderado: 0 }), 0)
  assert.equal(preparePrioritizationFields({ puntaje_ponderado: 0 }).puntaje_ponderado_manual_anterior, 0)
  assert.equal(previousManualWeightedScore({ puntaje_ponderado: '0', puntaje_ponderado_origen: 'formula_G13' }), null)
})

test('conserva la lectura manual anterior solo si difiere del cálculo', () => {
  // Seed inicial: lectura igual al cálculo no debe crear historial espurio
  const seed = { demanda: '', economia: '', operacion: '', producto: '', diferenciacion: '', lectura: 'Completar evaluación' }
  const migratedSeed = preparePrioritizationFields(seed)
  assert.equal(migratedSeed.lectura, 'Completar evaluación')
  assert.equal(migratedSeed.lectura_manual_anterior, undefined)
  // Lectura manual distinta sí se conserva
  const custom = { demanda: '5', economia: '5', operacion: '5', producto: '5', diferenciacion: '5', lectura: 'Lectura antigua' }
  const migratedCustom = preparePrioritizationFields(custom)
  assert.equal(migratedCustom.lectura, 'Candidata prioritaria')
  assert.equal(migratedCustom.lectura_manual_anterior, 'Lectura antigua')
  // Si ya existe lectura_manual_anterior no se sobrescribe
  const second = preparePrioritizationFields({ ...migratedCustom, demanda: '4' })
  assert.equal(second.lectura_manual_anterior, 'Lectura antigua')
  assert.equal(previousManualReading(migratedCustom), 'Lectura antigua')
  assert.equal(previousManualReading({ lectura: '0', lectura_origen: 'formula_I13' }), null)
  const edge = preparePrioritizationFields({ lectura: 'Algo' })
  assert.equal(edge.lectura, 'Completar evaluación')
  assert.equal(edge.lectura_manual_anterior, 'Algo')
})

test('detecta cambios automáticos al migrar para revisar la lectura dependiente', () => {
  const old = { demanda: '5', economia: '4', operacion: '3', producto: '2', diferenciacion: '1', puntaje_ponderado: '4.8', lectura: 'Recomendado' }
  const score = calculateWeightedScore(old)
  assert.equal(weightedScoreChanged(old, score), true)
  const reading = calculateReading(old, score)
  assert.equal(readingChanged(old, reading), true)
  const migrated = preparePrioritizationFields(old, score, reading)
  assert.equal(weightedScoreChanged(migrated, score), false)
  assert.equal(readingChanged(migrated, reading), false)
  assert.equal(weightedScoreChanged({ puntaje_ponderado: '' }, { value: null }), false)
  assert.equal(weightedScoreChanged({ puntaje_ponderado: 0 }, { value: 0 }), false)
  assert.equal(weightedScoreChanged({ puntaje_ponderado: '0' }, { value: null }), true)
  assert.equal(weightedScoreChanged({}, { value: 0 }), true)
  assert.equal(readingChanged({ lectura: 'Completar evaluación' }, { value: 'Completar evaluación', error: '' }), false)
  assert.equal(readingChanged({ lectura: '' }, { value: 'Completar evaluación', error: '' }), true)
  assert.equal(readingChanged({}, { value: 'Candidata prioritaria', error: '' }), true)
})
