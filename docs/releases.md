# Versiones y avisos de versión nueva

Estado: **propuesta**, para aplicar cuando se apruebe el alcance inicial de los módulos y la
intranet tenga su versión estándar. Hasta entonces nada de esto está implementado.

Este documento fija cómo se numera una versión, dónde se describe qué trae y cómo se le avisa, sin
interrumpir su trabajo, a quien tiene abierta una versión vieja de la aplicación. El aviso llega
solo a quien usa los módulos que cambiaron.

## 1. El problema

Cada push a `master` se despliega solo (`docs/deploy.md`, CD). Quien tenía la plataforma abierta
sigue con el código anterior en el navegador hasta que recarga. Eso causa dos cosas:

- **Errores sueltos.** Al navegar, el navegador pide piezas de la versión vieja que el servidor ya
  no tiene. También puede llamar a un contrato del API que cambió.
- **Nadie se entera de lo nuevo.** Un modal nuevo en el cotizador, o una pantalla segmentada
  distinto, pasa desapercibido. La persona puede pensar que algo se rompió.

## 2. Tres piezas separadas

| Pieza | Qué resuelve | Dónde vive |
| --- | --- | --- |
| Identificador del despliegue | Saber que el navegador corre una versión vieja | `next.config.ts` (`deploymentId`) y `GET /api/version` |
| Notas de versión | Qué cambió, en qué módulos, qué tan importante es | `src/shared/config/releases.ts`, en el repo |
| Aviso | Mostrarlo a quien corresponde, sin cortar su trabajo | Banner en el encabezado del workspace y modal «Qué cambió» |

Se separan a propósito: se despliega muchas veces al día, y solo algunos despliegues son una versión
con algo que contar.

### 2.1 Identificador del despliegue

- **`deploymentId`.** En `next.config.ts` va `deploymentId: process.env.NEXT_DEPLOYMENT_ID`. El valor
  es el SHA del commit, que se pasa como argumento de build en `deploy/deploy.sh` y el Dockerfile.
