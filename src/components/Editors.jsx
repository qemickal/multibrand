import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ClipboardList, Grid2X2, ShieldAlert, X } from 'lucide-react'
import { createId, PRIORITIES, RISK_STATUSES, sortBrands, TASK_STATUSES, validateRisk, validateTask } from '../lib/workspace.js'

function ModalFrame({ title, eyebrow, icon: Icon, onClose, saving, children, onSubmit, submitLabel }) {
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  const savingRef = useRef(saving)
  closeRef.current = onClose
  savingRef.current = saving

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => panel.current?.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])')?.focus(), 0)
    function handleKey(event) {
      if (event.key === 'Escape' && !savingRef.current) closeRef.current()
      if (event.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(item => item.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [])

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={panel}>
      <form onSubmit={onSubmit} className="editor-form">
        <div className="modal-header"><span className="modal-icon"><Icon size={20} /></span><div><div className="modal-eyebrow">{eyebrow}</div><h2 id="modal-title">{title}</h2></div><button type="button" className="icon-button modal-close" onClick={onClose} disabled={saving} aria-label="Cerrar"><X size={20} /></button></div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer"><span>Los campos con <b>*</b> son obligatorios</span><div><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando...' : submitLabel}</button></div></div>
      </form>
    </div>
  </div>
}

function FormError({ children }) {
  const errorRef = useRef(null)
  useEffect(() => { if (children) errorRef.current?.focus() }, [children])
  return children ? <div className="form-error" role="alert" tabIndex={-1} ref={errorRef}><AlertCircle size={17} />{children}</div> : null
}

function Field({ label, name, value, onChange, required, children, hint, ...props }) {
  return <label className="form-field"><span>{label}{required && <b> *</b>}</span>{children || <input name={name} value={value ?? ''} onChange={onChange} {...props} />}{hint && <small>{hint}</small>}</label>
}

function TextArea({ name, value, onChange, rows = 3, ...props }) {
  return <textarea name={name} value={value ?? ''} onChange={onChange} rows={rows} {...props} />
}

export function TaskEditor({ task, brands, onClose, onSave, saving, error }) {
  const isNew = !task
  const [form, setForm] = useState(() => task ? { ...task, estado: task.estado || 'Pendiente', prioridad: task.prioridad || 'Alta', fecha: task.fecha || '' } : {
    id: createId('T'), marca: sortBrands(brands)[0]?.nombre || '', fase: '', frente: '', tarea: '', criterio: '', responsable: '', estado: 'Pendiente', prioridad: 'Alta', fecha: '', evidencia: '', notas: '',
  })
  const [validationError, setValidationError] = useState('')
  const update = event => { setValidationError(''); setForm(current => ({ ...current, [event.target.name]: event.target.value })) }
  const submit = event => {
    event.preventDefault()
    const fields = ['id', 'marca', 'fase', 'frente', 'tarea', 'criterio', 'responsable', 'estado', 'prioridad', 'fecha', 'evidencia', 'notas']
    const record = Object.fromEntries(fields.map(field => [field, typeof form[field] === 'string' ? form[field].trim() : form[field] ?? '']))
    record.fecha = record.fecha || null
    const message = validateTask(record)
    if (message) { setValidationError(message); return }
    setValidationError('')
    onSave(record, isNew)
  }
  return <ModalFrame title={isNew ? 'Crear tarea' : 'Detalle de tarea'} eyebrow={isNew ? 'UN NUEVO PASO' : task.id} icon={ClipboardList} onClose={onClose} saving={saving} onSubmit={submit} submitLabel={isNew ? 'Crear tarea' : 'Guardar cambios'}>
    <p className="modal-intro">{isNew ? 'Agrega lo que necesitas hacer para seguir avanzando.' : 'Organiza la información y actualiza el avance de esta tarea.'}</p>
    <FormError>{validationError || error}</FormError>
    <Field label="Nombre de la tarea" name="tarea" value={form.tarea} onChange={update} required placeholder="¿Qué hay que hacer?" />
    <div className="form-grid">
      <Field label="Marca" required><select name="marca" value={form.marca} onChange={update}><option value="">Selecciona una marca</option>{sortBrands(brands).map(brand => <option key={brand.id} value={brand.nombre}>{brand.nombre}</option>)}</select></Field>
      <Field label="Frente de trabajo" name="frente" value={form.frente} onChange={update} placeholder="Ej. Identidad" />
    </div>
    <Field label="Criterio de cierre"><TextArea name="criterio" value={form.criterio} onChange={update} placeholder="¿Qué debe estar listo para completar esta tarea?" /></Field>
    <div className="form-grid">
      <Field label="Estado"><select name="estado" value={form.estado} onChange={update}>{TASK_STATUSES.map(status => <option key={status}>{status}</option>)}</select></Field>
      <Field label="Prioridad"><select name="prioridad" value={form.prioridad || 'Alta'} onChange={update}>{PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select></Field>
      <Field label="Responsable" name="responsable" value={form.responsable} onChange={update} placeholder="Nombre de la persona" />
      <Field label="Fecha límite" name="fecha" value={form.fecha} onChange={update} type="date" />
    </div>
    <Field label="Evidencia o enlace" name="evidencia" value={form.evidencia} onChange={update} required={form.estado === 'Hecho'} placeholder="Enlace o descripción de la evidencia" hint="Necesaria para marcar la tarea como hecha." />
    <Field label="Notas" required={form.estado === 'No aplica'} hint="Si la tarea no aplica, documenta aquí la razón."><TextArea name="notas" value={form.notas} onChange={update} placeholder="Agrega contexto o una razón" /></Field>
    <Field label="Fase" name="fase" value={form.fase} onChange={update} placeholder="Ej. Preparación por marca" />
  </ModalFrame>
}

export function RiskEditor({ risk, onClose, onSave, saving, error }) {
  const isNew = !risk
  const [form, setForm] = useState(() => risk ? { ...risk, estado: risk.estado || 'Abierto', probabilidad: risk.probabilidad || 'Media', impacto: risk.impacto || 'Media' } : { id: createId('R'), area: '', riesgo: '', probabilidad: 'Media', impacto: 'Media', mitigacion: '', responsable: '', estado: 'Abierto' })
  const [validationError, setValidationError] = useState('')
  const update = event => { setValidationError(''); setForm(current => ({ ...current, [event.target.name]: event.target.value })) }
  const submit = event => {
    event.preventDefault()
    const fields = ['id', 'area', 'riesgo', 'probabilidad', 'impacto', 'mitigacion', 'responsable', 'estado']
    const record = Object.fromEntries(fields.map(field => [field, typeof form[field] === 'string' ? form[field].trim() : form[field] ?? '']))
    const message = validateRisk(record)
    if (message) { setValidationError(message); return }
    setValidationError('')
    onSave(record, isNew)
  }
  return <ModalFrame title={isNew ? 'Registrar riesgo' : 'Detalle del riesgo'} eyebrow={isNew ? 'MEJOR PREVENIR' : risk.id} icon={ShieldAlert} onClose={onClose} saving={saving} onSubmit={submit} submitLabel={isNew ? 'Guardar riesgo' : 'Guardar cambios'}>
    <p className="modal-intro">Anticiparse es otra forma de cuidar tus ideas.</p><FormError>{validationError || error}</FormError>
    <Field label="Área" name="area" value={form.area} onChange={update} required placeholder="Ej. Producción, finanzas o calidad" />
    <Field label="¿Cuál es el riesgo?" required><TextArea name="riesgo" value={form.riesgo} onChange={update} placeholder="Describe qué podría pasar" /></Field>
    <div className="form-grid">
      <Field label="Probabilidad"><select name="probabilidad" value={form.probabilidad} onChange={update}>{['Alta', 'Media', 'Baja'].map(value => <option key={value}>{value}</option>)}</select></Field>
      <Field label="Impacto"><select name="impacto" value={form.impacto} onChange={update}>{['Alta', 'Media', 'Baja'].map(value => <option key={value}>{value}</option>)}</select></Field>
    </div>
    <Field label="Acción de mitigación"><TextArea name="mitigacion" value={form.mitigacion} onChange={update} placeholder="¿Qué puedes hacer para prevenirlo o reducirlo?" /></Field>
    <div className="form-grid"><Field label="Responsable" name="responsable" value={form.responsable} onChange={update} placeholder="Nombre de la persona" /><Field label="Estado"><select name="estado" value={form.estado} onChange={update}>{RISK_STATUSES.map(status => <option key={status}>{status}</option>)}</select></Field></div>
  </ModalFrame>
}

export function BrandEditor({ brand, onClose, onSave, saving, error }) {
  const [form, setForm] = useState(() => ({ id: brand.id, nombre: brand.nombre, rol: brand.rol || '', mercado: brand.mercado || '' }))
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = event => {
    event.preventDefault()
    onSave({ ...form, rol: form.rol.trim(), mercado: form.mercado.trim() }, false)
  }
  return <ModalFrame title="Información de marca" eyebrow={brand.id} icon={Grid2X2} onClose={onClose} saving={saving} onSubmit={submit} submitLabel="Guardar cambios">
    <p className="modal-intro">Define qué hace esta marca y a quién se dirige.</p><FormError>{error}</FormError>
    <Field label="Nombre de la marca" name="nombre" value={form.nombre} readOnly hint="El nombre vincula la marca con sus tareas y no se puede cambiar aquí." />
    <Field label="Rol o propuesta" name="rol" value={form.rol} onChange={update} placeholder="¿Qué hace esta marca?" />
    <Field label="Mercado o público"><TextArea name="mercado" value={form.mercado} onChange={update} placeholder="¿A quién se dirige?" /></Field>
  </ModalFrame>
}
