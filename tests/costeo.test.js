import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatedCostFieldsChanged, calculateContributionMargin, calculateCostResults, calculatePriceWithRate, calculateSuggestedPrice, calculateUnitContribution, calculateVariableCost, formatContributionMargin, formatVariableCost, prepareCostFields, previousManualContribution, previousManualMargin, previousManualPriceWithRate, previousManualSuggestedPrice, previousManualVariableCost, VARIABLE_COST_INPUTS } from '../src/lib/costeo.js'

test('M5 queda vacío sin costos, incluso si hay merma; cero sí cuenta como costo capturado', () => {
  assert.deepEqual(calculateVariableCost({}), { value: null, error: '' })
  assert.deepEqual(calculateVariableCost({ merma: '15' }), { value: null, error: '' })
  assert.deepEqual(calculateVariableCost({ materiales: '0', merma: '15' }), { value: 0, error: '' })
  assert.deepEqual(calculateVariableCost({ otros_variables: '0' }), { value: 0, error: '' })
})

test('M5 suma D:J y L y aplica K como porcentaje, sin inventar costos ni redondear el valor', () => {
  const fields = { materiales: '100', impresion: '25', acabados: '10', mano_obra: '5', empaque: '2', flete: '3', servicios_externos: '4', otros_variables: '1', merma: '10' }
  assert.equal(VARIABLE_COST_INPUTS.length, 8)
  assert.equal(calculateVariableCost(fields).value, 165)
  assert.equal(calculateVariableCost({ otros_variables: '50', merma: '50' }).value, 75)
  assert.equal(calculateVariableCost({ impresion: '7' }).value, 7)
  assert.equal(calculateVariableCost({ materiales: '100', otros_variables: '-10', merma: '150' }).value, 225)
  assert.equal(calculateVariableCost({ materiales: '100', merma: '-20' }).value, 80)
  const precise = calculateVariableCost({ materiales: '1.2345', merma: '10' }).value
  assert.equal(precise, 1.2345 * 1.1)
  assert.equal(formatVariableCost(precise), '1.36')
  assert.equal(formatVariableCost(1234.567), '1,234.57')
  assert.equal(formatVariableCost(null), '')
})

test('valores no numéricos o un resultado fuera de rango no se presentan como cero', () => {
  assert.match(calculateVariableCost({ materiales: 'abc' }).error, /Revisa/)
  assert.match(calculateVariableCost({ materiales: '1', merma: 'incorrecta' }).error, /Revisa/)
  assert.match(calculateVariableCost({ materiales: '1e308', impresion: '1e308' }).error, /excede/)
})

test('se conserva cualquier costo manual anterior sin usarlo como resultado automático', () => {
  const old = { producto_variante: 'Playera', materiales: '250', merma: '10', costo_variable: '150' }
  const first = prepareCostFields(old)
  assert.equal(first.costo_variable, '275')
  assert.equal(first.costo_variable_origen, 'formula_M5')
  assert.equal(first.costo_variable_manual_anterior, '150')
  assert.equal(old.costo_variable, '150', 'no se altera el registro original')
  const updated = { ...first, materiales: '300' }
  const second = prepareCostFields(updated)
  assert.equal(second.costo_variable, '330')
  assert.equal(second.costo_variable_manual_anterior, '150')
  assert.equal(previousManualVariableCost(second), '150')
})

test('el costo automático previo no se confunde con captura manual y se vacía si se borran las entradas', () => {
  const first = prepareCostFields({ materiales: '10' })
  assert.equal(first.costo_variable, '10')
  assert.equal(previousManualVariableCost(first), null)
  const cleared = { ...first, materiales: '' }
  const second = prepareCostFields(cleared)
  assert.equal(second.costo_variable, '')
  assert.equal(previousManualVariableCost(second), null)
  assert.equal(previousManualVariableCost({ costo_variable: 0 }), 0, 'un cero manual anterior se conserva')
})


