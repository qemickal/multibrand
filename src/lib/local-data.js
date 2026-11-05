import demoData from './demo-data.json' with { type: 'json' }
import workbookData from './workbook-data.json' with { type: 'json' }
import { readStoredWorkspace, writeStoredWorkspace } from './storage.js'

export const LOCAL_KEY = 'mono-cromat-preapertura-local-v1'

// Augment the old workspace in memory without modifying stored data until a
// user saves. Never replace an existing collection, even an empty one.
export function hydrateWorkbookData(data, imported = workbookData) {
  const hasRecords = Object.prototype.hasOwnProperty.call(data, 'registros')
  if (hasRecords && (!Array.isArray(data.registros) || !data.registros.every(record => record && typeof record.id === 'string' && typeof record.modulo === 'string' && record.campos && typeof record.campos === 'object' && !Array.isArray(record.campos)))) {
    throw new Error('No pudimos leer las áreas guardadas en este navegador. No se modificaron tus datos.')
  }
  return {
    ...data,
    marcas: data.marcas.map(brand => ({ ...(imported.marcas[brand.id] || {}), ...brand })),
    tareas: data.tareas.map(task => ({ alcance: imported.alcanceTareas[task.id] || '', dependencia: '', ...task })),
    riesgos: data.riesgos.map(risk => ({ fecha_revision: null, notas: '', ...risk })),
    registros: hasRecords ? data.registros : structuredClone(imported.registros),
  }
}

export function readLocalData(storage = window.localStorage) {
  return hydrateWorkbookData(readStoredWorkspace(storage, LOCAL_KEY, demoData))
}

export function writeLocalData(data, storage = window.localStorage) {
  writeStoredWorkspace(storage, LOCAL_KEY, data)
}
