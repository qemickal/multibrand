create table if not exists marcas(id text primary key,nombre text,rol text,mercado text);
create table if not exists tareas(id text primary key,marca text,fase text,frente text,tarea text,criterio text,responsable text default '',estado text default 'Pendiente',prioridad text default 'Alta',fecha date,evidencia text default '',notas text default '');
create table if not exists riesgos(id text primary key,area text,riesgo text,probabilidad text,impacto text,mitigacion text,responsable text default '',estado text default 'Abierto');

-- Columnas adicionales de las hojas MARCAS, CHECKLIST y RIESGOS. Los ALTER son
-- idempotentes y conservan las filas y valores que ya tenga el proyecto.
alter table marcas add column if not exists modelo_negocio text;
alter table marcas add column if not exists descriptor text;
alter table marcas add column if not exists promesa text;
alter table marcas add column if not exists estado text;
alter table marcas add column if not exists propuesta_valor text;
alter table marcas add column if not exists tono_voz text;
alter table marcas add column if not exists canal_principal text;
alter table marcas add column if not exists responsable text;
alter table marcas add column if not exists notas text;
alter table tareas add column if not exists alcance text;
alter table tareas add column if not exists dependencia text;
alter table riesgos add column if not exists fecha_revision date;
alter table riesgos add column if not exists notas text;

-- Los campos de cada área se guardan como JSON para mantener las columnas
-- recuperadas de la hoja sin perder valores al añadir áreas nuevas.
create table if not exists registros_preapertura (
 id text primary key,
 modulo text not null,
 campos jsonb not null default '{}'::jsonb check (jsonb_typeof(campos) = 'object')
);
create index if not exists registros_preapertura_modulo_idx on registros_preapertura(modulo);

do $$ declare t text; begin foreach t in array array['marcas','tareas','riesgos','registros_preapertura'] loop
 execute format('alter table %I enable row level security',t);
 execute format('drop policy if exists acceso on %I',t);
 execute format('create policy acceso on %I for all to authenticated using (true) with check (true)',t);
end loop; end $$;