test('Q5 permanece vacío cuando M5 está vacío, y distingue un costo capturado de cero', () => {
  assert.deepEqual(calculateSuggestedPrice({ merma: '5', margen_objetivo: '30' }), { value: null, warning: '' })
  assert.equal(calculateSuggestedPrice({ materiales: '0', margen_objetivo: '30' }).value, 0)
  assert.equal(calculateSuggestedPrice({ materiales: '100' }).value, 100)
})

test('Q5 divide el costo por uno menos comisiones y margen, sin redondeo interno', () => {
  const fields = { materiales: '100', merma: '10', comision_canal: '10', comision_pago: '5', margen_objetivo: '35' }
  const calculatedCost = calculateVariableCost(fields).value
  const expected = calculatedCost / (1 - 0.10 - 0.05 - 0.35)
  assert.equal(calculateSuggestedPrice(fields).value, expected)
  assert.equal(formatVariableCost(calculateSuggestedPrice(fields).value), '220.00')
  assert.equal(calculateSuggestedPrice({ materiales: '100', comision_canal: '-20' }).value, 100 / (1 + 0.2))
})

test('Q5 respeta SI.ERROR y avisa sin alterar resultados negativos o cercanos a cero', () => {
  const zeroDenominator = calculateSuggestedPrice({ materiales: '100', comision_canal: '100' })
  assert.equal(zeroDenominator.value, 0)
  assert.match(zeroDenominator.warning, /cero por un error/)
  const zeroOverZero = calculateSuggestedPrice({ materiales: '0', comision_canal: '100' })
  assert.equal(zeroOverZero.value, 0)
  assert.match(zeroOverZero.warning, /cero por un error/)
  const negative = calculateSuggestedPrice({ materiales: '100', comision_canal: '150' })
  assert.equal(negative.value, -200)
  assert.match(negative.warning, /negativo/)
  const nearZero = calculateSuggestedPrice({ materiales: '100', comision_canal: '10', comision_pago: '70', margen_objetivo: '20' })
  assert.equal(nearZero.value, 100 / (1 - 0.1 - 0.7 - 0.2))
  assert.match(nearZero.warning, /cerca de cero/)
  const invalid = calculateSuggestedPrice({ materiales: '100', comision_pago: 'texto' })
  assert.equal(invalid.value, 0)
  assert.match(invalid.warning, /error/)
})

test('Q5 conserva el precio manual previo y recalcula a partir de M5 y los porcentajes actuales', () => {
  const original = { materiales: '100', comision_canal: '20', precio_sugerido: '450', margen_real: '75' }
  const first = prepareCostFields(original)
  assert.equal(first.precio_sugerido, '125')
  assert.equal(first.precio_sugerido_origen, 'formula_Q5')
  assert.equal(first.precio_sugerido_manual_anterior, '450')
  assert.equal(first.precio_con_tasa, '125', 'con la tasa vacía, S5 coincide con Q5')
  assert.equal(first.contribucion_unidad, '0')
  assert.equal(first.margen_real, '0', 'U5 se calcula a partir de T5 y Q5')
  assert.equal(first.margen_real_manual_anterior, '75')
  assert.equal(original.precio_sugerido, '450', 'no se altera el registro original')
  const changed = { ...first, comision_canal: '0' }
  const second = prepareCostFields(changed)
  assert.equal(second.precio_sugerido, '100')
  assert.equal(second.precio_sugerido_manual_anterior, '450')
  assert.equal(previousManualSuggestedPrice(second), '450')
})

test('Q5 no trata un precio automático previo como captura manual y se vacía al borrar los costos', () => {
  const first = prepareCostFields({ materiales: '10' })
  assert.equal(first.precio_sugerido, '10')
  assert.equal(previousManualSuggestedPrice(first), null)
  const cleared = { ...first, materiales: '' }
  const second = prepareCostFields(cleared)
  assert.equal(second.precio_sugerido, '')
  assert.equal(previousManualSuggestedPrice({ precio_sugerido: 0 }), 0)
})


