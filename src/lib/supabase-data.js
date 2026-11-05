// Supabase projects can cap responses below the requested page size. Continue
// until the reported total is reached instead of silently truncating data.
export async function fetchAll(client, table, pageSize = 1000) {
  const rows = []
  let from = 0
  while (true) {
    const { data, error, count } = await client.from(table).select('*', { count: 'exact' }).order('id').range(from, from + pageSize - 1)
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('Respuesta de datos incompleta')
    rows.push(...data)
    if (!data.length) {
      if (count != null && rows.length < count) throw new Error('No se pudieron cargar todos los registros')
      return rows
    }
    from += data.length
    if (count != null ? rows.length >= count : data.length < pageSize) return rows
  }
}

export function isMissingWorkbookSchema(error) {
  // PostgREST reports an absent relation as PGRST205 (or PostgreSQL 42P01).
  // Do not treat permission, network, or unrelated errors as a missing schema.
  return error?.code === 'PGRST205' || error?.code === '42P01'
}

export async function fetchWorkbookRecords(client) {
  try {
    const records = await fetchAll(client, 'registros_preapertura')
    if (!records.every(record => record && typeof record.id === 'string' && typeof record.modulo === 'string' && record.campos && typeof record.campos === 'object' && !Array.isArray(record.campos))) {
      throw new Error('Los registros de las áreas están incompletos')
    }
    return { records, ready: true }
  } catch (error) {
    if (isMissingWorkbookSchema(error)) return { records: [], ready: false }
    throw error
  }
}
