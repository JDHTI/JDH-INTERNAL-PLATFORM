# Plan: solicitudes de apoyo JDH

Estado: planificación aprobada; entrega documental, sin funcionalidad implementada.

## Decisiones de negocio

- Comercial tendrá un maestro filtrable de solo lectura, inicialmente sin filtro por vendedor.
- Cada solicitud apunta a un único registro compartido del maestro. No propaga cambios a otras filas por producto o cliente.
- BI y administradores administran el maestro y resuelven solicitudes; Comercial consulta y solicita. Trasladar a BI los permisos actuales de Comercial para edición, perfiles, cargas y adjuntos.
- Para `costo_neto`, solicitar un nuevo costo pactado JDH (`jdh_net_cost`), conservando `supplier_value` como costo del proveedor. Para todos los demás métodos, solicitar porcentaje en `jdh_pct`, con su base y convenciones actuales.
- Solicitar exige acuerdo vigente, habilitado y sin revisión pendiente. Los demás acuerdos siguen consultables.
- Comercial ve sus solicitudes; BI ve todas. BI aprueba el valor pedido o rechaza con motivo, sin editar la propuesta.
- Cancelar JDH elimina únicamente su efecto vigente. Conserva acuerdo, aporte del proveedor e historial. Anular el acuerdo completo sigue siendo una acción distinta.

## Persistencia y consistencia

Agregar `jdh_net_cost` al maestro. Crear tabla de solicitudes con acuerdo, modalidad, valor pedido, justificación, solicitante, fecha, fotografía del acuerdo y estado (`pendiente`, `aprobada`, `rechazada`). La propuesta es inmutable: otro valor exige otra solicitud.

Crear eventos inmutables con actor, fecha UTC, motivo, solicitud relacionada, versión y valores anteriores/nuevos. Registrar creación, aprobación, rechazo, cancelación JDH y modificaciones administrativas del aporte. Ningún PATCH, carga o importación debe eludir la auditoría. Preservar valores existentes mediante una línea base identificada como migración, sin inventar solicitudes históricas.

Aprobar en una transacción: bloquear acuerdo y solicitud, comprobar permisos, estado y versiones, actualizar maestro, resolver solicitud y guardar evento. El fallo de cualquier paso revierte todo. Resolver una solicitud dos veces no vuelve a aplicar el cambio.

Permitir varias solicitudes pendientes. Si cambió el acuerdo, devolver 409; BI recarga, compara propuesta con valor vigente y confirma nuevamente contra esa versión. No cerrar automáticamente las demás solicitudes. Repetir una cancelación ya efectiva no genera otro cambio ni evento.

Conservar el costo del proveedor y mostrar el costo efectivo JDH por separado. Al cancelar JDH vuelve a regir el costo del proveedor. Respetar unidad/caja/kg y conversiones existentes. Mantener separados financiación del proveedor y aporte JDH en cálculos y consumidores, incluido el validador; no atribuir JDH al proveedor. Las solicitudes pendientes o rechazadas no afectan cálculos.

## Contrato API propuesto

Rutas relativas al prefijo vigente; reutilizar arquitectura, errores y paginación del módulo `supplier_supports`.

| Ruta | Comportamiento |
| --- | --- |
| `POST /supplier-supports/{id}/requests` | Crear pendiente: valor, motivo y versión consultada. |
| `GET /supplier-support-requests` | Lista paginada y filtrable: propias para Comercial, todas para BI. |
| `GET /supplier-support-requests/{id}` | Detalle autorizado, propuesta original y decisión. |
| `POST /supplier-support-requests/{id}/approve` | Aprobar valor solicitado contra versión vigente revisada. |
| `POST /supplier-support-requests/{id}/reject` | Rechazar con motivo obligatorio. |
| `GET /supplier-supports/{id}/jdh-history` | Historial completo para BI; Comercial accede a sus solicitudes. |
| `DELETE /supplier-supports/{id}/jdh-support` | Cancelación lógica del aporte, con motivo y control de versión. |

Ampliar `/supplier-supports/permissions` con capacidades de solicitar y resolver, conservando `can_manage`. La autorización se aplica en backend. Mantener lectura existente del maestro y proteger separadamente las solicitudes y eventos.

