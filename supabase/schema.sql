create table if not exists marcas(id text primary key,nombre text,rol text,mercado text);
create table if not exists tareas(id text primary key,marca text,fase text,frente text,tarea text,criterio text,responsable text default '',estado text default 'Pendiente',prioridad text default 'Alta',fecha date,evidencia text default '',notas text default '');
create table if not exists riesgos(id text primary key,area text,riesgo text,probabilidad text,impacto text,mitigacion text,responsable text default '',estado text default 'Abierto');
do $$ declare t text; begin foreach t in array array['marcas','tareas','riesgos'] loop
 execute format('alter table %I enable row level security',t);
 execute format('drop policy if exists acceso on %I',t);
 execute format('create policy acceso on %I for all to authenticated using (true) with check (true)',t);
end loop; end $$;
