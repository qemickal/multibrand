import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateMonthlyExpense, calculateMonthlyExpenseTotal, PANEL_EXPENSE_LIMIT, prepareExpenseFields, previousManualMonthlyExpense } from '../src/lib/gastos.js'
import { formatVariableCost } from '../src/lib/costeo.js'

test('G5 convierte las seis periodicidades tal como indica la fórmula', () => {
  const expected = {
    Mensual: 1200,
    Anual: 100,
    Semanal: 5200,
    Diario: 36000,
    Trimestral: 400,
    Semestral: 200,
  }
  for (const [periodicidad, value] of Object.entries(expected)) {
    assert.deepEqual(calculateMonthlyExpense({ importe: '1200', periodicidad }), { value, error: '', warning: '' }, periodicidad)
  }
  assert.equal(calculateMonthlyExpense({ importe: '-1200', periodicidad: 'Semanal' }).value, -5200)
})

test('G5 no distingue mayúsculas pero exige las palabras exactas y respeta espacios', () => {
  assert.equal(calculateMonthlyExpense({ importe: '1200', periodicidad: 'mEnSuAl' }).value, 1200)
  assert.equal(calculateMonthlyExpense({ importe: '1200', periodicidad: 'ANUAL' }).value, 100)
  for (const periodicidad of [' Mensual', 'Mensual ', 'quincenal', 'mes', 'constructor']) {
    const result = calculateMonthlyExpense({ importe: '1200', periodicidad })
    assert.equal(result.value, 0, periodicidad)
    assert.match(result.warning, /no coincide/, periodicidad)
    const saved = prepareExpenseFields({ importe: '1200', periodicidad })
    assert.equal(saved.periodicidad, periodicidad)
    assert.equal(saved.mensual, '0')
  }
})

test('G5 devuelve cero si faltan datos o no coincide F5, sin fingir que hay un gasto', () => {
  assert.deepEqual(calculateMonthlyExpense({}), { value: 0, error: '', warning: '' })
  assert.match(calculateMonthlyExpense({ importe: '1200' }).warning, /no coincide/)
  const withoutAmount = calculateMonthlyExpense({ periodicidad: 'Anual' })
  assert.equal(withoutAmount.value, 0)
  assert.match(withoutAmount.warning, /importe está vacío/)
  assert.deepEqual(calculateMonthlyExpense({ periodicidad: 'Anual', importe: '0' }), { value: 0, error: '', warning: '' })
  // E5 is not evaluated in the formula's fallback branch.
  assert.equal(calculateMonthlyExpense({ periodicidad: 'quincenal', importe: 'no numérico' }).value, 0)
})

test('G5 conserva la precisión y el orden E5*52/12 de la fórmula semanal', () => {
  const fields = { importe: '1.23456789', periodicidad: 'Semanal' }
  const expected = 1.23456789 * 52 / 12
  assert.notEqual(expected, 1.23456789 * (52 / 12))
  assert.equal(calculateMonthlyExpense(fields).value, expected)
  assert.equal(prepareExpenseFields(fields).mensual, String(expected))
  assert.equal(formatVariableCost(expected), '5.35')
})

test('G5 no oculta errores de cálculo en sus ramas con importe', () => {
  const invalid = calculateMonthlyExpense({ importe: 'texto', periodicidad: 'Mensual' })
  assert.equal(invalid.value, null)
  assert.match(invalid.error, /Revisa el importe/)
  const overflow = { importe: '1e307', periodicidad: 'Semanal' }
  assert.ok(Number.isFinite(1e307 * (52 / 12)), 'reagrupar cambiaría el resultado de la fórmula')
  assert.equal(calculateMonthlyExpense(overflow).value, null)
  assert.match(calculateMonthlyExpense(overflow).error, /excede/)
  assert.throws(() => prepareExpenseFields(overflow), /excede/)
  assert.equal(calculateMonthlyExpense({ importe: '1e308', periodicidad: 'Mensual' }).value, 1e308)
})

test('G5 conserva un equivalente manual anterior, incluso cero, sin usarlo en el cálculo', () => {
  const old = { concepto: 'Renta', importe: '1200', periodicidad: 'Anual', mensual: '220' }
  const first = prepareExpenseFields(old)
  assert.equal(first.mensual, '100')
  assert.equal(first.mensual_origen, 'formula_G5')
  assert.equal(first.mensual_manual_anterior, '220')
  assert.equal(old.mensual, '220')
  const second = prepareExpenseFields({ ...first, periodicidad: 'Semanal' })
  assert.equal(second.mensual, '5200')
  assert.equal(previousManualMonthlyExpense(second), '220')
  const unsupported = prepareExpenseFields({ ...second, periodicidad: 'Quincenal' })
  assert.equal(unsupported.mensual, '0')
  assert.equal(unsupported.mensual_manual_anterior, '220')
  assert.equal(previousManualMonthlyExpense({ mensual: 0 }), 0)
  assert.equal(prepareExpenseFields({ mensual: 0 }).mensual_manual_anterior, 0)
  assert.equal(previousManualMonthlyExpense({ mensual: '0', mensual_origen: 'formula_G5' }), null)
  assert.equal(previousManualMonthlyExpense(prepareExpenseFields({ importe: '100', periodicidad: 'Mensual' })), null)
})