- **Lo que hace Next 16 con él** (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/deploymentId.md`):
  - Marca los recursos estáticos con `?dpl=`.
  - Marca el `<html>` con `data-dpl-id`.
  - Si al navegar detecta que el servidor tiene otro despliegue, hace una recarga completa en lugar
    de una navegación interna.
- **Para todos, sin aviso.** Eso corrige los errores sueltos para todos los usuarios, también para
  los de módulos que no cambiaron, sin mostrarles nada.
- **`GET /api/version`.** Una ruta `route.ts`, como `/api/health`, que devuelve
  `{ deployment: string, version: string | null }`:
  - el despliegue actual;
  - la última versión publicada en las notas (sección 2.2).
- **Para quien no navega.** Quien se queda quieto en una pantalla, por ejemplo en el editor de una
  cotización, no navega y no recibe la recarga. Para eso el cliente consulta `/api/version` cuando
  la pestaña vuelve a estar visible y cada 5 minutos mientras lo está. Luego compara con el
  `data-dpl-id` con que cargó.

### 2.2 Notas de versión

- **Formato.** Un arreglo en `src/shared/config/releases.ts`, la más reciente primero. Se escribe
  en el mismo PR que trae el cambio y se revisa con el código:

  ```ts
  export const RELEASES: Release[] = [
    {
      version: "1.3.0",
      date: "2026-12-01",
      // Las mismas claves de permiso de `ModuleItem.permission` y de `my_modules`.
      modules: ["cotizador"],
      level: "recomendada",
      title: "Más detalle en el cotizador",
      changes: [
        "Dos modales nuevos: el detalle del apoyo y el del costo.",
        "Los indicadores pasan debajo de las tarjetas del cliente.",
      ],
      // Opcional: la versión del API que necesita (sección 5).
      requiresApi: "1.8.0",
    },
  ];
  ```

- **Por qué en el repo y no en el API.** La nota queda amarrada al commit y al tag, pasa por la
  misma revisión y no necesita una pantalla de administración. Se pasa a una tabla del API cuando
  haga falta una de dos cosas:
  - que alguien que no programa escriba las notas;
  - saber quién leyó cada una.
- **GitHub Release.** El mismo archivo genera el texto del GitHub Release de cada tag, para no
  escribirlo dos veces.

### 2.3 Niveles

| Nivel | Cuándo | Cómo se ve |
| --- | --- | --- |
| `informativa` | Ajustes visuales, textos, mejoras que no cambian cómo se trabaja | Solo el punto en «Novedades»; sin banner |
| `recomendada` | Pantallas, modales o filtros nuevos; algo que se segmenta distinto | Banner discreto: «Recarga cuando termines» |
| `requerida` | El contrato con el API cambió y la versión vieja puede fallar | Banner fijo en tono de aviso; pide recargar después de guardar |

Ningún nivel recarga a la fuerza.

## 3. A quién se le avisa

- **Filtro por módulos.** El aviso de una versión sale solo si alguno de sus `modules` está en los
  `my_modules` de la persona, en cualquiera de sus áreas. Es el mismo dato que ya decide la barra
  lateral (`docs/workspace-access.md`).
- **Ejemplo.** Una versión del cotizador solo la ven quienes tienen acceso a cotizaciones. Un usuario
  de PQRSF no ve nada. Su navegador igual se pone al día con la recarga automática del punto 2.1 la
  próxima vez que navegue.
- **Notas de toda la plataforma.** Una versión que toca a todos (la barra lateral, el inicio de
  sesión) usa `modules: ["*"]`.
- **Varias versiones pendientes.** Si la persona se saltó varias, el modal las muestra todas, de la
  más reciente a la más vieja, filtradas por sus módulos.

## 4. Cómo se ve, sin interrumpir la operación

1. **Banner.** Va en el encabezado del workspace, no como modal:
   «Hay una versión nueva del Cotizador (1.3.0). Recarga cuando termines lo que estás haciendo ·
   Ver qué cambió · Recargar».
2. **Modal «Qué cambió».** Lista los `changes` de cada versión pendiente para sus módulos.
3. **«Recargar» no pierde trabajo.**
   - Si el editor tiene cambios sin guardar, primero guarda con el autoguardado que ya existe
     (`useLineEditor.saveNow`) y luego recarga.
   - Si el guardado falla, no recarga y dice por qué.
4. **Cerrar el banner.** «Más tarde» lo oculta hasta el próximo despliegue o hasta 1 hora. Una
   versión `requerida` no se cierra; solo se puede posponer mientras se guarda.
5. **Lo ya visto.** La última versión vista se guarda por persona en `localStorage`
   (`jdh-release-seen`). Tras recargar, el modal sale una sola vez para lo que no había visto. Si
   el almacenamiento está bloqueado, se recuerda en memoria hasta recargar.
6. **Historial.** Un enlace «Novedades» en el menú de la cuenta abre el historial completo,
   filtrado por los módulos de la persona.

Accesibilidad:

- El banner es una región `role="status"`. Una versión `requerida` usa `role="alert"`.
- El modal sigue las reglas de `DESIGN.md` para diálogos.

## 5. Coordinación con el API

- **Versión del API en su health.** El API publica su propia versión en su health.
- **`requiresApi`.** Si una versión de la UI depende de un cambio del API (como pasó con
  JDH-INTERNAL-PLATFORM#121, que dependía del API #99), la nota lo dice con `requiresApi`.
  - Mientras el API desplegado sea más viejo, la UI oculta lo que depende de él, sin romperse.
  - Ya se hace así con los KPIs del maestro de apoyos, que se ocultan si `/summary` responde 404.
- **Orden de despliegue.** Primero el API y después la UI, o juntos. Nunca la UI antes que el API
  del que depende.

## 6. Numeración

- **SemVer para toda la plataforma** (una sola versión, no una por módulo):
  - **mayor:** algo deja de funcionar como antes, o cambia la forma de trabajar de un módulo;
  - **menor:** funciones, pantallas o filtros nuevos;
  - **parche:** correcciones.
- **Tag por versión.** Cada versión es un tag `vX.Y.Z` en `master`, sobre el commit del merge que
  la cierra. Los despliegues entre tags no son versiones: se ponen al día en silencio (punto 2.1).
- **Un solo número en la app.** El pie del inicio de sesión (`siteConfig.version`, hoy fijo
  «v1.0.0 · Fase 1») pasa a leer la versión de `RELEASES[0].version`.

## 7. Flujo de una versión

1. El PR del cambio agrega o completa la entrada en `releases.ts` (versión, módulos, nivel, cambios).
2. Al fusionar, el CD despliega con el SHA como `deploymentId`.
3. Se crea el tag `vX.Y.Z` y su GitHub Release con el texto de la nota.
4. Los navegadores abiertos ven el banner cuando les toca, solo si la versión toca sus módulos.

## 8. Implementación

1. `deploymentId` en `next.config.ts`, y el SHA como argumento de build en el Dockerfile y en
   `deploy/deploy.sh`.
2. `src/app/api/version/route.ts`.
3. `src/shared/config/releases.ts` con el tipo `Release` y la primera entrada (la versión estándar
   inicial).
4. Un hook `useNewVersion()` en `src/shared/hooks/`. Junta la consulta a `/api/version`, el
   `data-dpl-id`, los `my_modules` y lo ya visto.
5. El banner en el encabezado del workspace y el modal «Qué cambió». El enlace «Novedades» va en el
   menú de la cuenta.
6. La guarda de «Recargar» con el autoguardado del cotizador. Los demás editores con guardado
   pendiente se suman igual.

## 9. Pendiente de decidir

- **La vista general (intranet) también.** Hoy la propuesta cubre el workspace. La vista general
  tiene su propio encabezado (`docs/intranet-port.md`) y necesitaría su propio lugar para el
  banner.
- **Quién lee las notas.** Si se necesita saber quién leyó cada versión, se mueve lo ya visto a una
  tabla del API (sección 2.2).
- **Quién escribe las notas.** Si las escribe alguien que no programa, se pasan al API con una
  pantalla en TI › Administración.
