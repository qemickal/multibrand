export function readStoredWorkspace(storage, key, initialData) {
  const raw = storage.getItem(key)
  if (!raw) return structuredClone(initialData)
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data.marcas) || !Array.isArray(data.tareas) || !Array.isArray(data.riesgos)) throw new Error('Datos incompletos')
    return data
  } catch {
    // Never replace unreadable data with the seed without the user's consent.
    throw new Error('No pudimos leer los datos guardados en este navegador. No se modificaron tus datos.')
  }
}

export function writeStoredWorkspace(storage, key, data) {
  storage.setItem(key, JSON.stringify(data))
}
