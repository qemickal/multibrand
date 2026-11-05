// Keep the local preview's starting data aligned with the Supabase seed.
import { readFileSync, writeFileSync } from 'node:fs'

const seed = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8')
const data = { marcas: [], tareas: [], riesgos: [] }
const defaults = {
  marcas: {},
  tareas: { responsable: '', estado: 'Pendiente', prioridad: 'Alta', fecha: null, evidencia: '', notas: '' },
  riesgos: { responsable: '', estado: 'Abierto' },
}

for (const line of seed.split('\n')) {
  if (!line.trim()) continue
  const match = line.match(/^insert into (\w+)\(([^)]+)\) values\((.*)\) on conflict do nothing;$/i)
  if (!match || !data[match[1]]) throw new Error(`No se pudo interpretar el seed: ${line}`)
  const columns = match[2].split(',')
  const values = Array.from(match[3].matchAll(/'((?:''|[^'])*)'/g), value => value[1].replaceAll("''", "'"))
  if (columns.length !== values.length) throw new Error(`Número de valores incorrecto: ${line}`)
  data[match[1]].push({ ...defaults[match[1]], ...Object.fromEntries(columns.map((column, index) => [column, values[index]])) })
}

writeFileSync(new URL('../src/lib/demo-data.json', import.meta.url), `${JSON.stringify(data, null, 2)}\n`)
console.log(`Vista local: ${data.marcas.length} marcas, ${data.tareas.length} tareas, ${data.riesgos.length} riesgos.`)