Los porcentajes mantienen la validación vigente; el costo pactado admite importes no negativos y usa la unidad del acuerdo. Las fechas se presentan en `America/Bogota`.

## Frontend coordinado

- Reutilizar navegador, filtros, detalle y documentos en `/comercial/apoyos`, con modo explícito de consulta incluso para usuarios que también administran BI.
- Solicitud individual: modalidad determinada por el acuerdo, valor vigente, unidad/base, valor pedido y justificación.
- `/comercial/apoyos/solicitudes`: seguimiento propio.
- `/bi/solicitudes-apoyos`: pendientes por defecto, filtros, comparación original/actual/propuesta, aprobación, rechazo e historial.
- Maestro BI: cancelar aporte JDH e historial, diferenciados de anulación del acuerdo.
- Invalidar listas, detalle y solicitudes tras cambios. Contemplar carga, vacío, error, permisos y 409. Reutilizar componentes y convenciones existentes.
- Sin solicitudes masivas, notificaciones ni retiro por el solicitante en esta entrega.

## Validación prevista

- Permisos: Comercial no modifica ni resuelve; no accede a solicitudes ajenas.
- Creación/rechazo sin efecto; aprobación porcentual y de costo neto; cancelación y nueva solicitud posterior.
- Preservar proveedor, alcance y unidad; historial íntegro y reintentos sin duplicación.
- Dos aprobadores, solicitudes concurrentes, edición administrativa intermedia y rollback.
- Regresión de cálculos, importación, adjuntos y validador.
- Migración PostgreSQL: subir, revertir y verificar una sola cabeza Alembic; encadenar tras la cabeza vigente (actualmente 0035).
- API: pytest, Ruff y formato. UI: TypeScript, ESLint, build y recorrido Comercial/BI, móvil y ambos temas.

Estas pruebas están planificadas; esta entrega documental no las ejecuta ni certifica funcionalidad.

## Entrega y convenciones

API: rama `feat/module-supplier-supports-requests` desde `master`; commit documental `docs(module-supplier-supports): define JDH support requests and approval workflow`.

UI: coordinar con el agente de `internal-platform-ui/supplier-supports-form`, rama `feat/supplier-supports-requests` desde su `master` y commit `docs(supports): plan commercial requests and BI approvals`. La señal pide planificación y documentación, sin implementar funcionalidad todavía.

Referencias de estilo revisadas: API PR #30 y #31; UI PR #36. Títulos y commits convencionales en inglés; descripción de PR en español con Resumen, Notas de despliegue (o Notas) y Pruebas, enlazando ambos frentes. Identificar pruebas pendientes. Esta fase no publica PRs.

## Entrega documental UI

Fuente de verdad: plan API completo reproducido arriba, rama `feat/module-supplier-supports-requests`, commit `c71db46` del repositorio `JDH-INTERNAL-PLATFORM-API`, documento `docs/solicitudes-apoyos.md`. Esta sección concreta el frente UI sin alterar las decisiones aprobadas. Base UI: `origin/master` actualizado en `9fedfb5`; rama de entrega `feat/supplier-supports-requests`.

### Pantallas y permisos previstos

| Frente | Experiencia y alcance |
| --- | --- |
| `/comercial/apoyos` | Maestro filtrable, detalle y documentos en consulta; sin filtro inicial por vendedor. El contexto Comercial permanece de solo lectura incluso con permisos BI. Solicitar se ofrece por registro vigente, habilitado y sin revisión pendiente. |
| Solicitud individual desde el maestro | Mostrar acuerdo, versión, valor vigente, modalidad, unidad/base y propuesta con justificación. `costo_neto` propone `jdh_net_cost`; otros métodos proponen `jdh_pct`. No permitir cambiar la modalidad ni modificar la propuesta enviada. |
| `/comercial/apoyos/solicitudes` | Mis solicitudes: lista paginada, filtros y detalle de propuesta original, estado y decisión autorizados por API. No exponer solicitudes ajenas. |
| `/bi/solicitudes-apoyos` | BI y administradores: pendientes por defecto, filtros y detalle con comparación de fotografía original, valor actual y propuesta. Aprobar exactamente lo pedido; rechazar con motivo obligatorio; consultar historial. |
| Maestro BI | Gestión administrativa del maestro, perfiles, cargas y adjuntos trasladada desde Comercial. Historial y cancelación del aporte JDH con motivo y versión, diferenciada de anular el acuerdo completo. |

