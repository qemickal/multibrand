import { useState } from 'react'
import { Calculator, FileText, Trash2 } from 'lucide-react'
import { MODULE_BY_ID, validateModuleFields } from '../lib/modules.js'
import { calculatedCostFieldsChanged, calculateCostResults, formatContributionMargin, formatVariableCost, prepareCostFields, previousManualContribution, previousManualMargin, previousManualPriceWithRate, previousManualSuggestedPrice, previousManualVariableCost } from '../lib/costeo.js'
import { calculateMonthlyExpense, prepareExpenseFields, previousManualMonthlyExpense } from '../lib/gastos.js'
import { calculateReading, calculateWeightedScore, preparePrioritizationFields, previousManualReading, previousManualWeightedScore } from '../lib/priorizacion.js'
import { createId, sortBrands } from '../lib/workspace.js'
import { Field, FormError, ModalFrame, TextArea } from './Editors.jsx'

export default function RecordEditor({ moduleId, record, brands, onClose, onSave, onDelete, saving, error }) {
  const module = MODULE_BY_ID[moduleId]
  const isNew = !record
  const [id] = useState(() => record?.id || createId('REG'))
  const [fields, setFields] = useState(() => ({ ...(record?.campos || {}) }))
  const [validationError, setValidationError] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const update = event => {
    setValidationError('')
    setReviewed(false)
    setFields(current => ({ ...current, [event.target.name]: event.target.value }))
  }
  const costResults = module.id === 'costeo' ? calculateCostResults(fields) : null
  const monthlyExpense = module.id === 'gastos' ? calculateMonthlyExpense(fields) : null
  const priorityScore = module.id === 'priorizacion' ? calculateWeightedScore(fields) : null
  const priorityReading = module.id === 'priorizacion' ? calculateReading(fields, priorityScore) : null
  const calculatedFields = costResults || (monthlyExpense ? { mensual: monthlyExpense } : priorityScore ? { puntaje_ponderado: priorityScore, lectura: priorityReading } : {})
  const previousManualValues = costResults ? { costo_variable: previousManualVariableCost(fields), precio_sugerido: previousManualSuggestedPrice(fields), precio_con_tasa: previousManualPriceWithRate(fields), contribucion_unidad: previousManualContribution(fields), margen_real: previousManualMargin(fields) } : monthlyExpense ? { mensual: previousManualMonthlyExpense(fields) } : priorityScore ? { puntaje_ponderado: previousManualWeightedScore(fields), lectura: previousManualReading(fields) } : {}
  const manualFields = module.fields.filter(field => field.manual)
  const hasManualValues = manualFields.some(field => String(fields[field.key] ?? '').trim())
  const inputsChanged = module.fields.some(field => !field.manual && !field.calculated && String(fields[field.key] ?? '').trim() !== String(record?.campos?.[field.key] ?? '').trim())
  const calculatedChanged = Boolean(hasManualValues && record && costResults && calculatedCostFieldsChanged(record.campos, costResults))
  const needsReview = hasManualValues && (isNew || inputsChanged || calculatedChanged)
  const submit = event => {
    event.preventDefault()
    // G5 compares the period text exactly (apart from case); do not trim it
    // after calculating, or a saved value could disagree with its result.
    let normalized = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, typeof value === 'string' && !(module.id === 'gastos' && key === 'periodicidad') ? value.trim() : value]))
    const message = validateModuleFields(module, normalized)
    if (message) { setValidationError(message); return }
    const calculationError = Object.values(calculatedFields).find(result => result.error)?.error
    if (calculationError) { setValidationError(calculationError); return }
    if (needsReview && !reviewed) { setValidationError('Confirma que revisaste los resultados capturados manualmente antes de guardar.'); return }
    setValidationError('')
    if (costResults) normalized = prepareCostFields(normalized, costResults)
    if (monthlyExpense) normalized = prepareExpenseFields(normalized, monthlyExpense)
    if (priorityScore) normalized = preparePrioritizationFields(normalized, priorityScore, priorityReading)
    onSave({ id, modulo: module.id, campos: normalized }, isNew)
  }
  const remove = () => {
    if (window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) onDelete(record)
  }
  return <ModalFrame title={`${isNew ? 'Agregar' : 'Editar'} ${module.singular}`} eyebrow={module.title.toLocaleUpperCase('es')} icon={module.formulaNotice ? Calculator : FileText} onClose={onClose} saving={saving} onSubmit={submit} submitLabel={isNew ? 'Agregar registro' : 'Guardar cambios'}>
    <p className="modal-intro">{module.description}</p>
    {module.formulaNotice && <div className="data-notice warning" role="note"><Calculator size={17} /><span>{costResults ? 'El costo, los precios, la contribución y el margen se calculan con las fórmulas compartidas. Verifica los importes y porcentajes antes de usar los resultados.' : monthlyExpense ? 'El equivalente mensual se calcula con la fórmula compartida. Si la periodicidad no coincide, el resultado es cero; verifica los datos antes de usarlos.' : priorityScore ? 'El puntaje y la lectura se calculan con las calificaciones y el riesgo crítico según las fórmulas compartidas.' : <>Los resultados señalados como <strong>manuales</strong> no se calculan ni actualizan automáticamente. Revisa los valores antes de usarlos.</>}</span></div>}
    {module.id === 'priorizacion' && fields.riesgo_critico === 'Sí' && <div className="data-notice warning" role="status"><span><strong>Riesgo crítico abierto.</strong> No se debe recomendar el lanzamiento, independientemente del puntaje.</span></div>}
    <FormError>{validationError || error}</FormError>
    <div className="module-form-grid">{module.fields.map(field => {
      const calculated = field.calculated ? calculatedFields[field.key] : null
      const previousManual = previousManualValues[field.key] ?? null
      const value = calculated ? (field.key === 'lectura' ? (calculated.value ?? '') : field.format === 'percent' ? formatContributionMargin(calculated.value) : formatVariableCost(calculated.value)) : fields[field.key] ?? ''
      const label = `${field.label}${field.manual ? ' · manual' : field.calculated ? ' · automático' : ''}`
      const hint = calculated && previousManual !== null ? `${field.hint} Valor manual anterior conservado: ${previousManual}${field.format === 'percent' ? ' %' : ''}. No se usa en el cálculo.` : field.hint
      const options = field.type === 'brand' ? sortBrands(brands).map(brand => brand.nombre) : field.options
      const inputProps = { name: field.key, value, onChange: update, 'aria-required': field.required || undefined }
      return <div key={field.key} className={field.type === 'textarea' ? 'form-wide' : ''}>
        <Field label={label} required={field.required} hint={hint}>
          {field.type === 'textarea' ? <TextArea {...inputProps} /> :
            field.readOnly ? <input {...inputProps} readOnly /> :
            field.type === 'brand' || field.type === 'select' ? <select {...inputProps}><option value="">Seleccionar</option>{value && !options.includes(value) && <option value={value}>{value}</option>}{options.map(option => <option value={option} key={option}>{option}</option>)}</select> :
            <input {...inputProps} type={field.inputType || field.type} min={field.min} max={field.max} step={field.step} inputMode={field.type === 'number' ? 'decimal' : undefined} />}
        </Field>
        {(calculated?.warning || calculated?.error) && <p className="computed-warning" role="status">{calculated.warning || calculated.error}</p>}
      </div>
    })}</div>
    {needsReview && <label className="manual-confirm"><input type="checkbox" checked={reviewed} onChange={event => { setValidationError(''); setReviewed(event.target.checked) }} /><span>Revisé los resultados manuales con los datos actuales. Entiendo que no se recalculan automáticamente.</span></label>}
    {!isNew && !module.fixed && <div className="record-delete"><button type="button" disabled={saving} onClick={remove}><Trash2 size={15} /> Eliminar este registro</button><small>Se pedirá confirmación antes de eliminar.</small></div>}
  </ModalFrame>
}
