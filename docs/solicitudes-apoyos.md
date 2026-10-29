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