La creación o el rechazo no cambian el maestro. Cada aprobación afecta solo la fila solicitada. Mostrar `supplier_value` como costo del proveedor y costo efectivo JDH por separado, respetando unidad/caja/kg y conversiones existentes. Cancelar únicamente el aporte JDH conserva acuerdo, proveedor e historial y restablece el costo del proveedor. Una solicitud posterior constituye una propuesta nueva.

### Integración prevista con el código existente

- Reutilizar `src/features/supports/components/supports-browser.tsx`, filtros, detalle y visor documental; establecer explícitamente el modo de consulta por contexto Comercial.
- Extender en una fase posterior los tipos de `src/features/supports/types/support.types.ts`, el cliente de `services/supports.service.ts` y las consultas/mutaciones de `hooks/use-supports.ts`, conservando `apiFetch`, `ApiError` y las convenciones de paginación del módulo.
- Las páginas compartidas actuales están bajo `src/app/(app)/[area]/apoyos`; incorporar las rutas aprobadas y sus accesos de navegación sin inferir una ruta alternativa para la bandeja BI.
- Consumir las capacidades de solicitar y resolver de `/supplier-supports/permissions`, además de `can_manage`. No deducir autorización de un fallo de permisos: el hook actual `useCanManage` permite mostrar acciones cuando la consulta falla y debe revisarse para estos contextos. El backend decide la autorización y el alcance de registros.
- Tras crear, resolver o cancelar, invalidar listas del maestro, detalle, solicitudes e historial afectados. No aplicar propuestas pendientes o rechazadas a cálculos ni al validador. Mantener diferenciados aporte del proveedor y JDH.
- Mostrar carga, vacío, error, sin permiso, validaciones de campo y resultado de la acción. Presentar fechas UTC en `America/Bogota`; mantener temas, móvil y componentes existentes.

### Contrato y concurrencia para UI

Las siete rutas y `/supplier-supports/permissions` de la tabla API anterior son el contrato propuesto aprobado. Crear envía el valor, la justificación y la versión consultada; aprobar usa la versión vigente revisada; rechazar requiere motivo; cancelar JDH requiere motivo y control de versión. Detalle e historial deben permitir presentar actor, fecha, motivo, estados y valores anteriores/nuevos según autorización.

El plan no fija nombres exactos de todos los campos JSON, nuevas capacidades, filtros ni envoltorios de respuesta: tiparlos contra los esquemas API cuando se implementen, reutilizando errores y paginación existentes. No presentar estas rutas como funcionalidad ya disponible.

Ante HTTP 409, detener la decisión, recargar acuerdo y solicitud, mostrar la comparación con el valor vigente y exigir una nueva confirmación explícita sobre esa versión antes de volver a enviar. No reintentar automáticamente una aprobación con una versión actualizada silenciosamente. Permitir varias pendientes: aprobar una no cierra las otras; una propuesta obsoleta exige revisión. El API garantiza transacción, auditoría e idempotencia de resolución/cancelación; UI no debe simularlas localmente.

### Secuencia de implementación posterior

1. API: persistencia, migración, capacidades, auditoría y contratos de rutas conforme al plan aprobado.
2. UI: adaptar permisos/contexto y lectura del maestro; añadir solicitud individual y seguimiento propio.
3. UI: bandeja BI, resolución, historial y cancelación JDH; integrar recarga y confirmación ante 409.
4. Validar recorridos integrados y regresiones antes de proponer publicación. Esta secuencia no autoriza implementación en esta entrega.

### Referencia de PR y pruebas pendientes