const expense = (id, importe, periodicidad, extra = {}) => ({ id, modulo: 'gastos', campos: { concepto: id, importe, periodicidad, ...extra } })

test('PANEL E8 suma los equivalentes mensuales calculados y solo considera gastos', () => {
  const records = [
    expense('a', '1200', 'Mensual'), expense('b', '1200', 'Anual'),
    expense('c', '12', 'Semanal'), expense('d', '1', 'Diario'),
    expense('e', '300', 'Trimestral'), expense('f', '600', 'Semestral'),
    { id: 'otro', modulo: 'costeo', campos: { importe: '999999', periodicidad: 'Mensual' } },
  ]
  assert.deepEqual(calculateMonthlyExpenseTotal(records), { value: 1582, count: 6, incomplete: 0, legacy: 0, error: '' })
  assert.deepEqual(calculateMonthlyExpenseTotal([]), { value: 0, count: 0, incomplete: 0, legacy: 0, error: '' })
  assert.equal(calculateMonthlyExpenseTotal([expense('n', '-10', 'Mensual')]).value, -10)
})

test('PANEL E8 avisa cuando entradas incompletas o no reconocidas aportan cero', () => {
  const records = [expense('a', '12', 'Quincenal'), expense('b', '', ''), expense('c', '0', 'Mensual'), expense('d', '', 'Anual')]
  const total = calculateMonthlyExpenseTotal(records)
  assert.equal(total.value, 0)
  assert.equal(total.count, 4)
  assert.equal(total.incomplete, 3)
  assert.equal(total.error, '')
})

test('PANEL E8 usa G5 actual, no equivalentes manuales o automáticos obsoletos', () => {
  const old = expense('a', '1200', 'Anual', { mensual: '550' })
  const stale = expense('b', '100', 'Mensual', { mensual: '9999', mensual_origen: 'formula_G5' })
  const result = calculateMonthlyExpenseTotal([old, stale])
  assert.equal(result.value, 200)
  assert.equal(result.legacy, 1)
  assert.equal(old.campos.mensual, '550', 'calcular el panel no muta el dato anterior')
  const migrated = { ...old, campos: prepareExpenseFields(old.campos) }
  assert.equal(calculateMonthlyExpenseTotal([migrated]).legacy, 0)
  assert.equal(migrated.campos.mensual_manual_anterior, '550')
})

test('PANEL E8 respeta el máximo de 100 filas sin excluir gastos arbitrariamente', () => {
  assert.equal(PANEL_EXPENSE_LIMIT, 100)
  const hundred = Array.from({ length: 100 }, (_, index) => expense(String(index), '1', 'Mensual'))
  assert.equal(calculateMonthlyExpenseTotal(hundred).value, 100)
  const tooMany = calculateMonthlyExpenseTotal([...hundred, expense('101', '9999', 'Mensual')])
  assert.equal(tooMany.value, null)
  assert.equal(tooMany.count, 101)
  assert.match(tooMany.error, /100 filas.*101 gastos/)
})

test('PANEL E8 no ignora errores en G5 ni un desbordamiento de la suma', () => {
  const badRow = calculateMonthlyExpenseTotal([expense('a', '100', 'Mensual'), expense('b', '1e307', 'Semanal')])
  assert.equal(badRow.value, null)
  assert.match(badRow.error, /1 gasto/)
  const badSum = calculateMonthlyExpenseTotal([expense('a', '1e308', 'Mensual'), expense('b', '1e308', 'Mensual')])
  assert.equal(badSum.value, null)
  assert.match(badSum.error, /suma mensual excede/)
})

test('PANEL E8 guarda la precisión de cada equivalente y tiene orden estable entre cargas', () => {
  const records = [expense('a', '1e16', 'Mensual'), expense('b', '-1e16', 'Mensual'), expense('c', '1.23456789', 'Semanal')]
  const expected = 1.23456789 * 52 / 12
  assert.equal(calculateMonthlyExpenseTotal(records).value, expected)
  assert.equal(calculateMonthlyExpenseTotal([...records].reverse()).value, expected)
  assert.equal(formatVariableCost(expected), '5.35')
})
