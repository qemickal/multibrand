// Formula provided for COSTEO_PRECIOS!M5:
// =SI(CONTARA(D5:J5,L5)=0,"",(SUMA(D5:J5)+L5)*(1+K5))
// The app's percentage inputs are displayed as 10 for 10%, unlike Excel's
// underlying decimal representation (0.10).
export const VARIABLE_COST_INPUTS = [
  'materiales', 'impresion', 'acabados', 'mano_obra', 'empaque',
  'flete', 'servicios_externos', 'otros_variables',
]

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== ''

export function calculateVariableCost(fields) {
  // Merma alone does not make M5 nonempty; zero in any cost cell does.
  if (!VARIABLE_COST_INPUTS.some(key => hasValue(fields[key]))) return { value: null, error: '' }
  const amounts = VARIABLE_COST_INPUTS.map(key => hasValue(fields[key]) ? Number(fields[key]) : 0)
  const waste = hasValue(fields.merma) ? Number(fields.merma) : 0
  if (!amounts.every(Number.isFinite) || !Number.isFinite(waste)) {
    return { value: null, error: 'Revisa los importes y el porcentaje de merma para calcular el costo.' }
  }
  const total = amounts.reduce((sum, amount) => sum + amount, 0) * (1 + waste / 100)
  if (!Number.isFinite(total)) return { value: null, error: 'El costo calculado excede el rango permitido. Revisa los importes.' }
  return { value: total, error: '' }
}

// Formula provided for COSTEO_PRECIOS!Q5:
// =SI(M5="","",SI.ERROR(M5/(1-N5-O5-P5),0))
export function calculateSuggestedPrice(fields, variableCost = calculateVariableCost(fields)) {
  if (variableCost.error) return { value: null, warning: '' }
  if (variableCost.value === null) return { value: null, warning: '' }
  const rateKeys = ['comision_canal', 'comision_pago', 'margen_objetivo']
  const rates = rateKeys.map(key => hasValue(fields[key]) ? Number(fields[key]) : 0)
  if (!rates.every(Number.isFinite)) {
    return { value: 0, warning: 'La fórmula devolvió cero por un error. Revisa las comisiones y el margen.' }
  }
  // Keep Excel's left-to-right binary arithmetic: do not round the denominator
  // or change negative/near-zero results. Warn separately before publication.
  const denominator = rates.reduce((current, rate) => current - rate / 100, 1)
  const quotient = variableCost.value / denominator
  if (!Number.isFinite(quotient)) {
    return { value: 0, warning: 'La fórmula devolvió cero por un error de cálculo. Revisa las comisiones y el margen.' }
  }
  const value = Object.is(quotient, -0) ? 0 : quotient
  let warning = ''
  if (denominator < 0) warning = 'Las comisiones y el margen dejan un denominador negativo. Revisa el precio antes de publicarlo.'
  else if (Math.abs(denominator) < 1e-12) warning = 'El denominador está muy cerca de cero. Revisa las comisiones y el margen antes de publicar.'
  return { value, warning }
}

// Formula provided for COSTEO_PRECIOS!S5:
// =SI(Q5="","",Q5*(1+R5))
export function calculatePriceWithRate(fields, suggestedPrice = calculateSuggestedPrice(fields)) {
  if (suggestedPrice.value === null) return { value: null, error: '' }
  const rate = hasValue(fields.tasa) ? Number(fields.tasa) : 0
  if (!Number.isFinite(rate) || !Number.isFinite(suggestedPrice.value)) {
    return { value: null, error: 'Revisa el precio sugerido y la tasa aplicable para calcular el precio con tasa.' }
  }
  const total = suggestedPrice.value * (1 + rate / 100)
  // S5 has no SI.ERROR: do not silently replace an invalid calculation with 0.
  if (!Number.isFinite(total)) return { value: null, error: 'El precio con tasa excede el rango permitido. Revisa el precio y la tasa.' }
  return { value: Object.is(total, -0) ? 0 : total, error: '' }
}

// Formula provided for COSTEO_PRECIOS!T5:
// =SI(Q5="","",Q5*(1-N5-O5)-M5)
export function calculateUnitContribution(fields, variableCost = calculateVariableCost(fields), suggestedPrice = calculateSuggestedPrice(fields, variableCost)) {
  if (suggestedPrice.value === null) return { value: null, error: '' }
  const commissions = ['comision_canal', 'comision_pago'].map(key => hasValue(fields[key]) ? Number(fields[key]) : 0)
  if (!Number.isFinite(variableCost.value) || !Number.isFinite(suggestedPrice.value) || !commissions.every(Number.isFinite)) {
    return { value: null, error: 'Revisa el precio, las comisiones y el costo para calcular la contribución por unidad.' }
  }
  // Preserve the formula's operation order and full precision, including
  // negative values. Q5's SI.ERROR may legitimately supply a zero here.
  const total = suggestedPrice.value * (1 - commissions[0] / 100 - commissions[1] / 100) - variableCost.value
  if (!Number.isFinite(total)) return { value: null, error: 'La contribución por unidad excede el rango permitido. Revisa el precio, las comisiones y el costo.' }
  return { value: Object.is(total, -0) ? 0 : total, error: '' }
}