test('S5 queda vacío si Q5 está vacío, pero un Q5 de cero produce cero', () => {
  assert.deepEqual(calculatePriceWithRate({ merma: '10', tasa: '16' }), { value: null, error: '' })
  assert.deepEqual(calculatePriceWithRate({ materiales: '0', tasa: '16' }), { value: 0, error: '' })
  // Q5 uses SI.ERROR and returns zero when its denominator is zero.
  assert.deepEqual(calculatePriceWithRate({ materiales: '100', comision_canal: '100', tasa: '16' }), { value: 0, error: '' })
})

test('S5 multiplica Q5 por uno más R5; una tasa vacía equivale a cero', () => {
  const fields = { materiales: '100', merma: '10', comision_canal: '10', comision_pago: '5', margen_objetivo: '35', tasa: '16' }
  const q5 = calculateSuggestedPrice(fields).value
  const result = calculatePriceWithRate(fields)
  assert.equal(result.value, q5 * 1.16)
  assert.equal(result.error, '')
  assert.equal(formatVariableCost(result.value), '255.20')
  assert.equal(calculatePriceWithRate({ materiales: '100' }).value, 100)
  assert.equal(calculatePriceWithRate({ materiales: '100', tasa: '0' }).value, 100)
  assert.equal(calculatePriceWithRate({ materiales: '100', tasa: '-20' }).value, 80)
  assert.equal(calculatePriceWithRate({ materiales: '100', tasa: '150' }).value, 250)
})

test('S5 usa la precisión completa de Q5 y no convierte sus propios errores en cero', () => {
  const fields = { materiales: '1.2345', merma: '10', comision_canal: '7.35', comision_pago: '2.14', margen_objetivo: '31.05', tasa: '16.12345' }
  const q5 = calculateSuggestedPrice(fields).value
  const result = calculatePriceWithRate(fields)
  assert.equal(result.value, q5 * (1 + 16.12345 / 100))
  assert.equal(prepareCostFields(fields).precio_con_tasa, String(result.value))
  const invalid = calculatePriceWithRate({ materiales: '100', tasa: 'texto' })
  assert.equal(invalid.value, null)
  assert.match(invalid.error, /Revisa/)
  const overflow = { materiales: '1e308', tasa: '100' }
  assert.equal(calculatePriceWithRate(overflow).value, null)
  assert.match(calculatePriceWithRate(overflow).error, /excede/)
  assert.throws(() => prepareCostFields(overflow), /excede/)
})

test('S5 conserva el valor manual anterior y los demás valores históricos', () => {
  const old = { materiales: '100', comision_canal: '20', tasa: '16', precio_con_tasa: '500', contribucion_unidad: '375', margen_real: '75' }
  const first = prepareCostFields(old)
  assert.equal(first.precio_sugerido, '125')
  assert.equal(first.precio_con_tasa, String(125 * 1.16))
  assert.equal(first.precio_con_tasa_origen, 'formula_S5')
  assert.equal(first.precio_con_tasa_manual_anterior, '500')
  assert.equal(first.contribucion_unidad, '0')
  assert.equal(first.contribucion_unidad_manual_anterior, '375')
  assert.equal(first.margen_real, '0')
  assert.equal(first.margen_real_manual_anterior, '75')
  assert.equal(old.precio_con_tasa, '500', 'no se altera el registro original')
  const changed = { ...first, tasa: '8' }
  const second = prepareCostFields(changed)
  assert.equal(second.precio_con_tasa, String(125 * 1.08))
  assert.equal(previousManualPriceWithRate(second), '500')
  const cleared = { ...second, materiales: '' }
  const third = prepareCostFields(cleared)
  assert.equal(third.precio_con_tasa, '')
  assert.equal(third.precio_con_tasa_manual_anterior, '500')
  assert.equal(previousManualPriceWithRate({ precio_con_tasa: 0 }), 0)
  assert.equal(previousManualPriceWithRate({ precio_con_tasa: '0', precio_con_tasa_origen: 'formula_S5' }), null)
})

