# Mono Cromat · Sistema de preapertura

Una PWA para dar seguimiento a la preapertura de Mono Cromat & Co. y sus marcas. Incluye vista general, marcas, checklist y registro de riesgos. La interfaz se adapta a computadora y celular.

## Probar en modo local

Necesitas Node.js 20.19+ (rama 20) o 22.12+ y npm. No necesitas configurar Supabase para comenzar:

```bash
npm install
npm run dev
```

Abre la dirección que indique Vite. Sin las variables de Supabase, la aplicación inicia en **modo local** con una copia de las 6 marcas, 139 tareas y 12 riesgos iniciales del repositorio (`supabase/seed.sql`). Puedes crear y editar tareas y riesgos, y actualizar el rol y el mercado de las marcas.

**Importante:** los cambios locales viven únicamente en el almacenamiento de ese navegador. No se comparten con otros dispositivos o personas, pueden perderse si se borran los datos del navegador y **no se sincronizan con el Excel, Google Sheets ni Supabase**. Usa Supabase si necesitas datos compartidos y respaldo fuera del navegador.

Para regenerar los datos iniciales de la vista local después de cambiar `supabase/seed.sql`, ejecuta `npm run seed:demo`. Esto no sobrescribe los datos que ya tenga guardados un navegador.

## Conectar Supabase

1. Crea un proyecto de Supabase. En **SQL Editor**, ejecuta `supabase/schema.sql` y después `supabase/seed.sql`. El seed usa `ON CONFLICT DO NOTHING`, por lo que no reemplaza filas con IDs existentes.
2. En **Authentication → Users**, crea una cuenta con correo y contraseña. Desactiva **Allow new users to sign up** en los ajustes de autenticación si no quieres que otras personas puedan registrarse.
3. Copia `.env.example` a `.env` y sustituye sus valores por la URL del proyecto y su clave pública `anon` o publicable. **Nunca uses la clave `service_role` en el frontend.**
4. Reinicia el servidor de desarrollo. La aplicación mostrará el acceso y, después de iniciar sesión, leerá y guardará los datos en Supabase. También se puede entrar a una vista local independiente desde la pantalla de acceso.

Las políticas incluidas permiten acceso de lectura y escritura a **todos los usuarios autenticados** del proyecto; no aíslan los datos por usuario. Usa solo cuentas de confianza o ajusta las políticas antes de compartir la aplicación. Los cambios de la vista local no se migran automáticamente a Supabase.

Para desplegarla, configura las mismas variables de entorno en tu proveedor (por ejemplo, Vercel) y ejecuta el build. La instalación como PWA requiere HTTPS o localhost. El service worker guarda los recursos de la aplicación para futuras visitas; las escrituras de Supabase requieren conexión y no se ponen en cola para sincronizar después.

## Reglas y alcance actual

- El avance es tareas **Hecho** dividido entre tareas aplicables; las marcadas **No aplica** no cuentan en el denominador. Para marcar una tarea como hecha se pide evidencia; para marcarla como no aplicable se pide una razón en notas. Si ya había tareas históricas hechas sin evidencia, el panel las señala.
- El avance es una fotografía, **no una autorización de apertura**: aún hay que revisar prototipos, costos, permisos y capacidad.
- Esta versión trabaja con las tablas de marcas, tareas y riesgos que ya existían en el repositorio. Aún no incorpora los catálogos, costeo, gastos fijos, proveedores, operación ni decisiones del Excel, y no lee ni escribe automáticamente en la hoja de Google.

## Tipografías

La interfaz utiliza BBH Bartle y DM Sans, distribuidas bajo SIL Open Font License 1.1. Sus avisos y licencias completos se encuentran en `public/licenses/`.

## Comprobaciones

```bash
npm test       # Almacenamiento, carga, reglas de avance y filtros
npm run build  # Compilación de producción y generación de la PWA
```

La auditoría realizada el 5 de noviembre de 2026 no reportó vulnerabilidades en dependencias de producción (`npm audit --omit=dev`). `npm audit` sí reportó seis avisos bajos o moderados en dependencias transitivas de las herramientas de desarrollo; conviene revisarlos y actualizar esas herramientas antes de desplegar.