// Formula provided for COSTEO_PRECIOS!U5:
// =SI.ERROR(T5/Q5,"")
export function calculateContributionMargin(fields, variableCost = calculateVariableCost(fields), suggestedPrice = calculateSuggestedPrice(fields, variableCost), contribution = calculateUnitContribution(fields, variableCost, suggestedPrice)) {
  if (suggestedPrice.value === null || contribution.value === null) return { value: null }
  const quotient = contribution.value / suggestedPrice.value
  // SI.ERROR returns an empty string on division by zero or another error.
  if (!Number.isFinite(quotient)) return { value: null }
  return { value: Object.is(quotient, -0) ? 0 : quotient }
}

export function calculateCostResults(fields) {
  const cost = calculateVariableCost(fields)
  const price = calculateSuggestedPrice(fields, cost)
  const priceWithRate = calculatePriceWithRate(fields, price)
  const contribution = calculateUnitContribution(fields, cost, price)
  const margin = calculateContributionMargin(fields, cost, price, contribution)
  return { costo_variable: cost, precio_sugerido: price, precio_con_tasa: priceWithRate, contribucion_unidad: contribution, margen_real: margin }
}

export function formatContributionMargin(value) {
  if (value === null) return ''
  // The workbook formats U as 0.0%; its unrounded value is a ratio.
  return new Intl.NumberFormat('es-MX', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

export function formatVariableCost(value) {
  if (value === null) return ''
  // Match the spreadsheet's two-decimal display without rounding the value
  // used or saved for subsequent calculations.
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function previousManualResult(fields, key, origin) {
  const previousKey = `${key}_manual_anterior`
  if (hasValue(fields[previousKey])) return fields[previousKey]
  if (fields[`${key}_origen`] !== origin && hasValue(fields[key])) return fields[key]
  return null
}

export const previousManualVariableCost = fields => previousManualResult(fields, 'costo_variable', 'formula_M5')
export const previousManualSuggestedPrice = fields => previousManualResult(fields, 'precio_sugerido', 'formula_Q5')
export const previousManualPriceWithRate = fields => previousManualResult(fields, 'precio_con_tasa', 'formula_S5')
export const previousManualContribution = fields => previousManualResult(fields, 'contribucion_unidad', 'formula_T5')
export const previousManualMargin = fields => previousManualResult(fields, 'margen_real', 'formula_U5')

const COST_RESULT_ORIGINS = {
  costo_variable: 'formula_M5',
  precio_sugerido: 'formula_Q5',
  precio_con_tasa: 'formula_S5',
  contribucion_unidad: 'formula_T5',
  margen_real: 'formula_U5',
}

// On upgrading a record, the automatic values can change even before the
// user edits an input. Manual dependent results still need explicit review.
export function calculatedCostFieldsChanged(previous, results) {
  return Object.keys(COST_RESULT_ORIGINS).some(key => {
    const result = results[key]
    const before = previous?.[key]
    if (result.value === null) return hasValue(before)
    if (!hasValue(before) || !Number.isFinite(Number(before))) return true
    // Older manual margins were entered as percentage points (35 = 35%).
    // Formula U5 is stored as Excel's ratio (0.35 = 35%).
    const oldValue = key === 'margen_real' && previous?.margen_real_origen !== 'formula_U5' ? Number(before) / 100 : Number(before)
    return oldValue !== result.value
  })
}

// Preserve previously entered manual amounts while writing current results.
// Reopening an already migrated record never reclassifies an auto result as a
// prior manual value. Formula U5 retains its unrounded ratio in storage.
export function prepareCostFields(fields, results = calculateCostResults(fields)) {
  const failed = Object.values(results).find(result => result.error)
  if (failed) throw new Error(failed.error)
  const normalized = { ...fields }
  for (const [key, origin] of Object.entries(COST_RESULT_ORIGINS)) {
    const previous = previousManualResult(fields, key, origin)
    const previousKey = `${key}_manual_anterior`
    if (previous !== null && !hasValue(normalized[previousKey])) normalized[previousKey] = previous
    normalized[key] = results[key].value === null ? '' : String(results[key].value)
    normalized[`${key}_origen`] = origin
  }
  return normalized
}
