// Formula provided for PRIORIZACION!G13, repeated down the G column:
// =SI(CONTAR(B13:F13)<5,"",B13*25%+C13*25%+D13*20%+E13*20%+F13*10%)
export const PRIORITY_WEIGHTS = [
  ['demanda', 0.25], ['economia', 0.25], ['operacion', 0.20],
  ['producto', 0.20], ['diferenciacion', 0.10],
]

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== ''

function numericInput(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

export function calculateWeightedScore(fields) {
  const numbers = PRIORITY_WEIGHTS.map(([key]) => numericInput(fields[key]))
  if (numbers.some(value => value === null)) return { value: null, error: '' }
  const score = PRIORITY_WEIGHTS.reduce((sum, [, weight], index) => sum + numbers[index] * weight, 0)
  if (!Number.isFinite(score)) return { value: null, error: 'El puntaje ponderado excede el rango permitido. Revisa las calificaciones.' }
  return { value: Object.is(score, -0) ? 0 : score, error: '' }
}

// Formula provided for PRIORIZACION!I13, repeated down the I column:
// =SI(G13="","Completar evaluación",SI(H13="Sí","No lanzar: riesgo abierto",SI(G13>=4,"Candidata prioritaria",SI(G13>=3,"Segunda ronda","No priorizar todavía"))))
export function calculateReading(fields, score = calculateWeightedScore(fields)) {
  if (score.error) return { value: null, error: score.error }
  if (score.value === null) return { value: 'Completar evaluación', error: '' }
  const riesgo = String(fields.riesgo_critico ?? '').trim()
  if (riesgo === 'Sí') return { value: 'No lanzar: riesgo abierto', error: '' }
  // Tolerate binary floating-point rounding (e.g. 3.9999999999999996 for an exact 4).
  const eps = 1e-10
  if (score.value + eps >= 4) return { value: 'Candidata prioritaria', error: '' }
  if (score.value + eps >= 3) return { value: 'Segunda ronda', error: '' }
  return { value: 'No priorizar todavía', error: '' }
}

export function previousManualWeightedScore(fields) {
  if (hasValue(fields.puntaje_ponderado_manual_anterior)) return fields.puntaje_ponderado_manual_anterior
  if (fields.puntaje_ponderado_origen !== 'formula_G13' && hasValue(fields.puntaje_ponderado)) return fields.puntaje_ponderado
  return null
}

export function previousManualReading(fields) {
  if (hasValue(fields.lectura_manual_anterior)) return fields.lectura_manual_anterior
  if (fields.lectura_origen !== 'formula_I13' && hasValue(fields.lectura)) return fields.lectura
  return null
}

// A new formula can change a score on opening an older record even if the
// user has not edited its inputs. The dependent manual reading needs review.
export function weightedScoreChanged(previous, score) {
  const before = previous?.puntaje_ponderado
  if (score.value === null) return hasValue(before)
  return !hasValue(before) || !Number.isFinite(Number(before)) || Number(before) !== score.value
}

export function readingChanged(previous, reading) {
  const before = previous?.lectura
  if (reading.value === null) return hasValue(before)
  return !hasValue(before) || String(before).trim() !== String(reading.value).trim()
}

export function prioritizationOutputsChanged(previous, score, reading) {
  return weightedScoreChanged(previous, score) || readingChanged(previous, reading)
}

export function preparePrioritizationFields(fields, score = calculateWeightedScore(fields), reading = calculateReading(fields, score)) {
  if (score.error) throw new Error(score.error)
  if (reading.error) throw new Error(reading.error)
  const normalized = { ...fields }
  const previousScore = previousManualWeightedScore(fields)
  if (previousScore !== null && !hasValue(normalized.puntaje_ponderado_manual_anterior)) normalized.puntaje_ponderado_manual_anterior = previousScore
  normalized.puntaje_ponderado = score.value === null ? '' : String(score.value)
  normalized.puntaje_ponderado_origen = 'formula_G13'

  const previousReading = previousManualReading(fields)
  // Preserve only when the calculated value differs, to avoid capturing the
  // seed's initial "Completar evaluación" as spurious history.
  if (previousReading !== null && !hasValue(normalized.lectura_manual_anterior) && String(previousReading).trim() !== String(reading.value).trim()) normalized.lectura_manual_anterior = previousReading
  normalized.lectura = reading.value
  normalized.lectura_origen = 'formula_I13'
  return normalized
}