Estándar revisado: [UI PR #36](https://github.com/JDHTI/JDH-INTERNAL-PLATFORM/pull/36), `feat(supports): new support form, supplier profiles, bulk load and supporting documents`. Usar título convencional en inglés y descripción en español con las siguientes secciones, enlazando el frente API y UI al abrir PR en una fase posterior:

- **Resumen:** maestro Comercial de consulta, solicitudes individuales, seguimiento propio y resolución BI/admin conforme al documento API.
- **Notas:** dependencia del contrato API, permisos y migración; separación de costos proveedor/JDH, auditoría y control de versión; alcance de la entrega.
- **Pruebas:** identificar expresamente las pruebas pendientes y distinguir revisión documental de validación funcional.

Pendientes para la implementación:

- [ ] TypeScript, ESLint y build UI.
- [ ] Recorrido Comercial/BI/admin, permisos múltiples, acceso directo y denegación de solicitudes ajenas.
- [ ] Porcentaje y costo neto, unidades/conversiones, creación y rechazo sin efecto, aprobación, cancelación JDH y nueva solicitud.
- [ ] Motivo de rechazo/cancelación, historial completo y proveedor preservado.
- [ ] Conflictos 409, dos aprobadores, múltiples pendientes, edición administrativa intermedia y reintentos sin duplicación.
- [ ] Invalidación de consultas, estados de carga/vacío/error/permisos, móvil y ambos temas.
- [ ] Regresión de perfiles, importaciones, adjuntos, cálculos y validador con el API nuevo.

En esta fase solo se revisa coherencia documental y diff. No se ejecutan ni certifican estas pruebas funcionales. Commit solicitado: `docs(supports): plan commercial requests and BI approvals`. Sin push ni PR.

### Señal al frente UI

La entrega de planificación API `c71db46` queda recibida y documentada en este worktree UI. La señal habilita exclusivamente planificación y documentación; la implementación funcional y publicación quedan para una fase posterior. La tarjeta del worktree registra el commit documental UI como constancia de recepción.

## Implementación UI autorizada posteriormente (2026-10-29)

El usuario amplió expresamente el alcance después del commit documental `03a0309`: desarrollar la UI funcional completa coordinada con API. Las referencias anteriores a una fase exclusivamente documental describen la entrega inicial; esta sección registra el alcance y el estado posterior. Continúa la restricción de no hacer push ni PR hasta validación.

Implementado: maestro `/comercial/apoyos` en consulta incluso con permisos BI, solicitud individual desde el detalle, seguimiento propio `/comercial/apoyos/solicitudes`, bandeja `/bi/solicitudes-apoyos` con pendientes por defecto, aprobación exacta, rechazo motivado, comparación original/actual/propuesta e historial. Maestro BI incorpora cancelación exclusiva JDH con motivo y confirmación, independiente de anulación del acuerdo. El historial presenta etiquetas humanas y tabla anterior/nuevo de proveedor, JDH, versión y demás condiciones reconocidas. Los formularios piden confirmación para descartar cambios.

Permisos confirmados `can_manage`, `can_request`, `can_review`; errores de permisos no habilitan escritura. Las rutas administrativas bajo Comercial quedan bloqueadas. Lista y detalle Comercial envían `mine=true`, incluida la combinación de permisos Comercial y BI; no se consulta el historial completo desde Comercial. Consultas y mutaciones invalidan maestro, detalle, solicitudes e historial relacionados.

### Contrato confirmado con los archivos API

- Crear: `POST /supplier-supports/{id}/requests` con `{version,value,reason}`.
- Lista: `GET /supplier-support-requests?page&size&status&q`, con `mine=true` desde Comercial; devuelve `{items,total,page,size}`.
- Detalle: `GET /supplier-support-requests/{id}`, con `mine=true` desde Comercial; devuelve solicitud al nivel raíz más `support` actual y `events`.
- Aprobar: `POST /supplier-support-requests/{id}/approve` con `{version,support_version}`. Rechazar: `POST /supplier-support-requests/{id}/reject` con `{version,reason}`. Ambas devuelven la solicitud raíz sin `support/events`; UI invalida y recarga el detalle.
- Historial: `GET /supplier-supports/{id}/jdh-history`, array directo, solo contexto BI.
- Cancelar JDH: `DELETE /supplier-supports/{id}/jdh-support` con `{version,reason}`; devuelve maestro actualizado.

Solicitud: `id,support_id,mode,value,reason,status,requested_by,created_at,version,support_version,snapshot,decided_by,decided_at,decision_reason`. Snapshot plano del acuerdo. Eventos: `id,support_id,request_id,event_type,actor,created_at,reason,before,after`. Etiquetas soportadas: `solicitada`, `aprobada`, `rechazada`, `cancelada`, `actualizacion_maestro`, `creacion`, `migracion`. Los decimales API llegan como strings; los tipos UI aceptan también número por compatibilidad.

El porcentaje API es fracción entre -1 y 1 con máximo 6 decimales; la entrada UI usa puntos entre -100 y 100, máximo 4 decimales. Costo pactado no negativo, menor a 10^12, máximo 6 decimales; no modifica el costo del proveedor. Motivos de 3 a 2000 caracteres. Las comparaciones de JDH y propuesta conservan toda la precisión del contrato. Fechas de eventos en `America/Bogota`.

Un 409 recarga datos y elimina la confirmación previa; la nueva acción exige revisar y confirmar la versión vigente. Tampoco se puede enviar una creación/cancelación si un refetch automático cambió la versión después de confirmar: el valor mostrado y el token de confirmación deben corresponder a la misma revisión. Los errores 403 se muestran y no se convierten en éxito.

### Validación real y límites

Resultados locales: TypeScript, ESLint y build de producción completados sin errores; 9 pruebas automatizadas aprobadas. `git diff --check` limpio.

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit`.
- ESLint sobre el frente supports, las rutas afectadas, navegación y pruebas.
- Build de producción: `node node_modules/next/dist/bin/next build`, incluye las dos rutas nuevas.
- Pruebas UI/contrato: `node --test tests/*.test.mjs`: aislamiento de controles e historial Comercial con permisos BI; controles BI y denegación; conversión, límites y precisión; `mine=true`; payloads/versiones de decisiones/cancelación; 409 sin reintento automático; 403 sin decisión exitosa.

Las pruebas de contexto renderizan componentes a HTML en servidor con dependencias controladas; las de contrato usan el cliente HTTP real con fetch simulado. No sustituyen un recorrido real de navegador. Pendiente click-through integrado con API, incluyendo dos aprobadores, descarte de formularios, refetch/409, móvil y ambos temas. No se realizó validación visual. El resultado de la suite PostgreSQL/API lo valida el frente API, no esta entrega UI.

## Ampliación: selección Comercial y envío atómico

Requisito posterior autorizado: solicitar desde las casillas del maestro Comercial, sin abrir el proveedor. Se conserva la selección entre filtros y páginas, con barra para revisar/quitar registros e iniciar la solicitud. Hasta 100 registros; únicamente acuerdos elegibles del mismo `commercial_supplier_id` y cliente. Con NIT se permiten sucursales distintas del mismo NIT; sin NIT deben coincidir `customer_group`, `customer_name` y `customer_branch_id`. Proveedor nulo no admite lote. El checkbox de cabecera selecciona los elegibles de la página que comparten proveedor/cliente con la selección actual o con el primer elegible de la página. Las otras filas siguen consultables.

El formulario muestra cada registro, modalidad, unidad, base, valor vigente y versión, con valor propuesto y justificación independientes. Envía una sola petición `POST /supplier-supports/requests/batch` con `{items:[{support_id,version,value,reason}]}`; respuesta array de `SupportRequestResponse`. No envía peticiones individuales sucesivas. El backend garantiza todo o nada; cada solicitud conserva su decisión BI independiente. Se recargan todos los acuerdos al abrir y tras 409; cualquier cambio de versión invalida la confirmación del conjunto. Las solicitudes no se reintentan automáticamente. Contrato coordinado con API `580e080`.

Se eliminaron todas las llamadas `window.confirm` del frente supports. Descartar formularios de solicitud, cancelación o decisión usa el Dialog del diseño con «Seguir editando» y «Descartar cambios» cuando hay datos que perder. El detalle Comercial orienta a la barra del maestro; no es necesario abrirlo para solicitar.

### Hallazgo y ajuste del selector de clientes

Antes consultaba `q,page=1,size=20`, sin filtro `is_active`, y ocultaba errores. No aplica un filtro local por texto: las sugerencias provienen de API y se deduplican por NIT. Ahora usa páginas de 50 con «Cargar más coincidencias», error visible/reintento y reapertura de sugerencias al volver al campo. Se mantienen accesibles clientes activos e inactivos. Una búsqueda nueva no ofrece resultados de la consulta anterior mientras espera el debounce.

Comprobación HTTP local: `GET /commercial/customers?q=80140929&page=1&size=50` devuelve tres sucursales de `SALAMANCA MEDINA MIGUEL ANGEL`; el render UI controlado las presenta como una opción con `value=80140929`, nombre completo y `NIT 80140929`. La búsqueda por frase continua no encontraba el nombre al omitir MEDINA; API amplió la búsqueda por palabras y normalización de NIT. No se promete corregir el typo `slamanca`.

Validación UI de esta ampliación: TypeScript, ESLint de archivos afectados, build de producción y `git diff --check` sin errores; 19 pruebas aprobadas con `node --test tests/*.test.mjs`. Incluyen alcance por proveedor/cliente/sucursal, modalidades mixtas, límite 100, proveedor nulo, lote en una petición, 409 sin envío individual, consulta NIT sin filtro de activos, paginación y render de Salamanca. Sigue pendiente el click-through visual integrado en Docker, móvil y ambos temas. Sin push, merge ni PR.

## Ajuste de presentación de bandejas y avisos

Las bandejas Comercial y BI muestran tablas con una fila completa por solicitud: identificador/proveedor, cliente/NIT, referencia, modalidad/unidad, propuesta, estado, solicitante/fecha, justificación y decisión. Los textos de justificación y motivo de decisión no se truncan. La tabla permite desplazamiento horizontal en pantallas pequeñas y acceso al detalle mediante botón identificado. La navegación entre bandejas y maestro usa el sidebar; se eliminó el enlace «Volver al maestro de apoyos» del flujo de solicitudes, conservando enlaces de otros flujos como creación de acuerdos y carga masiva.

`Alert` reutilizable en `src/shared/components/ui/alert.tsx`: severidades `success`, `danger` e `info`, con tokens semánticos de ambos temas. Éxito usa verde y `role=status`; errores usan danger y `role=alert`. El maestro conserva severidad y mensaje por separado en su estado de aviso. Envío de solicitudes, cancelación JDH y decisión BI muestran Alert success; errores de validación, permisos y acciones conservan danger.

Validación de este ajuste: TypeScript, ESLint, build de producción y `git diff --check` sin errores; 21 pruebas automatizadas aprobadas. Las nuevas pruebas comprueban semántica/color de avisos y render de ambas bandejas en filas completas sin enlace al maestro. La comprobación de render es controlada y no sustituye el click-through visual integrado pendiente en Docker, móvil y ambos temas.

Dependencia de integración: [API PR #32](https://github.com/JDHTI/JDH-INTERNAL-PLATFORM-API/pull/32). La publicación del PR UI queda a cargo del coordinador para evitar duplicados; este worktree solo entrega commit y descripción preparada.

## Simplificación compartida de solicitudes

Ajuste posterior sobre el PR UI #38, con la misma experiencia para solicitantes y revisores. Cada fila se identifica como «Apoyo JDH · proveedor», usando `supplier_name` / `supplier_code` del nivel raíz de lista/detalle y fallback al snapshot para compatibilidad. Cliente ocupa la columna contigua; referencia muestra solamente el SKU, sin programa ni identificadores adicionales. «Acciones», al extremo derecho, ofrece «Ver solicitud» y «Ver justificación».

La justificación completa se consulta en un Dialog separado; ya no ocupa una columna extensa ni el cuerpo principal del detalle. El detalle muestra JDH al solicitar, JDH vigente y JDH propuesto, estado y decisión. Auditoría y versiones se conservan accesibles dentro de «Ver auditoría», cerrado inicialmente. El control de versiones, recarga y confirmación ante 409 continúa vigente. No se limita el negocio a porcentajes: costo pactado JDH conserva precisión y unidad de la propuesta, separado del proveedor.

El formulario batch también muestra solo JDH vigente por registro, su propuesta y justificación, evitando el desglose completo de acuerdo, proveedor, vigencias y referencias de cálculo. Mantiene las reglas de elegibilidad, proveedor/cliente, modalidades/unidades y atomicidad existentes.

Validación: TypeScript, ESLint, build y `git diff --check` sin errores; 23 pruebas aprobadas. Las pruebas de presentación comprueban proveedor real/fallback, acciones y ausencia de textos extensos en filas/detalle, Dialog independiente, auditoría colapsada y comparación compacta de costo neto con todos los decimales. Pendiente recorrido visual integrado en Docker. El coordinador actualiza PR #38 y despliegue; no se publica un PR adicional desde este worktree.
