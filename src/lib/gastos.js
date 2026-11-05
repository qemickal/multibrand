// Formula provided for GASTOS_FIJOS!G5:
// =SI(F5="Mensual",E5,SI(F5="Anual",E5/12,SI(F5="Semanal",E5*52/12,
//   SI(F5="Diario",E5*30,SI(F5="Trimestral",E5/3,SI(F5="Semestral",E5/6,0))))))
const PERIOD_CALCULATIONS = new Map([
  ['mensual', amount => amount],
  ['anual', amount => amount / 12],
  ['semanal', amount => amount * 52 / 12],
  ['diario', amount => amount * 30],
  ['trimestral', amount => amount / 3],
  ['semestral', amount => amount / 6],
])

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== ''

export function calculateMonthlyExpense(fields) {
  // Excel text comparisons are case-insensitive, but extra spaces are not
  // ignored. Keep the original text so the stored result and input agree.
  const period = String(fields.periodicidad ?? '').toLocaleLowerCase('es-MX')
  const calculate = PERIOD_CALCULATIONS.get(period)
  const amountProvided = hasValue(fields.importe)
  if (!calculate) {
    return {
      value: 0,
      error: '',
      warning: amountProvided || hasValue(fields.periodicidad)
        ? 'La periodicidad no coincide con las opciones de la fórmula. El equivalente mensual es 0; revisa el texto y los espacios.'
        : '',
    }
  }
  const amount = amountProvided ? Number(fields.importe) : 0
  if (!Number.isFinite(amount)) return { value: null, error: 'Revisa el importe del periodo para calcular el equivalente mensual.', warning: '' }
  // Keep the spreadsheet's operation order: weekly is E5*52/12.
  const monthly = calculate(amount)
  if (!Number.isFinite(monthly)) return { value: null, error: 'El equivalente mensual excede el rango permitido. Revisa el importe y la periodicidad.', warning: '' }
  return {
    value: Object.is(monthly, -0) ? 0 : monthly,
    error: '',
    warning: amountProvided ? '' : 'El importe está vacío; la fórmula devuelve 0. Captura un importe para registrar el gasto.',
  }
}

export function previousManualMonthlyExpense(fields) {
  if (hasValue(fields.mensual_manual_anterior)) return fields.mensual_manual_anterior
  if (fields.mensual_origen !== 'formula_G5' && hasValue(fields.mensual)) return fields.mensual
  return null
}

export function prepareExpenseFields(fields, monthly = calculateMonthlyExpense(fields)) {
  if (monthly.error) throw new Error(monthly.error)
  const normalized = { ...fields }
  const previous = previousManualMonthlyExpense(fields)
  if (previous !== null && !hasValue(normalized.mensual_manual_anterior)) normalized.mensual_manual_anterior = previous
  normalized.mensual = String(monthly.value)
  normalized.mensual_origen = 'formula_G5'
  return normalized
}

// PANEL!E8 = SUMA(GASTOS_FIJOS!G5:G104): the source range has 100 rows.
// The app has records rather than worksheet row positions. Up to 100 records
// all fit; above that, do not silently choose which expenses to exclude.
export const PANEL_EXPENSE_LIMIT = 100

export function calculateMonthlyExpenseTotal(records) {
  const expenses = records.filter(record => record.modulo === 'gastos')
    .slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const count = expenses.length
  if (count > PANEL_EXPENSE_LIMIT) {
    return { value: null, count, incomplete: 0, legacy: 0, error: `La fórmula original abarca 100 filas (G5:G104), pero hay ${count} gastos. El total no se muestra para evitar omitir registros.` }
  }
  let total = 0
  let incomplete = 0
  let legacy = 0
  let errors = 0
  let overflow = false
  for (const record of expenses) {
    const fields = record.campos || {}
    const monthly = calculateMonthlyExpense(fields)
    if (!hasValue(fields.importe) || !hasValue(fields.periodicidad) || monthly.warning) incomplete += 1
    if (fields.mensual_origen !== 'formula_G5' && hasValue(fields.mensual)) legacy += 1
    if (monthly.error) { errors += 1; continue }
    total += monthly.value
    if (!Number.isFinite(total)) overflow = true
  }
  if (errors) {
    return { value: null, count, incomplete, legacy, error: `No se pudo calcular el equivalente mensual de ${errors} ${errors === 1 ? 'gasto' : 'gastos'}. Revisa los importes y las periodicidades.` }
  }
  if (overflow) return { value: null, count, incomplete, legacy, error: 'La suma mensual excede el rango permitido. Revisa los importes.' }
  return { value: Object.is(total, -0) ? 0 : total, count, incomplete, legacy, error: '' }
}