test('T5 queda vacío sin Q5 y distingue un precio numérico de cero', () => {
  assert.deepEqual(calculateUnitContribution({ merma: '10', comision_canal: '15' }), { value: null, error: '' })
  assert.deepEqual(calculateUnitContribution({ materiales: '0', comision_canal: '15' }), { value: 0, error: '' })
  // Q5's IFERROR result is numeric 0, so T5 returns -M5, not a blank or zero.
  const withPriceError = { materiales: '100', comision_canal: '100' }
  assert.match(calculateSuggestedPrice(withPriceError).warning, /cero por un error/)
  assert.deepEqual(calculateUnitContribution(withPriceError), { value: -100, error: '' })
  assert.equal(calculateUnitContribution({ materiales: '0', comision_canal: '100' }).value, 0)
})

test('T5 usa el precio sin impuestos, ambas comisiones y el costo, no el precio con tasa', () => {
  const fields = { materiales: '100', comision_canal: '20', comision_pago: '5', margen_objetivo: '35', tasa: '16' }
  assert.equal(calculateSuggestedPrice(fields).value, 250)
  assert.equal(calculateUnitContribution(fields).value, 87.5)
  assert.equal(calculateUnitContribution({ ...fields, tasa: '150' }).value, 87.5)
  assert.equal(calculateUnitContribution({ materiales: '100' }).value, 0, 'las comisiones vacías equivalen a cero')
  const changedMargin = { ...fields, margen_objetivo: '20' }
  assert.equal(calculateUnitContribution(changedMargin).value, calculateSuggestedPrice(changedMargin).value * (1 - 0.2 - 0.05) - 100)
})

test('T5 conserva la precisión de sus operaciones, sin truncar ni suprimir valores negativos', () => {
  const fields = { materiales: '1.2345', merma: '10', comision_canal: '7.35', comision_pago: '2.14', margen_objetivo: '31.05' }
  const cost = calculateVariableCost(fields)
  const price = calculateSuggestedPrice(fields, cost)
  const result = calculateUnitContribution(fields, cost, price)
  assert.equal(result.value, price.value * (1 - 7.35 / 100 - 2.14 / 100) - cost.value)
  assert.equal(prepareCostFields(fields).contribucion_unidad, String(result.value))
  const tinyNegative = { materiales: '1', comision_canal: '1', comision_pago: '5', margen_objetivo: '0' }
  const q = calculateSuggestedPrice(tinyNegative).value
  assert.ok(calculateUnitContribution(tinyNegative).value < 0)
  assert.equal(calculateUnitContribution(tinyNegative).value, q * (1 - 0.01 - 0.05) - 1)
})

test('T5 no tiene SI.ERROR: avisa y no guarda si su propio cálculo falla', () => {
  const invalid = calculateUnitContribution({ materiales: '100', comision_pago: 'texto' })
  assert.equal(invalid.value, null)
  assert.match(invalid.error, /Revisa/)
  // Even if only P5 makes Q5 return its fallback, T5 uses that zero.
  assert.equal(calculateUnitContribution({ materiales: '100', margen_objetivo: 'texto' }).value, -100)
  const overflow = { materiales: '1e308', comision_canal: '-100', margen_objetivo: '100' }
  assert.equal(calculateSuggestedPrice(overflow).value, 1e308)
  assert.equal(calculatePriceWithRate(overflow).value, 1e308)
  assert.equal(calculateUnitContribution(overflow).value, null)
  assert.match(calculateUnitContribution(overflow).error, /excede/)
  assert.throws(() => prepareCostFields(overflow), /contribución por unidad excede/)
})

