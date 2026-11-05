# Mono Cromat · Sistema de preapertura

Una PWA para dar seguimiento a la preapertura de Mono Cromat & Co. y sus marcas. Incluye panel, checklist, marcas y riesgos, además de las áreas recuperadas de las 14 hojas de la copia HTML del sistema. La interfaz se adapta a computadora y celular.

## Qué se recuperó de las hojas

En **Más áreas** se encuentran el catálogo matriz, productos por marca, costeo, gastos fijos, proveedores, operación, decisiones, priorización, punto de equilibrio y guía de uso. También se ampliaron las fichas de marcas, tareas y riesgos con los campos presentes en las hojas. El panel muestra contadores de productos, SKU, costeos y gastos registrados, además del gasto fijo mensual calculado.

Los datos iniciales incluyen **6 marcas, 139 tareas, 12 riesgos, 17 servicios, 10 pasos operativos** y las fichas de priorización y equilibrio para seis marcas. La copia recibida no contenía productos, costeos, gastos, proveedores ni decisiones capturados, por lo que esas áreas comienzan vacías. Esto no implica que estén resueltas.

**Límite importante:** la exportación HTML contenía las celdas visibles, pero no las fórmulas originales. Con las fórmulas `COSTEO_PRECIOS!M5`, `Q5`, `S5`, `T5` y `U5` compartidas después, el costo variable unitario, el precio sugerido sin impuestos, el precio de referencia con tasa, la contribución por unidad y el margen de contribución real se calculan automáticamente. Q5 queda vacío si no hay costo y devuelve cero si su fórmula encuentra un error; un aviso pide revisar el dato cuando el denominador es cero, negativo o muy cercano a cero. S5 queda vacío si Q5 está vacío y aplica la tasa al precio sugerido; si la tasa está vacía, el precio no cambia. T5 queda vacío si Q5 está vacío; calcula la contribución con el precio sin impuestos, las comisiones de canal y pago y el costo variable. Si Q5 vale cero, T5 puede ser negativo. A diferencia de Q5, S5 y T5 no convierten los errores de cálculo en cero. U5 divide la contribución entre el precio sin impuestos y queda vacío si la división da error, incluido un precio de cero. Los importes se muestran con dos decimales y el margen con un decimal porcentual, sin redondear el valor guardado. Para preservar la fórmula original, el margen automático se guarda como proporción (0.35 equivale a 35 %); los porcentajes introducidos por el usuario y los márgenes manuales anteriores se expresan en puntos porcentuales (35 equivale a 35 %). Los valores capturados manualmente antes de esta actualización se conservan como referencia anterior.

Con `GASTOS_FIJOS!G5`, el equivalente mensual por gasto se calcula según las periodicidades Mensual, Anual, Semanal, Diario, Trimestral y Semestral. La fórmula devuelve 0 si no coincide la periodicidad o falta el importe; ese cero no implica que exista un gasto real. La comparación ignora mayúsculas, pero respeta espacios adicionales, como en la hoja. Se muestran dos decimales sin redondear el valor guardado, y los equivalentes que se habían capturado manualmente se conservan como referencia anterior.

Con `PANEL!E8 = SUMA(GASTOS_FIJOS!G5:G104)`, el panel suma los equivalentes mensuales calculados de los gastos registrados. La aplicación no conserva números de fila de Excel; cuando hay hasta 100 gastos todos caben en el rango. Si hay más de 100, el total se deja como no disponible y se muestra un aviso, en vez de excluir gastos arbitrariamente. También se avisa de importes o periodicidades incompletos, valores manuales anteriores que no entran en la suma y errores de cálculo. Sin gastos registrados, la suma es cero, lo que no prueba que no existan gastos reales.

Con `PRIORIZACION!G13` y `I13` y sus copias hacia abajo, el puntaje ponderado y la lectura se calculan automáticamente. El puntaje requiere las cinco calificaciones numéricas y usa pesos 25 %, 25 %, 20 %, 20 % y 10 %; se muestran dos decimales sin redondear el valor guardado y se conserva cualquier puntaje manual anterior. La captura valida la escala del 1 al 5 indicada en la hoja y permite decimales; el cálculo de `CONTAR`, por separado, cuenta cualquier número, incluido el cero. La lectura sigue la fórmula `=SI(G13="","Completar evaluación",SI(H13="Sí","No lanzar: riesgo abierto",SI(G13>=4,"Candidata prioritaria",SI(G13>=3,"Segunda ronda","No priorizar todavía"))))` y conserva cualquier lectura manual anterior distinta del resultado calculado.

Los resultados de punto de equilibrio se capturan **manualmente** y no se recalculan. La aplicación lo indica en cada área; cuando cambian las entradas de punto de equilibrio, solicita confirmar la revisión de los resultados manuales antes de guardar. No uses esos valores como recomendaciones sin validarlos. Para automatizarlos fielmente hay que recuperar las fórmulas originales restantes del Excel.

El avance del checklist es una fotografía, **no una autorización de apertura**: aún hay que revisar prototipos, costos, permisos, capacidad y riesgos. Un riesgo crítico abierto impide recomendar el lanzamiento independientemente de la puntuación.

## Probar en modo local

