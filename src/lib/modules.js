// Field names follow the HTML export. Result cells stay manual until their
// original formulas are provided and verified.
const text = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra })
const area = (key, label, extra = {}) => ({ key, label, type: 'textarea', ...extra })
const date = (key, label, extra = {}) => ({ key, label, type: 'date', ...extra })
const number = (key, label, extra = {}) => ({ key, label, type: 'number', min: 0, step: 'any', ...extra })
const percent = (key, label, extra = {}) => number(key, label, { max: 100, hint: 'Escribe 15 para indicar 15 %.', ...extra })
const brand = (key = 'marca', extra = {}) => ({ key, label: 'Marca', type: 'brand', ...extra })
const manual = { manual: true, hint: 'Valor capturado manualmente; no se actualiza al cambiar los datos.' }

export const MODULES = [
  {
    id: 'matriz', title: 'Catálogo matriz', singular: 'servicio', icon: 'matriz', eyebrow: 'CAPACIDADES B2B',
    description: 'Servicios y procesos que Mono Cromat puede ofrecer o coordinar.',
    note: 'No publiques un servicio hasta validar costo, calidad, capacidad y plazo.',
    titleField: 'servicio', summary: ['codigo', 'familia', 'estado'],
    fields: [text('codigo', 'ID servicio'), text('familia', 'Familia'), text('servicio', 'Servicio / capacidad', { required: true }), area('descripcion', 'Descripción comercial'), text('proceso', 'Proceso / técnica'), text('materiales', 'Materiales compatibles'), text('formatos', 'Formatos / límites'), text('lote_minimo', 'Lote mínimo'), text('tiempo', 'Tiempo estándar'), area('criterio', 'Criterio de calidad'), text('metodo_precio', 'Método de precio'), text('estado', 'Estado'), area('notas', 'Notas')],
  },
  {
    id: 'productos', title: 'Productos por marca', singular: 'producto', icon: 'productos', eyebrow: 'CATÁLOGO DE MARCAS',
    description: 'Una ficha por producto o variante vendible, con sus especificaciones.',
    note: 'Completa las especificaciones, presentación, empaque y SKU antes de costear y publicar.',
    titleField: 'producto', summary: ['sku', 'marca', 'variante', 'estado'],
    fields: [text('sku', 'SKU'), brand(), text('coleccion', 'Colección'), text('producto', 'Producto', { required: true }), text('categoria', 'Categoría'), text('variante', 'Variante'), text('formato', 'Formato / dimensiones'), text('material', 'Material'), text('acabado', 'Acabado'), area('contenido', 'Contenido del paquete'), text('empaque', 'Empaque / presentación'), text('proceso_proveedor', 'Proceso / proveedor'), text('lote_inicial', 'Lote inicial'), text('tiempo_reposicion', 'Tiempo de reposición'), text('estado', 'Estado'), text('foto_ficha', 'Foto / ficha', { hint: 'Puedes guardar una descripción o enlace; los archivos no se adjuntan aquí.' }), area('notas', 'Notas')],
  },
  {
    id: 'costeo', title: 'Costeo y precios', singular: 'costeo', icon: 'costeo', eyebrow: 'ECONOMÍA UNITARIA',
    description: 'Captura costos unitarios reales por SKU y canal.',
    note: 'El precio sugerido es una referencia; valida impuestos, estrategia comercial y redondeo antes de publicarlo.',
    formulaNotice: true, titleField: 'producto_variante', summary: ['sku', 'marca', 'canal'],
    fields: [text('sku', 'SKU'), brand(), text('producto_variante', 'Producto / variante', { required: true }), number('materiales', 'Materiales', { min: undefined }), number('impresion', 'Impresión / producción', { min: undefined }), number('acabados', 'Acabados', { min: undefined }), number('mano_obra', 'Mano de obra', { min: undefined }), number('empaque', 'Empaque', { min: undefined }), number('flete', 'Flete / insumos', { min: undefined }), number('servicios_externos', 'Servicios externos', { min: undefined }), percent('merma', 'Merma %', { min: undefined, max: undefined }), number('otros_variables', 'Otros variables', { min: undefined }), number('costo_variable', 'Costo variable unitario', { calculated: true, readOnly: true, hint: 'Se calcula con los costos y la merma. Se muestran dos decimales; la precisión completa se conserva.' }), percent('comision_canal', 'Comisión canal %', { min: undefined, max: undefined }), percent('comision_pago', 'Comisión pago %', { min: undefined, max: undefined }), percent('margen_objetivo', 'Margen objetivo %', { min: undefined, max: undefined }), number('precio_sugerido', 'Precio sugerido sin impuestos', { calculated: true, readOnly: true, hint: 'Se calcula con el costo, las comisiones y el margen objetivo. Se muestran dos decimales; la precisión completa se conserva.' }), percent('tasa', 'Tasa aplicable %', { min: undefined, max: undefined }), number('precio_con_tasa', 'Precio referencia con tasa', { calculated: true, readOnly: true, hint: 'Se calcula con el precio sugerido y la tasa aplicable. Se muestran dos decimales; la precisión completa se conserva.' }), number('contribucion_unidad', 'Contribución por unidad', { calculated: true, readOnly: true, hint: 'Se calcula con el precio sugerido sin impuestos, las comisiones y el costo variable. Se muestran dos decimales; la precisión completa se conserva.' }), number('margen_real', 'Margen contribución real %', { calculated: true, readOnly: true, format: 'percent', hint: 'Se calcula con la contribución y el precio sugerido; queda vacío si el cálculo da error. Se muestra con un decimal y conserva toda su precisión.' }), text('canal', 'Canal'), date('fecha_revision', 'Fecha revisión'), area('notas', 'Notas')],
  },
  {
    id: 'gastos', title: 'Gastos fijos', singular: 'gasto', icon: 'gastos', eyebrow: 'PRESUPUESTO RECURRENTE',
    description: 'Registra los gastos de la casa matriz, marcas o unidades compartidas.',
    note: 'Mantén separados los gastos fijos y los costos variables unitarios.',
    formulaNotice: true, titleField: 'concepto', summary: ['codigo', 'alcance', 'periodicidad'],
    fields: [text('codigo', 'ID'), text('alcance', 'Alcance'), text('concepto', 'Concepto', { required: true }), text('proveedor', 'Proveedor'), number('importe', 'Importe del periodo', { min: undefined }), text('periodicidad', 'Periodicidad', { hint: 'Mensual, Anual, Semanal, Diario, Trimestral o Semestral, sin espacios adicionales.' }), number('mensual', 'Equivalente mensual', { calculated: true, readOnly: true, hint: 'Se calcula con el importe y la periodicidad; la fórmula devuelve 0 si no coincide la periodicidad. Se muestran dos decimales y se conserva la precisión.' }), date('vencimiento', 'Próximo vencimiento'), text('forma_pago', 'Forma de pago'), text('responsable', 'Responsable'), { key: 'esencial', label: '¿Esencial?', type: 'select', options: ['Sí', 'No'] }, area('notas', 'Notas')],
  },
  {
    id: 'proveedores', title: 'Proveedores', singular: 'proveedor', icon: 'proveedores', eyebrow: 'DIRECTORIO Y EVALUACIÓN',
    description: 'Contactos, condiciones y evidencia de calidad de tus proveedores.',
    note: 'Incluye proveedor principal y alterno para cada insumo o proceso crítico.',
    titleField: 'proveedor', summary: ['codigo', 'categoria', 'estado'],
    fields: [text('codigo', 'ID'), text('proveedor', 'Proveedor', { required: true }), text('categoria', 'Categoría / insumo'), text('contacto', 'Contacto'), text('correo', 'Correo', { inputType: 'email' }), text('telefono', 'Teléfono', { inputType: 'tel' }), text('ciudad_envio', 'Ciudad / envío'), text('minimo_compra', 'Mínimo de compra'), text('tiempo_entrega', 'Tiempo de entrega'), text('condiciones_pago', 'Condiciones de pago'), text('alterno', 'Proveedor alterno'), text('calidad', 'Calidad evaluada'), text('ultima_cotizacion', 'Última cotización'), text('estado', 'Estado'), area('notas', 'Notas')],
  },
  {
    id: 'operacion', title: 'Operación', singular: 'paso', icon: 'operacion', eyebrow: 'FLUJO DE PEDIDO',
    description: 'Una guía para organizar el trabajo desde la consulta hasta la postventa.',
    note: 'Adapta el flujo a cada marca y asigna responsable y evidencia por pedido o lote.',
    titleField: 'etapa', summary: ['paso', 'responsable', 'estado'],
    fields: [text('paso', 'Paso'), text('etapa', 'Etapa', { required: true }), area('que_ocurre', 'Qué ocurre'), area('criterio_salida', 'Criterio de salida'), text('responsable', 'Responsable'), text('registro', 'Registro / formato'), text('estado', 'Estado'), area('notas', 'Notas')],
  },
  {
    id: 'decisiones', title: 'Decisiones', singular: 'decisión', icon: 'decisiones', eyebrow: 'BITÁCORA DE CAMBIOS',
    description: 'Deja rastro de decisiones, motivos, aprobaciones e impactos.',
    note: 'Úsala para cambios de nombre, precio, proveedor, acabado, alcance, política o fecha de lanzamiento.',
    titleField: 'decision', summary: ['codigo', 'fecha', 'alcance', 'estado'],
    fields: [text('codigo', 'ID'), date('fecha', 'Fecha'), text('alcance', 'Marca / alcance'), text('tema', 'Tema'), area('decision', 'Decisión tomada', { required: true }), area('motivo', 'Motivo / evidencia'), area('impacto', 'Impacto en costos / catálogo / operación'), text('aprobo', 'Aprobó'), text('responsable', 'Responsable de ejecutar'), date('fecha_compromiso', 'Fecha compromiso'), text('estado', 'Estado'), area('notas', 'Notas')],
  },
  {
    id: 'priorizacion', title: 'Priorización de marcas', singular: 'evaluación', icon: 'priorizacion', eyebrow: 'SELECCIÓN DE MARCA PILOTO',
    description: 'Compara la preparación de cada marca con puntuaciones y evidencia.',
    note: 'Un riesgo crítico abierto impide recomendar el lanzamiento, independientemente del puntaje. La puntuación no es una autorización.',
    formulaNotice: true, fixed: true, titleField: 'marca', summary: ['riesgo_critico', 'puntaje_ponderado', 'lectura'],
    fields: [brand('marca', { readOnly: true }), number('demanda', 'Demanda (1–5)', { min: 1, max: 5 }), number('economia', 'Economía (1–5)', { min: 1, max: 5 }), number('operacion', 'Operación (1–5)', { min: 1, max: 5 }), number('producto', 'Producto (1–5)', { min: 1, max: 5 }), number('diferenciacion', 'Diferenciación / derechos (1–5)', { min: 1, max: 5 }), number('puntaje_ponderado', 'Puntaje ponderado', { calculated: true, readOnly: true, hint: 'Se calcula cuando las cinco calificaciones están completas. Se muestran dos decimales y se conserva la precisión.' }), { key: 'riesgo_critico', label: '¿Riesgo crítico abierto?', type: 'select', options: ['Sí', 'No'] }, text('lectura', 'Lectura', { calculated: true, readOnly: true, hint: 'Se calcula con el puntaje y el riesgo crítico. Revisa los valores manuales anteriores conservados si existen.' }), area('evidencia', 'Evidencia / observaciones')],
  },
  {
    id: 'equilibrio', title: 'Punto de equilibrio', singular: 'plan', icon: 'equilibrio', eyebrow: 'PLANIFICACIÓN POR MARCA',
    description: 'Organiza los datos necesarios para planear el equilibrio de cada marca.',
    note: 'Asigna cada gasto fijo una sola vez y reconcilia la suma asignada con el total mensual. La contribución prevista menos fijos no equivale a utilidad neta.',
    formulaNotice: true, fixed: true, titleField: 'marca', summary: ['fijos_asignados', 'margen_medio', 'meta_ventas'],
    fields: [brand('marca', { readOnly: true }), number('fijos_asignados', 'Fijos mensuales asignados'), percent('margen_medio', 'Margen contribución medio %'), number('ventas_equilibrio', 'Ventas necesarias para equilibrio', manual), number('contribucion_unidad', 'Contribución media por unidad'), number('unidades_equilibrio', 'Unidades necesarias para equilibrio', manual), number('meta_ventas', 'Meta de ventas mensual'), number('contribucion_prevista', 'Contribución prevista menos fijos', { ...manual, min: undefined })],
  },
]

export const MODULE_BY_ID = Object.fromEntries(MODULES.map(module => [module.id, module]))

export function validateModuleFields(module, fields) {
  for (const field of module.fields) {
    if (field.calculated) continue
    const value = String(fields[field.key] ?? '').trim()
    if (field.required && !value) return `Completa ${field.label.toLocaleLowerCase('es')}.`
    if (value && field.type === 'number') {
      const amount = Number(value)
      if (!Number.isFinite(amount) || (field.min != null && amount < field.min) || (field.max != null && amount > field.max) || (field.step === '1' && !Number.isInteger(amount))) {
        const bounds = field.min != null && field.max != null ? ` entre ${field.min} y ${field.max}` : field.min != null ? ` mayor o igual a ${field.min}` : ''
        return `Escribe un número válido${bounds} en ${field.label}.`
      }
    }
  }
  return ''
}