test('T5 preserva contribuciones y márgenes manuales previos sin usarlos en el cálculo', () => {
  const old = { materiales: '100', comision_canal: '20', comision_pago: '5', margen_objetivo: '35', tasa: '16', contribucion_unidad: '99', margen_real: '40' }
  const first = prepareCostFields(old)
  assert.equal(first.contribucion_unidad, '87.5')
  assert.equal(first.contribucion_unidad_origen, 'formula_T5')
  assert.equal(first.contribucion_unidad_manual_anterior, '99')
  assert.equal(first.margen_real, '0.35')
  assert.equal(first.margen_real_manual_anterior, '40')
  assert.equal(old.contribucion_unidad, '99', 'no se altera el registro original')
  const changed = { ...first, margen_objetivo: '25' }
  const second = prepareCostFields(changed)
  assert.equal(second.contribucion_unidad, String(calculateUnitContribution(changed).value))
  assert.equal(previousManualContribution(second), '99')
  assert.equal(second.margen_real, '0.25')
  assert.equal(second.margen_real_manual_anterior, '40')
  const third = prepareCostFields({ ...second, materiales: '' })
  assert.equal(third.contribucion_unidad, '')
  assert.equal(third.contribucion_unidad_manual_anterior, '99')
  assert.equal(previousManualContribution({ contribucion_unidad: 0 }), 0)
  assert.equal(previousManualContribution({ contribucion_unidad: '0', contribucion_unidad_origen: 'formula_T5' }), null)
})

test('U5 queda vacío al dividir entre cero, con entradas vacías o cuando T5 produce error', () => {
  assert.deepEqual(calculateContributionMargin({}), { value: null })
  assert.deepEqual(calculateContributionMargin({ merma: '10', comision_canal: '15' }), { value: null })
  assert.deepEqual(calculateContributionMargin({ materiales: '0' }), { value: null })
  const withPriceError = { materiales: '100', comision_canal: '100' }
  assert.equal(calculateSuggestedPrice(withPriceError).value, 0)
  assert.equal(calculateUnitContribution(withPriceError).value, -100)
  assert.deepEqual(calculateContributionMargin(withPriceError), { value: null })
  const contributionOverflow = { materiales: '1e308', comision_canal: '-100', margen_objetivo: '100' }
  assert.match(calculateUnitContribution(contributionOverflow).error, /excede/)
  assert.deepEqual(calculateContributionMargin(contributionOverflow), { value: null })
  // A numeric division that overflows is also caught by SI.ERROR.
  assert.deepEqual(calculateContributionMargin({}, { value: 1 }, { value: 1e-200 }, { value: 1e200 }), { value: null })
})

test('U5 divide T5 entre Q5 y muestra el resultado como porcentaje con un decimal', () => {
  const fields = { materiales: '100', comision_canal: '20', comision_pago: '5', margen_objetivo: '35', tasa: '16' }
  const cost = calculateVariableCost(fields)
  const price = calculateSuggestedPrice(fields, cost)
  const contribution = calculateUnitContribution(fields, cost, price)
  const margin = calculateContributionMargin(fields, cost, price, contribution)
  assert.equal(margin.value, 87.5 / 250)
  assert.equal(formatContributionMargin(margin.value), '35.0%')
  assert.equal(formatContributionMargin(0), '0.0%')
  assert.equal(formatContributionMargin(null), '')
  assert.equal(calculateContributionMargin({ ...fields, tasa: '150' }).value, margin.value)
  const negative = { ...fields, margen_objetivo: '-20' }
  const negativeMargin = calculateContributionMargin(negative).value
  assert.ok(negativeMargin < 0)
  assert.equal(formatContributionMargin(negativeMargin), '-20.0%')
  const zeroContribution = { materiales: '100' }
  assert.equal(calculateContributionMargin(zeroContribution).value, 0)
  assert.equal(formatContributionMargin(calculateContributionMargin(zeroContribution).value), '0.0%')
  const negativePrice = { materiales: '100', comision_canal: '120', margen_objetivo: '10' }
  const q = calculateSuggestedPrice(negativePrice).value
  const t = calculateUnitContribution(negativePrice).value
  assert.ok(q < 0 && t < 0)
  assert.equal(calculateContributionMargin(negativePrice).value, t / q)
})

