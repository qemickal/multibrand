// Regenerate the SQL import from the workbook's extracted, human-readable data.
import { readFileSync, writeFileSync } from 'node:fs'

const data = JSON.parse(readFileSync(new URL('../src/lib/workbook-data.json', import.meta.url), 'utf8'))
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const lines = [
  '-- Datos extraídos de la copia HTML del sistema. No sobreescribe registros existentes.',
  '-- Ejecutar después de schema.sql y seed.sql.',
]
for (const [id, fields] of Object.entries(data.marcas)) {
  const assignments = Object.entries(fields).filter(([, value]) => value).map(([key, value]) => `${key}=coalesce(${key},${quote(value)})`)
  if (assignments.length) lines.push(`update marcas set ${assignments.join(',')} where id=${quote(id)};`)
}
for (const [id, alcance] of Object.entries(data.alcanceTareas)) {
  lines.push(`update tareas set alcance=coalesce(alcance,${quote(alcance)}) where id=${quote(id)};`)
}
for (const record of data.registros) {
  lines.push(`insert into registros_preapertura(id,modulo,campos) values(${quote(record.id)},${quote(record.modulo)},${quote(JSON.stringify(record.campos))}::jsonb) on conflict (id) do nothing;`)
}
writeFileSync(new URL('../supabase/workbook-seed.sql', import.meta.url), `${lines.join('\n')}\n`)
console.log(`${data.registros.length} registros, ${Object.keys(data.marcas).length} marcas y ${Object.keys(data.alcanceTareas).length} tareas.`)