Necesitas Node.js 20.19+ (rama 20) o 22.12+ y npm. No necesitas configurar Supabase para comenzar:

```bash
npm install
npm run dev
```

Abre la dirección que indique Vite. Sin las variables de Supabase, la aplicación inicia en **modo local**. Puedes editar la información y crear o eliminar registros en las áreas que lo permiten; las fichas iniciales de priorización y equilibrio se editan por marca.

**Importante:** los cambios locales viven únicamente en el almacenamiento de ese navegador y esa dirección web (origen). La vista previa y la aplicación publicada pueden usar almacenamientos distintos. No se comparten con otros dispositivos o personas, pueden perderse si se borran los datos del navegador y **no se sincronizan con el Excel, Google Sheets ni Supabase**. Usa Supabase si necesitas datos compartidos y respaldo fuera del navegador.

Al abrir una versión local anterior desde el mismo navegador y la misma dirección web, las áreas y campos nuevos se añaden en memoria sin sustituir las marcas, tareas, riesgos o ediciones existentes. Los cambios se escriben en el almacenamiento cuando la persona guarda una ficha. Si los datos guardados no se pueden leer, la aplicación informa del problema sin sustituirlos por datos de muestra.

## Conectar o actualizar Supabase

1. Crea un proyecto de Supabase. **Si ya tienes datos, haz un respaldo antes de actualizar el esquema.** En **SQL Editor**, ejecuta `supabase/schema.sql`, después `supabase/seed.sql` y finalmente `supabase/workbook-seed.sql`.
   - El esquema agrega columnas a las tres tablas originales y crea `registros_preapertura`; no borra las filas existentes.
   - Los seeds no sobrescriben registros con el mismo ID. La información adicional de las marcas y el alcance de las tareas iniciales se agrega solo donde la nueva columna está en `NULL`. Si vuelves a ejecutar el seed después de eliminar un registro inicial, ese registro puede reaparecer.
   - El esquema recrea la política llamada `acceso` en las cuatro tablas. Si personalizaste esa política, revisa el SQL antes de ejecutarlo.
2. En **Authentication → Users**, crea una cuenta con correo y contraseña. Desactiva **Allow new users to sign up** en los ajustes de autenticación si no quieres que otras personas puedan registrarse.
3. Copia `.env.example` a `.env` y sustituye sus valores por la URL del proyecto y su clave pública `anon` o publicable. **Nunca uses la clave `service_role` en el frontend.**
4. Reinicia el servidor de desarrollo. La aplicación mostrará el acceso y, después de iniciar sesión, leerá y guardará los datos en Supabase. También se puede entrar a una vista local independiente desde la pantalla de acceso.

Si el proyecto anterior todavía no tiene la nueva tabla, el panel, las marcas, el checklist y los riesgos originales seguirán disponibles; las áreas nuevas y los campos adicionales se habilitan al actualizar el esquema. Otros errores de conexión o permisos se muestran como errores y no se interpretan como datos vacíos.

Las políticas incluidas permiten acceso de lectura y escritura a **todos los usuarios autenticados** del proyecto; no aíslan los datos por usuario. Esto también aplica a contactos, notas y datos financieros. Usa solo cuentas de confianza o ajusta las políticas antes de compartir la aplicación. Los cambios de la vista local no se migran automáticamente a Supabase.

Para desplegarla, configura las mismas variables de entorno en tu proveedor (por ejemplo, Vercel) y ejecuta el build. La instalación como PWA requiere HTTPS o localhost. El service worker guarda los recursos de la aplicación para futuras visitas; las escrituras de Supabase requieren conexión y no se ponen en cola para sincronizar después.

## Reglas del checklist

- El avance es tareas **Hecho** dividido entre tareas aplicables; las marcadas **No aplica** no cuentan en el denominador.
- Para marcar una tarea como hecha se pide evidencia; para marcarla como no aplicable se pide una razón en notas. Si ya había tareas históricas hechas sin evidencia, el panel las señala.
- No se borran tareas para ocultar pendientes: se cambia su estado y se documenta el motivo cuando corresponda.

## Datos iniciales y tipografías

Los datos base locales de marcas, tareas y riesgos se derivan de `supabase/seed.sql`. Para regenerarlos después de editar el seed, ejecuta `npm run seed:demo`. Los datos adicionales recuperados de la copia HTML están en `src/lib/workbook-data.json`; `npm run seed:workbook` regenera `supabase/workbook-seed.sql` a partir de ellos. Ninguno de esos comandos sobrescribe los datos que ya estén guardados en un navegador.

La interfaz utiliza BBH Bartle y DM Sans, distribuidas bajo SIL Open Font License 1.1. Sus avisos y licencias completos se encuentran en `public/licenses/`.

## Comprobaciones

```bash
npm test       # Almacenamiento, migración local, carga, campos y reglas
npm run build  # Compilación de producción y generación de la PWA
```

La auditoría realizada el 5 de noviembre de 2026 no reportó vulnerabilidades en dependencias de producción (`npm audit --omit=dev`). `npm audit` sí reportó seis avisos bajos o moderados en dependencias transitivas de las herramientas de desarrollo; conviene revisarlos y actualizar esas herramientas antes de desplegar.