test('U5 guarda la proporción sin redondeo y no la sustituye por el margen objetivo', () => {
  const fields = { materiales: '1.2345', merma: '10', comision_canal: '7.35', comision_pago: '2.14', margen_objetivo: '31.05' }
  const results = calculateCostResults(fields)
  const expected = results.contribucion_unidad.value / results.precio_sugerido.value
  assert.equal(results.margen_real.value, expected)
  assert.equal(prepareCostFields(fields, results).margen_real, String(expected))
  // A small floating point result must not be replaced by the input margin.
  const tiny = { materiales: '1', comision_canal: '1', comision_pago: '5', margen_objetivo: '0' }
  assert.notEqual(calculateContributionMargin(tiny).value, 0)
  assert.equal(calculateContributionMargin(tiny).value, calculateUnitContribution(tiny).value / calculateSuggestedPrice(tiny).value)
})

test('U5 conserva el margen manual anterior, incluso cero, y no vuelve a clasificar resultados automáticos', () => {
  const old = { materiales: '100', comision_canal: '20', comision_pago: '5', margen_objetivo: '35', margen_real: '40' }
  const first = prepareCostFields(old)
  assert.equal(first.margen_real, '0.35')
  assert.equal(first.margen_real_origen, 'formula_U5')
  assert.equal(first.margen_real_manual_anterior, '40')
  assert.equal(old.margen_real, '40')
  const changed = { ...first, margen_objetivo: '25' }
  const second = prepareCostFields(changed)
  assert.equal(second.margen_real, '0.25')
  assert.equal(previousManualMargin(second), '40')
  const third = prepareCostFields({ ...second, materiales: '' })
  assert.equal(third.margen_real, '')
  assert.equal(third.margen_real_manual_anterior, '40')
  assert.equal(previousManualMargin({ margen_real: 0 }), 0)
  assert.equal(previousManualMargin({ margen_real: '0', margen_real_origen: 'formula_U5' }), null)
  assert.equal(prepareCostFields({ materiales: '0', margen_real: 0 }).margen_real_manual_anterior, 0)
})

test('detecta cambios de los resultados automáticos al migrar y compara márgenes en la misma unidad', () => {
  // Only S5 differs; the other calculated values already match.
  const old = { materiales: '100', comision_canal: '20', tasa: '16', costo_variable: '100', costo_variable_origen: 'formula_M5', precio_sugerido: '125', precio_sugerido_origen: 'formula_Q5', precio_con_tasa: '500', contribucion_unidad: '0', contribucion_unidad_origen: 'formula_T5', margen_real: '0' }
  const results = calculateCostResults(old)
  assert.equal(calculatedCostFieldsChanged(old, results), true, 'un cambio solo en S5 se detecta')
  const migrated = prepareCostFields(old, results)
  assert.equal(calculatedCostFieldsChanged(migrated, results), false)
  const oldT = { ...migrated, contribucion_unidad: '375', contribucion_unidad_origen: undefined }
  assert.equal(calculatedCostFieldsChanged(oldT, results), true, 'un cambio solo en T5 se detecta')
  const oldU = { ...migrated, margen_real: '40', margen_real_origen: undefined }
  assert.equal(calculatedCostFieldsChanged(oldU, results), true, 'un cambio solo en U5 se detecta')
  const fields35 = { materiales: '100', comision_canal: '20', comision_pago: '5', margen_objetivo: '35' }
  const results35 = calculateCostResults(fields35)
  const migrated35 = prepareCostFields(fields35, results35)
  assert.equal(calculatedCostFieldsChanged({ ...migrated35, margen_real: '35', margen_real_origen: undefined }, results35), false, '35 % manual y proporción 0.35 son equivalentes')
  assert.equal(calculatedCostFieldsChanged({ costo_variable: '', precio_sugerido: '', precio_con_tasa: '', contribucion_unidad: '', margen_real: '' }, calculateCostResults({})), false)
  const allZero = Object.fromEntries(['costo_variable', 'precio_sugerido', 'precio_con_tasa', 'contribucion_unidad', 'margen_real'].map(key => [key, { value: 0 }]))
  assert.equal(calculatedCostFieldsChanged({ costo_variable: 0, precio_sugerido: 0, precio_con_tasa: 0, contribucion_unidad: 0, margen_real: 0 }, allZero), false)
})
