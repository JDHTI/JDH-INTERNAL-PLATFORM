---
version: 1.0
name: JDH-internal-platform
description: Sistema de diseño monocromo cálido para la plataforma interna de Juan D. Hoyos Distribuciones. Densidad alta, jerarquía por superficie y tipografía, cero decoración. El color es un recurso escaso reservado para estado y acción, nunca para adorno.
extends: easy-point-ui (estructura de tokens y gramática de componentes)
brand-source: Neutrales cálidos oficiales JDH
---

# DESIGN.md — Plataforma Interna JDH

Contrato visual de `internal-platform-ui`. Define tokens, gramática de componentes y reglas
no negociables. Todo valor aquí está medido, no estimado: las razones de contraste de este
documento se calcularon con un verificador WCAG y se citan con su valor real.

**Alcance.** Este documento gobierna la **interfaz de la aplicación**. No gobierna los
**documentos generados** (PDF, formatos, correos formales), que se rigen por el manual de
marca — logo azul corporativo y tipografía Arial. Son dos problemas de diseño distintos con
restricciones distintas, y confundirlos produce aplicaciones que parecen documentos de Word.
→ `internal-platform-docs/10-Plataforma/Contrato-de-plataforma/04-Interfaz-y-design-system.md`

---

## 1. De dónde sale este sistema

Se extrajo de `easy-point-ui` (Next.js 16 + Tailwind v4 + shadcn sobre Base UI). Ese repo
contiene **dos sistemas de diseño que se contradicen**, y esa contradicción es la lección
más importante que trajimos:

| | `docs/DESIGN.md` de easy-point | Implementación real (`shared/components/ui/`) |
|---|---|---|
| Texto base | 17px | 14px (`text-sm`) |
| Radio de acción | `pill` 9999px | `rounded-md` (~6.4px) |
| Alto de control | ~44px | 36px (`h-9`) |
| Padding de sección | 80px | 16px (`space-y-4`) |
| Color de acción | primario cromático saturado | `bg-primary` neutro configurable |

El primero es un análisis de una **web de marketing** (Apple). El segundo es lo que de hecho
se construyó para operar un ERP. Para una plataforma interna —tablas densas, formularios
largos, uso diario y prolongado— **manda el segundo**. Adoptamos su densidad y descartamos
las proporciones editoriales.

Lo que sí heredamos del análisis: la disciplina de tokens semánticos, la prohibición de hex
inline, la jerarquía por alternancia de superficie en vez de bordes pesados, y la sobriedad
de sombras.

---

## 2. Principios

1. **La densidad es una función, no una estética.** Un jefe de bodega revisa 200 filas. Cada
   píxel de aire vertical le cuesta una fila de contexto. El aire se gasta donde separa
   grupos, no donde decora.
2. **El color significa algo o no existe.** Este es un sistema monocromo. Si algo tiene color,
   es porque comunica estado (éxito, error, alerta) o acción. Nunca porque "se ve bien".
3. **La jerarquía se construye con superficie y peso tipográfico**, no con bordes ni sombras.
4. **Un solo acento.** Toda señal de "esto se puede pulsar" es `--primary`. No hay segundo color de acción.
5. **Todo estado tiene su pantalla.** Vacío, cargando, error y sin permisos no son casos borde:
   son cuatro de las cinco pantallas que un usuario ve. Diseñarlas es parte del componente.
6. **Accesibilidad como piso, no como meta.** AA (4.5:1 texto, 3:1 controles) es el mínimo para
   fusionar, no un objetivo aspiracional.

---

## 3. Color

### 3.1 Capa primitiva — neutrales cálidos oficiales JDH

Estos son los únicos grises del sistema. **No se inventan grises nuevos.** Cuando se necesita
un tono intermedio, se compone con un overlay sobre la superficie, nunca agregando una
primitiva.

```css
:root {
  /* Neutrales cálidos oficiales JDH — capa primitiva */
  --neutral-0:   #ffffff; /* Blanco JDH */
  --neutral-100: #f2f2f2; /* gris muy claro (accent3) */
  --neutral-200: #d9d9d9; /* gris claro (accent5) */
  --neutral-300: #c8c8c4; /* gris medio-claro (folHlink) */
  --neutral-500: #919189; /* gris medio (accent6) */
  --neutral-700: #343430; /* gris oscuro (accent1) */
  --neutral-900: #1d1d1b; /* Negro JDH */

  /* Overlays — separación sin introducir grises nuevos */
  --overlay-on-dark-04:  rgba(255, 255, 255, 0.04);
  --overlay-on-dark-08:  rgba(255, 255, 255, 0.08);
  --overlay-on-dark-12:  rgba(255, 255, 255, 0.12);
  --overlay-on-dark-64:  rgba(255, 255, 255, 0.64);
  --overlay-on-light-04: rgba(29, 29, 27, 0.04);
  --overlay-on-light-08: rgba(29, 29, 27, 0.08);
  --overlay-on-light-64: rgba(29, 29, 27, 0.64); /* añadido: simétrico de -dark-64 */
}
```

> **`--overlay-on-light-64` es una adición a la paleta entregada.** Es obligatoria y el motivo
> está medido en §3.5: sin ella no existe ningún color de texto secundario que pase AA sobre
> superficies claras. No es un gris nuevo — es la misma primitiva `--neutral-900` a 64%,
> exactamente la técnica que la paleta ya usa en el lado oscuro.

### 3.2 La escala tiene un hueco deliberado

Entre `--neutral-300` (#c8c8c4) y `--neutral-500` (#919189) hay un salto grande, y entre
`--neutral-500` y `--neutral-700` (#343430) hay un abismo. Esto **no es un defecto de la
paleta**: fuerza que no existan siete niveles de gris compitiendo en la misma pantalla. Tres
superficies y dos niveles de texto es todo lo que el sistema permite. Resistir la tentación
de rellenar el hueco es parte de mantener el sistema.

### 3.3 Capa semántica

Los componentes **solo** consumen estos tokens. Un hex dentro de un componente es un bug.

| Token | Rol |
|---|---|
| `--canvas` | Fondo base de la página |
| `--canvas-subtle` | Fondo alterno; crea ritmo entre secciones |
| `--surface` | Tarjetas, modales, popovers, filas elevadas |
| `--surface-raised` | Un escalón sobre `--surface` (menús sobre tarjeta) |
| `--surface-inverse` | Superficie de alto contraste (sidebar, barra global) |
| `--text-primary` | Titulares y cuerpo |
| `--text-secondary` | Metadatos, ayudas, etiquetas de columna |
| `--text-disabled` | Texto inactivo |
| `--text-on-primary` | Texto garantizado legible sobre `--primary` |
| `--text-on-inverse` | Texto sobre `--surface-inverse` |
| `--primary` | Color de acción y marca en la UI |
| `--primary-hover` | Estado hover de la acción |
| `--primary-subtle` | Fondo teñido para estados seleccionados |
| `--border` | Separadores decorativos (tablas, divisores) |
| `--border-control` | Borde de controles interactivos (inputs, selects) |
| `--ring` | Anillo de foco |
| `--success` / `--warning` / `--danger` / `--info` | Estados semánticos |
| `--*-surface` | Fondo teñido del estado correspondiente (alerts) |
| `--*-badge` | El mismo tinte, opaco: fondo de badges (§7.5) |
| `--file-*` | Íconos de formato del gestor documental, y nada más (§3.7) |
| `--project-*` | Color que el equipo da a carpetas y proyectos, con la receta de §7.7 (§3.8) |

### 3.4 Mapeo por tema

**Tema claro (`:root`)**

```css
:root {
  --canvas:          var(--neutral-0);
  --canvas-subtle:   var(--neutral-100);
  --surface:         var(--neutral-0);
  --surface-raised:  var(--neutral-0);
  --surface-inverse: var(--neutral-900);

  --text-primary:    var(--neutral-900);
  --text-secondary:  var(--overlay-on-light-64);
  --text-disabled:   var(--neutral-500);
  --text-on-primary: var(--neutral-0);
  --text-on-inverse: var(--neutral-0);

  --primary:         var(--neutral-900);
  --primary-hover:   var(--neutral-700);
  --primary-subtle:  var(--overlay-on-light-08);

  --border:          var(--neutral-200);
  --border-control:  var(--neutral-500);
  --ring:            var(--neutral-900);

  --success: #067647;  --success-surface: rgba(6, 118, 71, 0.08);
  --warning: #b54708;  --warning-surface: rgba(181, 71, 8, 0.08);
  --danger:  #b42318;  --danger-surface:  rgba(180, 35, 24, 0.08);
  --info:    #175cd3;  --info-surface:    rgba(23, 92, 211, 0.08);
}
```

**Tema oscuro (`.dark`)**

```css
.dark {
  --canvas:          var(--neutral-900);
  --canvas-subtle:   #151513;              /* neutral-900 + overlay-on-light-04 aplanado */
  --surface:         color-mix(in srgb, var(--neutral-0) 4%, var(--neutral-900));
  --surface-raised:  color-mix(in srgb, var(--neutral-0) 8%, var(--neutral-900));
  --surface-inverse: var(--neutral-0);

  --text-primary:    var(--neutral-0);
  --text-secondary:  var(--overlay-on-dark-64);
  --text-disabled:   var(--neutral-500);
  --text-on-primary: var(--neutral-900);
  --text-on-inverse: var(--neutral-900);

  --primary:         var(--neutral-0);
  --primary-hover:   var(--neutral-200);
  --primary-subtle:  var(--overlay-on-dark-08);

  --border:          var(--overlay-on-dark-08);
  --border-control:  var(--overlay-on-dark-12);
  --ring:            var(--neutral-0);

  --success: #47cd89;  --success-surface: rgba(71, 205, 137, 0.12);
  --warning: #fdb022;  --warning-surface: rgba(253, 176, 34, 0.12);
  --danger:  #f97066;  --danger-surface:  rgba(249, 112, 102, 0.12);
  --info:    #84adff;  --info-surface:    rgba(132, 173, 255, 0.12);
}
```

> **La inversión del primario es intencional.** En claro, la acción es negra sobre blanco. En
> oscuro, es blanca sobre negro. El sistema no tiene un color de marca cromático en la UI, así
> que el "acento" es siempre el extremo opuesto del lienzo. Esto hace que un botón primario sea
> el elemento de mayor contraste de la pantalla en ambos temas — exactamente lo que debe ser.

### 3.5 Contraste verificado

Medido con verificador WCAG. **Estos números son resultados, no estimaciones.**

**Tema claro**

| Primer plano | Fondo | Ratio | Texto normal (4.5) | Veredicto |
|---|---|---|---|---|
| `--neutral-900` #1d1d1b | `--neutral-0` #ffffff | **16.88** | ✅ | Texto primario |
| `--neutral-900` #1d1d1b | `--neutral-100` #f2f2f2 | **15.08** | ✅ | Texto primario sobre subtle |
| `--neutral-700` #343430 | #ffffff | **12.50** | ✅ | Énfasis alterno |
| `overlay-on-light-64` → #6e6e6d | #ffffff | **5.10** | ✅ | **Texto secundario** |
| `overlay-on-light-64` → #696968 | #f2f2f2 | **4.91** | ✅ | Texto secundario sobre subtle |
| `--neutral-500` #919189 | #ffffff | **3.17** | ❌ | Solo texto grande / bordes |
| `--neutral-500` #919189 | #f2f2f2 | **2.84** | ❌ | **No usar para texto** |
| `--neutral-300` #c8c8c4 | #ffffff | **1.68** | ❌ | Solo decorativo |
| `--neutral-200` #d9d9d9 | #ffffff | **1.41** | ❌ | Solo divisores decorativos |

**Tema oscuro (sobre `--neutral-900` #1d1d1b)**

| Primer plano | Ratio | Texto normal (4.5) | Veredicto |
|---|---|---|---|
| `--neutral-0` #ffffff | **16.88** | ✅ | Texto primario |
| `--neutral-300` #c8c8c4 | **10.06** | ✅ | Texto secundario alterno |
| `overlay-on-dark-64` → #adadac | **7.52** | ✅ | **Texto secundario** |
| `--neutral-500` #919189 | **5.32** | ✅ | Deshabilitado legible |

**Estados semánticos**

| Estado | Claro / #ffffff | Oscuro / #1d1d1b |
|---|---|---|
| Éxito | #067647 — **5.69** ✅ | #47cd89 — **8.33** ✅ |
| Alerta | #b54708 — **5.43** ✅ | #fdb022 — **9.17** ✅ |
| Error | #b42318 — **6.57** ✅ | #f97066 — **6.06** ✅ |
| Info | #175cd3 — **5.99** ✅ | #84adff — **7.56** ✅ |

**Badges de estado (texto `--{estado}` sobre `--{estado}-badge`)**

El fondo `--*-surface` es translúcido: sobre una fila en hover (`--primary-subtle`) se oscurece
y la alerta cae a **4.16** ❌. Por eso el badge usa `--*-badge`, el mismo tinte mezclado con el
lienzo y opaco (`color-mix`, 8% en claro sobre `--neutral-0`, 12% en oscuro sobre
`--neutral-900`), que no cambia bajo la fila.

| Estado | Claro | Oscuro |
|---|---|---|
| Éxito | #067647 / #ebf4f0 · **5.08** ✅ | #47cd89 / #223228 · **6.66** ✅ |
| Alerta | #b54708 / #f9f0eb · **4.83** ✅ | #fdb022 / #382f1c · **7.17** ✅ |
| Error | #b42318 / #f9edec · **5.75** ✅ | #f97066 / #372724 · **5.10** ✅ |
| Info | #175cd3 / #ecf2fc · **5.32** ✅ | #84adff / #292e36 · **6.11** ✅ |
| Neutro | #1d1d1b / `--canvas-subtle` #f2f2f2 · **15.08** ✅ | #ffffff / #151513 · **18.28** ✅ |

**Banda de aviso (texto sobre `--warning-surface` aplanado; monitoreo del DWH)**

| Primer plano | Claro (sobre #f9f0eb) | Oscuro (sobre #382f1c) |
|---|---|---|
| `--text-secondary` | #6c6966 · **4.85** ✅ | #b7b4ad · **6.37** ✅ |
| `--warning` | #b54708 · **4.83** ✅ | #fdb022 · **7.17** ✅ |

**Fila teñida por estado (tabla del cotizador)**

`--danger-surface` y `--warning-surface` aplanados sobre `--surface`. Sobre la fila van
`--text-primary`, `--text-secondary` y badges (fondo opaco `--*-badge`). **`--danger` como
texto suelto sobre la fila roja no pasa en oscuro**, así que un error dentro de la fila va en
badge, nunca en texto rojo directo.

| Primer plano | Claro | Oscuro |
|---|---|---|
| `--text-primary` sobre fila roja | #1d1d1b / #f9edec · **14.76** ✅ | #ffffff / #41312e · **12.33** ✅ |
| `--text-secondary` sobre fila roja | #6c6866 / #f9edec · **4.82** ✅ | #bbb5b4 / #41312e · **6.09** ✅ |
| `--text-secondary` sobre fila ámbar | #6c6966 / #f9f0eb · **4.85** ✅ | #bbb8b1 / #42382a · **5.79** ✅ |
| `--warning` sobre fila ámbar (ícono) | #b54708 / #f9f0eb · **4.83** ✅ | #fdb022 / #42382a · **6.23** ✅ |
| `--danger` sobre fila roja | #b42318 / #f9edec · **5.75** ✅ | #f97066 / #41312e · **4.42** ❌ — no usar |
| `--text-primary` sobre fila azul (revalidada, 2,5 s) | #1d1d1b / #ecf2fc · **15.01** ✅ | #ffffff / #333840 · **11.79** ✅ |
| `--text-secondary` sobre fila azul | #686a6c / #ecf2fc · **4.83** ✅ | #b6b7ba / #333840 · **5.88** ✅ |
| `--success` sobre banda ámbar (ícono del resumen al pegar) | #067647 / #f9f0eb · **5.07** ✅ | #47cd89 / #42382a · **5.66** ✅ |

**Opción elegida en una lista de opciones (formulario público de PQRSF)**

La descripción de cada opción va en `--text-secondary`; la opción elegida se pinta con
`--primary-subtle` (aplanado sobre `--surface`).

| Primer plano | Claro (sobre #ededed) | Oscuro (sobre #373735) |
|---|---|---|
| `--text-secondary` | #686867 · **4.76** ✅ | #b7b7b6 · **5.94** ✅ |

**Gantt del monitoreo (marcas gráficas, umbral 3:1 de WCAG 1.4.11)**

El contorno del día típico y la ETA usan `--text-secondary` como borde, no `--border-control`:
en oscuro, `--border-control` es blanco al 12% y no llega a 3:1.

| Marca | Claro (sobre `--surface` #ffffff) | Oscuro (sobre `--surface` #282826) |
|---|---|---|
| Contorno `--text-secondary` | #6e6e6d · **5.10** ✅ | #b2b2b1 · **6.96** ✅ |
| Barra real `--primary` | #1d1d1b · **16.88** ✅ | #ffffff · **14.77** ✅ |
| Barra fallida `--danger` | #b42318 · **6.57** ✅ | #f97066 · **5.30** ✅ |

**Confirmación de borrado (botón `danger` sólido, solo dentro del modal)**

| Tema | Texto / Fondo | Ratio |
|---|---|---|
| Claro | `--text-on-primary` #ffffff / `--danger` #b42318 | **6.57** ✅ |
| Oscuro | `--text-on-primary` #1d1d1b / `--danger` #f97066 | **6.06** ✅ |

**Íconos de formato (marca `--file-mark` sobre la hoja; ver §3.7)**

PDF, Word, hoja de cálculo y presentación reusan `--danger`, `--info`, `--success` y
`--warning`, así que sus ratios son los de la tabla de estados. Los dos tonos propios:

| Familia | Claro: #ffffff sobre | Oscuro: #1d1d1b sobre |
|---|---|---|
| Imagen `--file-image` | #6941c6 — **6.62** ✅ | #b692f6 — **6.78** ✅ |
| Otros `--file-other` | #343430 — **12.50** ✅ | #c8c8c4 — **10.06** ✅ |

**Colores de proyecto (texto `--text-primary` sobre el tinte; ver §3.8)**

Peores casos medidos: en claro, el tinte más oscuro; en oscuro, el más luminoso.

| Tema | Tinte | Texto / Fondo | Ratio |
|---|---|---|---|
| Claro | azul al 14% sobre #ffffff | #1d1d1b / #e2edf3 | **14.18** ✅ |
| Claro | verde al 14% sobre #ffffff | #1d1d1b / #e5eee9 | **14.26** ✅ |
| Oscuro | amarillo al 24% sobre `--surface` | #ffffff / #4d412d | **9.95** ✅ |
| Oscuro | rojo al 24% sobre `--surface` | #ffffff / #52312f | **11.42** ✅ |

### 3.6 Reglas de color

- **`--neutral-500` (#919189) nunca es color de texto en tema claro.** Falla AA sobre blanco
  (3.17) y falla incluso para texto grande sobre `--canvas-subtle` (2.84). Es un color de
  **borde de control** y de **icono decorativo**, no de texto. Este es el error más fácil de
  cometer con esta paleta y el que hay que vigilar en revisión.
- **Bordes decorativos ≠ bordes de control.** `--border` (#d9d9d9, 1.41) separa filas de tabla
  y no necesita contraste porque no transporta información. `--border-control` (#919189, 3.17)
  delimita un input y **sí** debe cumplir 3:1 (WCAG 1.4.11). Usar `--border` en un input es un
  fallo de accesibilidad, no una preferencia estética.
- **El estado nunca se comunica solo con color.** Un badge de error lleva color **y** texto.
  Una fila inválida lleva color **y** icono. Daltonismo y monitores mal calibrados son la norma
  en bodega, no la excepción.
- **Sin gradientes decorativos.** La profundidad viene de la alternancia de superficie.
- **Sin hex inline.** Si un componente necesita un color que no está en §3.3, el sistema está
  incompleto: se discute el token, no se parchea el componente.

### 3.7 Familias de formato

El gestor documental muestra cada archivo con una hoja de esquina doblada coloreada por
familia: la convención que la gente ya trae de Office y del explorador de archivos, así que
se reconoce el tipo antes de leer la extensión.

| Token | Familia | Extensiones |
|---|---|---|
| `--file-pdf` → `--danger` | PDF | pdf |
| `--file-doc` → `--info` | Documento | doc, docx |
| `--file-sheet` → `--success` | Hoja de cálculo | xls, xlsx, xlsm, csv |
| `--file-slide` → `--warning` | Presentación | ppt, pptx |
| `--file-image` | Imagen | png, jpg, jpeg |
| `--file-other` | Comprimido, texto | zip, txt |
| `--file-mark` | Marca interior (líneas, cuadrícula, paisaje…) | todas |

- **Solo dentro del ícono de formato.** Estos tokens no pintan texto, fondos de fila ni
  badges. Que el PDF use el rojo de `--danger` no lo convierte en un error: el color vive
  dentro de una hoja de 20×24px y nunca fuera de ella.
- **La extensión siempre va escrita al lado.** El color no es la única señal (§3.6).
- Un formato nuevo se asigna a una familia existente; una familia nueva se discute aquí.

### 3.8 Colores de proyecto

En el gestor de proyectos, cada carpeta y cada proyecto puede llevar un color que elige el
equipo. La API no guarda un hex sino una llave de paleta (`gray`, `brown`, `orange`, `yellow`,
`green`, `blue`, `purple`, `pink`, `red`, o `default` para ninguno), y cada llave resuelve a un
token `--project-<llave>` con un tono para claro y otro un escalón más luminoso para oscuro.

| Token | Claro | Oscuro |
|---|---|---|
| `--project-gray` | #787774 | #9b9b9b |
| `--project-brown` | #9f6b53 | #ba856f |
| `--project-orange` | #d9730d | #c77d48 |
| `--project-yellow` | #cb912f | #ca9849 |
| `--project-green` | #448361 | #529e72 |
| `--project-blue` | #337ea9 | #5e87c9 |
| `--project-purple` | #9065b0 | #9d68d3 |
| `--project-pink` | #c14c8a | #d15796 |
| `--project-red` | #d44c47 | #df5452 |

- **Se pintan con la receta de etiquetas (§7.7):** punto sólido de 8px, tinte al 14% (claro) o
  24% (oscuro) sobre `--surface`, y texto siempre `--text-primary`. Así el texto pasa AA con
  cualquier tono de la tabla; los ratios medidos están en §3.5.
- **Organizan, no comunican estado.** El estado del proyecto va en su badge (§7.5). El color
  es una marca que el equipo pone para agrupar, y siempre va junto al nombre, nunca solo.
- `default` no tiene token: la carpeta o el proyecto queda sin punto ni tinte.

---

## 4. Tipografía

### 4.1 Familia

```css
--font-sans: var(--font-centrale), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
```

**Centrale Sans, la tipografía oficial.** Está licenciada para web y vive en
`public/fonts/` (woff2), cargada con `next/font/local` desde `src/app/fonts.ts`.

Esto revierte una decisión anterior. Mientras Centrale Sans no estuvo disponible, la UI usaba
**Inter** y este documento argumentaba en contra de la tipografía de marca: Arial es el
sustituto aprobado por Mercadeo **para documentos generados**, y no tiene cifras tabulares, así
que las columnas numéricas bailan. Ese argumento aplicaba a Arial, no a Centrale Sans.
**Centrale Sans sí trae `tnum`** — verificado leyendo la tabla GSUB del woff2, no supuesto — de
modo que la marca y la exigencia de cifras tabulares dejan de estar en conflicto. Inter sale.

La regla del manual de marca se sigue respetando donde aplica: el PDF que sale de la plataforma
va en Arial cuando Centrale Sans no está instalada en el equipo que lo abre. La UI ya no
necesita esa concesión porque sirve la fuente ella misma.

**Pesos disponibles:** 300 light · 400 regular · 500 medium · 700 bold, cada uno con su itálica.
**No hay 600.** El archivo bold se declara sobre el rango `600 700`, así que `font-semibold`
resuelve al bold real en lugar de un falso bold sintetizado por el navegador.

**Cifras tabulares son obligatorias** en toda columna numérica, total, precio o cantidad:

```css
.tabular { font-variant-numeric: tabular-nums; }
```

Sin esto, los montos de una tabla no se alinean por unidad y el usuario no puede comparar
magnitudes de un vistazo — que es literalmente para lo que sirve una columna de dinero.

### 4.2 Escala

Ancla en 14px, no en 16px. Es una herramienta de trabajo, no un artículo de lectura.

| Token | Tamaño | Peso | Line-height | Tracking | Uso |
|---|---|---|---|---|---|
| `display` | 30px | 600 | 1.2 | -0.02em | Título de pantalla de bienvenida (raro) |
| `title-lg` | 24px | 600 | 1.25 | -0.01em | Título de página |
| `title` | 20px | 600 | 1.3 | -0.01em | Título de modal, encabezado de sección |
| `subtitle` | 16px | 600 | 1.4 | 0 | Encabezado de tarjeta, agrupador |
| `body` | 14px | 400 | 1.5 | 0 | **Cuerpo por defecto, celdas de tabla, inputs** |
| `body-strong` | 14px | 600 | 1.5 | 0 | Énfasis en celda, valor destacado |
| `caption` | 13px | 400 | 1.45 | 0 | Metadatos, texto de ayuda bajo un campo |
| `label` | 13px | 500 | 1.4 | 0 | Etiqueta de campo de formulario |
| `overline` | 11px | 600 | 1.3 | 0.06em | Encabezado de columna, mayúsculas |
| `mono` | 13px | 400 | 1.5 | 0 | IDs, SKU, códigos, JSON |

### 4.3 Reglas

- **La escalera de pesos es 400 / 500 / 700.** El 500 se reserva para etiquetas de formulario;
  el 700 para todo énfasis. El 300 (light) se limita a las etiquetas de las utilidades
  Sugerencias y Configuración en el pie de la sidebar; no se usa en texto operativo de
  13–14px porque pierde legibilidad en pantallas de bodega.
- **Tracking negativo solo a 20px o más.** A 14px empeora la legibilidad en vez de mejorarla.
- **Line-height 1.5 en cuerpo, 1.2–1.3 en títulos.** No se comprime por debajo para ganar filas.
- **Los identificadores van en mono.** Un SKU, un consecutivo de PQRSF o un UUID en tipografía
  proporcional se lee mal y se transcribe peor.
- **Nunca centrar texto de más de una línea.** Ni en estados vacíos.

---

## 5. Espaciado y layout

### 5.1 Escala

Base 4px. La estructura se alinea a múltiplos de 4; nada se sale de la escala.

```
space-1: 4px    space-2: 8px    space-3: 12px   space-4: 16px
space-5: 20px   space-6: 24px   space-8: 32px   space-10: 40px   space-12: 48px
```

### 5.2 Densidad aplicada

| Contexto | Valor |
|---|---|
| Padding de celda de tabla | `8px 12px` (`py-2 px-3`) |
| Alto de fila de tabla | 40px |
| Separación entre bloques de página | `16px` (`space-y-4`) |
| Padding de tarjeta | `16px`; `24px` solo en modal |
| Gap entre campos de formulario | `16px` |
| Gap de grilla de formulario | `16px` columna, `20px` fila |
| Padding de página | `16px` móvil, `24px` escritorio |
| Ancho máximo de contenido | Sin límite en tablas; `640px` en formularios de columna única |

### 5.3 Shell de la aplicación

La intranet es el shell: un módulo aparece **dentro** de la navegación unificada, con sesión
única. No se levanta como aplicación con su propio login y su propia URL suelta.

```
┌──────────┬────────────────────────────────────┐
│          │  Header 72px · migas + usuario     │
│ Sidebar  ├────────────────────────────────────┤
│  260px   │                                    │
│          │  Área de contenido                 │
│ surface- │  padding 24px · scroll propio      │
│ inverse  │                                    │
└──────────┴────────────────────────────────────┘
```

- **Sidebar:** 260px expandido, 64px colapsado, sobre `--sidebar`. Es la única superficie de
  alto contraste permanente; da anclaje espacial sin competir con el contenido.

> **La sidebar no usa `--surface-inverse`.** Ese token se invierte con el tema, así que en
> tema oscuro la sidebar saldría blanca — un bloque luminoso junto a un lienzo negro. La
> sidebar es oscura **en ambos temas** porque es un ancla permanente, no una superficie que
> alterna. Por eso tiene su propia familia: `--sidebar`, `--sidebar-foreground`,
> `--sidebar-muted`, `--sidebar-border`, `--sidebar-hover`, `--sidebar-active`. En claro
> `--sidebar` es `--neutral-900`; en oscuro baja a `#151513` para no competir con el canvas.
> Contraste medido: blanco sobre `#1d1d1b` = **16.88:1**; `--sidebar-muted` = **7.52:1**.
- **Header:** 72px, sobre `--sidebar` con borde inferior `--sidebar-border`. La card empieza
  12px debajo del borde superior del rail y mide 48px; su centro queda en y=36. El header
  comparte esa línea media, así el breadcrumb queda alineado verticalmente con el contenido
  de la card. En escritorio, su padding izquierdo de 12px también alinea el logo con el borde
  exterior de la card. El borde inferior del header queda 12px debajo del de la card.
- **Contenido:** scroll independiente. El header y el sidebar nunca se van con el scroll.

---

## 6. Forma, elevación y movimiento

### 6.1 Radios

```
--radius-sm:  4px   /* badges, chips, checkbox */
--radius-md:  6px   /* botones, inputs, selects — el radio por defecto */
--radius-lg:  8px   /* tarjetas, contenedor de tabla */
--radius-xl:  12px  /* modales, popovers */
--radius-full: 9999px /* avatares, puntos de estado — nunca botones */
```

**El radio pill está prohibido en botones.** Es la firma de una web de marketing y en una
herramienta densa desperdicia ancho horizontal. Los botones son `--radius-md`.

### 6.2 Elevación

| Nivel | Tratamiento | Uso |
|---|---|---|
| 0 | Sin sombra ni borde | Contenido sobre canvas |
| 1 | Borde `1px --border` | Tarjetas, contenedor de tabla |
| 2 | `0 1px 2px rgba(29,29,27,.06)` + borde | Dropdowns, popovers |
| 3 | `0 8px 24px rgba(29,29,27,.12)` + borde | Modales |

En tema oscuro las sombras no se ven: la elevación se comunica **subiendo la superficie**
(`--surface` → `--surface-raised`), no oscureciendo. Una sombra negra sobre negro es ruido.

**Sin glassmorphism.** El `backdrop-filter` de la referencia es decoración que cuesta
rendimiento en los equipos de bodega y reduce el contraste del texto encima. No se usa.

### 6.3 Movimiento

```
--duration-fast:   120ms  /* hover, foco, cambio de color */
--duration-base:   200ms  /* apertura de dropdown, expansión */
--duration-slow:   300ms  /* entrada de modal, transición de panel */
--ease-out:        cubic-bezier(0.16, 1, 0.3, 1)
--ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1)
```

- **El movimiento confirma, no entretiene.** Una animación existe para explicar de dónde salió
  un elemento o que una acción se registró.
- **Solo `transform` y `opacity`.** Animar `width`, `height`, `top` o `left` provoca reflow.
- **Press state:** `translateY(1px)`. Sin `scale`.
- **`prefers-reduced-motion: reduce` desactiva toda transición.** No es opcional:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Gramática de componentes

### 7.1 Botones

Alto 36px (`h-9`), radio `--radius-md`, texto `body` peso 500, icono 16px.

| Variante | Fondo | Texto | Uso |
|---|---|---|---|
| `primary` | `--primary` | `--text-on-primary` | **Una por pantalla.** La acción principal |
| `secondary` | `--canvas-subtle` | `--text-primary` | Acciones de apoyo |
| `outline` | transparente + `--border-control` | `--text-primary` | Acción terciaria, cancelar |
| `ghost` | transparente | `--text-secondary` | Acciones de fila, iconos de tabla |
| `danger` | `--danger-surface` | `--danger` | Eliminar, anular |

- **Una sola acción primaria por vista.** Dos botones negros compitiendo significa que la
  jerarquía no se decidió.
- **`danger` usa fondo teñido, no sólido.** Un botón rojo sólido en una tabla grita antes de
  que el usuario haya hecho nada malo. El rojo sólido se reserva para la confirmación dentro
  del modal de borrado.
- **Tamaños:** `sm` 32px (dentro de tablas y toolbars), `default` 36px, `lg` 40px (formularios
  de página completa).
- **Estado de carga:** spinner **reemplazando** el icono, ancho del botón congelado, texto
  intacto. Un botón que cambia de ancho al cargar desplaza el layout bajo el cursor.

### 7.2 Campos de formulario

- Alto 36px, radio `--radius-md`, borde `1px --border-control`, fondo transparente.
- Foco: `border-color: --ring` + `ring 3px --ring/20`. **Nunca `outline: none` sin reemplazo.**
- Etiqueta arriba, `label` 13px/500. Sin placeholders como etiqueta: desaparecen al escribir
  y dejan al usuario sin saber qué campo está llenando.
- **Obligatoriedad:** se marca lo **opcional** con «(opcional)», no lo obligatorio con asterisco.
  En formularios internos casi todo es obligatorio y una pantalla llena de asteriscos no informa.
- **Error:** borde `--danger` + mensaje debajo en `caption` color `--danger` + `aria-invalid`.
  El mensaje dice **cómo corregir**, no que algo falló: «El NIT debe tener 9 dígitos», no «Campo inválido».
- **Validación al salir del campo (`blur`), no al teclear.** Marcar un email como inválido en
  la tercera letra es hostil.
- Grilla: `gridCols: 2` ocupa la fila completa; `gridCols: 1` media fila. En móvil todo pasa a
  una columna.

### 7.3 Tabla de datos

Es la pantalla dominante de la plataforma. Su calidad determina la percepción del producto.

- Contenedor `--radius-lg` con borde `--border`. Sin sombra.
- Encabezado: `overline` 11px/600 mayúsculas, color `--text-secondary`, fondo `--canvas-subtle`, sticky.
- Fila 40px, separador inferior `1px --border`. **Sin cebrado**: el borde ya separa y el
  cebrado añade ruido en tablas largas.
- Hover de fila: `--primary-subtle`. Fila seleccionada: `--primary-subtle` + barra izquierda 2px `--primary`.
- **Alineación:** texto a la izquierda, **números y fechas a la derecha** con `tabular-nums`.
  Un total alineado a la izquierda es imposible de comparar entre filas.
- Columna de acciones al final, ancho fijo 120px, botones `ghost` `icon-sm`.
  **`e.stopPropagation()` obligatorio** en el contenedor de acciones, o el clic de editar
  dispara también el clic de fila.
- Ordenamiento: clic en encabezado, flecha 12px. Una sola columna a la vez.
- Búsqueda **siempre con debounce de 350ms**. Sin debounce se dispara una petición por tecla.
- Paginación abajo a la derecha: «X–Y de Z» + anterior/siguiente. Filtrar reinicia a página 1.
- **Filtro por sede** es transversal: va a repetirse en todos los módulos y vive en el toolbar,
  no dentro del panel de filtros avanzados.

### 7.4 Modales

- Ancho `max-w-md` (448px) confirmación, `max-w-2xl` (672px) formulario. `--radius-xl`, padding 24px.
- Fondo `--surface`, backdrop `rgba(29,29,27,0.4)` **sin blur**.
- Entrada: fade + `translateY(8px)` en `--duration-slow` con `--ease-out`.
- Foco atrapado dentro del modal; `Esc` cierra; el foco vuelve al disparador al cerrar.
- Footer alineado a la derecha: cancelar (`outline`) y luego confirmar (`primary`). En móvil se
  apilan en orden inverso, con la acción principal abajo — donde está el pulgar.
- **Un modal con formulario nunca cierra al hacer clic fuera.** Perder quince campos llenos por
  un clic accidental es inaceptable. Los modales de confirmación sí.

### 7.5 Badges de estado

`--radius-sm`, padding `2px 8px`, `caption` peso 500, fondo `--{estado}-badge`, texto `--{estado}`.
Neutro: fondo `--canvas-subtle`, texto `--text-primary`. Componente: `shared/components/ui/badge.tsx`.
**Siempre con etiqueta textual.** Un punto de color sin texto no comunica nada a quien no
conoce la convención — y el que entra mañana no la conoce.

### 7.6 Notificaciones (toast)

Esquina inferior derecha, `--radius-lg`, elevación 2, ancho máximo 400px.
Éxito 4s, error **persistente hasta descarte** — un error que se va solo es un error que nadie leyó.
Máximo tres apilados. `role="status"` para éxito, `role="alert"` para error.

### 7.7 Etiquetas con color

El color de una etiqueta lo elige el área (`#rrggbb` libre, guardado en la API), así que el
sistema no puede verificar cada par de antemano. Lo que se fija es la receta, que pasa AA con
**cualquier** color:

- Fondo: el color al **14%** sobre `--surface` en claro y al **24%** en oscuro
  (`color-mix`). Un punto de 8px con el color sólido a la izquierda del texto.
- Texto: siempre `--text-primary`, nunca el color elegido. Peor caso medido: #1d1d1b sobre
  negro al 14% (#dbdbdb) = **12.19**; blanco sobre blanco al 24% (#5a5a59) = **6.90**.
- El color es un dato del usuario que llega por `style`, no un hex del componente, y no
  rompe la regla de §3.6.
- La etiqueta sin color conserva `--canvas-subtle`, sin punto.
- El selector (`ColorPicker`, compartido) acepta hex o RGB y abre la paleta del sistema. Los
  **recientes** son de cada persona (`localStorage`, `jdh-recent-colors`, máximo 8) y se
  registran al guardar, no mientras se arrastra.
- Al subir, las etiquetas se escriben como chips en un solo campo: Enter o coma agrega, el
  cuadro de color incrustado a la derecha del campo elige el color de la próxima, y clic en
  un chip lo cambia. El color va en la misma fila que la etiqueta, no en una sección aparte.

---

## 8. Los cuatro estados obligatorios

Ningún componente de datos se considera terminado sin los cuatro. Un módulo que solo maneja el
camino feliz no está hecho.

| Estado | Tratamiento |
|---|---|
| **Cargando** | Skeleton con la forma del contenido real (filas de tabla, no un spinner centrado). El spinner solo para acciones puntuales dentro de un botón. |
| **Vacío** | Icono 32px `--text-secondary`, título `subtitle`, explicación en `caption`, y **la acción que resuelve el vacío**. Distinguir «aún no hay nada» de «el filtro no encontró nada»: el segundo ofrece limpiar el filtro, no crear un registro. |
| **Error** | Qué falló en lenguaje del usuario + botón de reintentar. Nunca un código HTTP crudo. El detalle técnico va a consola y a la traza de observabilidad. |
| **Sin permisos** | Mensaje explícito con a quién solicitar acceso. No esconder la opción: un menú que cambia de forma según el rol desorienta y genera tiquetes de soporte. |

---

## 9. Accesibilidad — piso exigible

Esto es la definición de "terminado", no una lista de deseos.

- **Contraste:** 4.5:1 texto normal, 3:1 texto grande (≥18.66px/600 o ≥24px) y controles. Verificado, no estimado.
- **Objetivo táctil:** mínimo 44×44px en móvil. En escritorio los botones de fila pueden bajar
  a 32px porque el puntero es preciso; en móvil se expanden.
- **Teclado:** todo lo accionable es alcanzable con `Tab` en orden lógico y activable con
  `Enter`/`Espacio`. Una fila con `onRowClick` necesita además `role="button"` y `tabIndex`,
  o se rompe para quien no usa ratón.
- **Foco visible siempre.** Anillo 3px `--ring/20` + borde `--ring`. Está prohibido eliminarlo.
- **Etiquetas:** todo input con `<label>` asociado por `htmlFor`. Los botones de solo icono
  llevan `aria-label`.
- **Jerarquía de encabezados** sin saltos: un `h1` por página.
- **Idioma:** `lang="es-CO"` en `<html>`.
- **Nunca solo color** para transmitir estado (§3.6).
- **`prefers-reduced-motion`** respetado (§6.3).

---

## 10. Comportamiento responsive

| Breakpoint | Ancho | Cambios |
|---|---|---|
| `sm` | ≥640px | Formularios pasan a dos columnas |
| `md` | ≥768px | Sidebar en overlay; header muestra migas |
| `lg` | ≥1024px | Sidebar fijo expandido; tabla completa |
| `xl` | ≥1280px | Columnas secundarias visibles |

**Tablas en móvil.** Una tabla de 8 columnas no cabe en 375px y el scroll horizontal es una
derrota, no una solución. Cada tabla declara sus **columnas esenciales** (máximo 3) y en móvil
se convierte en lista de tarjetas: identificador + estado + una métrica, con el resto en el
detalle. El reporte de casos ocurre en bodega y en punto de entrega, desde el teléfono: el
móvil es un caso de uso real, no una cortesía.

---

## 11. Implementación

Stack: **Next.js 16 (App Router) · TypeScript · Tailwind v4 · pnpm**.

### 11.1 Tailwind v4 es CSS-first

No hay `tailwind.config.js`. Los tokens se declaran en `src/app/globals.css` y se exponen a
Tailwind con `@theme inline`:

```css
@import "tailwindcss";

@theme inline {
  --color-canvas:          var(--canvas);
  --color-canvas-subtle:   var(--canvas-subtle);
  --color-surface:         var(--surface);
  --color-surface-inverse: var(--surface-inverse);
  --color-primary:         var(--primary);
  --color-text-primary:    var(--text-primary);
  --color-text-secondary:  var(--text-secondary);
  --color-border:          var(--border);
  --color-border-control:  var(--border-control);
  --color-success:         var(--success);
  --color-warning:         var(--warning);
  --color-danger:          var(--danger);
  --color-info:            var(--info);

  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
}
```

Esto habilita `bg-canvas`, `text-text-secondary`, `border-border-control`, etc. **Añadir un
color a un componente sin añadirlo aquí no es posible** — y esa fricción es deliberada.

### 11.2 Tema oscuro por clase

```css
@custom-variant dark (&:is(.dark *));
```

La clase `.dark` va en `<html>`, más `color-scheme` para que los controles nativos
(scrollbars, date pickers) acompañen. La preferencia se persiste; el valor inicial se aplica
antes del primer render para evitar el destello blanco.

### 11.3 Estructura por feature

Adoptamos la organización de `easy-point-ui`, adaptada a `src/`:

```
src/
├── app/(dashboard)/<modulo>/page.tsx   # página: toolbar + tabla + modales
├── features/<modulo>/
│   ├── components/    # modales propios del módulo
│   ├── hooks/         # hooks de React Query + query key factory
│   ├── services/      # cliente HTTP del módulo
│   └── types/         # entidad, FindParams, CreateDTO, UpdateDTO
└── shared/
    ├── components/ui/ # primitivas del design system
    └── lib/utils.ts   # cn()
```

El design system vive en `shared/components/ui/`. **Un componente que dos módulos necesitan se
promueve ahí; no se copia.** Y no se extrae a un paquete `@jdh/ui` hasta que un segundo módulo
lo pida de verdad: un design system extraído de cero consumidores es una hipótesis cara.

### 11.4 Variantes con CVA

Las variantes se declaran con `class-variance-authority`, no con condicionales de string:

```ts
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium " +
  "transition-all outline-none select-none focus-visible:border-ring " +
  "focus-visible:ring-3 focus-visible:ring-ring/20 active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:   "bg-primary text-text-on-primary hover:bg-primary-hover",
        secondary: "bg-canvas-subtle text-text-primary hover:bg-canvas-subtle/80",
        outline:   "border border-border-control bg-transparent hover:bg-canvas-subtle",
        ghost:     "text-text-secondary hover:bg-canvas-subtle hover:text-text-primary",
        danger:    "bg-danger-surface text-danger hover:bg-danger-surface/80",
      },
      size: {
        sm: "h-8 gap-1 px-2.5 text-xs",
        default: "h-9 gap-1.5 px-3",
        lg: "h-10 gap-2 px-4",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
)
```

---

## 12. Do / Don't

### Do

- Consumir siempre tokens semánticos (`bg-surface`, `text-text-secondary`).
- Usar `--overlay-on-light-64` para texto secundario en claro — es el único que pasa AA.
- Alinear números a la derecha con `tabular-nums`.
- Dar a cada tabla sus cuatro estados antes de darla por terminada.
- Debounce de 350ms en toda búsqueda que golpee la API.
- Una acción primaria por pantalla.
- Marcar lo opcional, no lo obligatorio.
- Verificar contraste con herramienta cuando se introduzca cualquier par nuevo.

### Don't

- No usar `--neutral-500` como color de texto en tema claro (2.84–3.17, falla AA).
- No usar `--border` en un control interactivo; para eso está `--border-control`.
- No introducir grises fuera de la capa primitiva — componer con overlays.
- No usar radio pill en botones.
- No comunicar estado solo con color.
- No usar glassmorphism ni gradientes decorativos.
- No animar propiedades de layout.
- No eliminar el anillo de foco.
- No cerrar al hacer clic fuera un modal con formulario.
- No poner hex inline en un componente.
- No heredar Arial del manual de documentos hacia la UI (§4.1).

---

## 13. Decisiones abiertas

| # | Decisión | Estado |
|---|---|---|
| 1 | ¿El azul corporativo del logo entra como acento en la UI, o la UI se mantiene monocroma? | **Abierta.** Hoy el sistema es monocromo con negro JDH como primario. Si entra el azul, necesita hex exacto y derivar escala 50–950. |
| 2 | Validación de Mercadeo sobre la interfaz | **Pendiente.** Mercadeo es guardián con poder de bloqueo sobre plantillas de documento. Falta confirmar si su alcance cubre también la UI. |
| 3 | ¿Centrale Sans con licencia web? | **Resuelta.** Los woff2 están en `public/fonts/` y la UI los sirve. Trae `tnum`, así que cerró la brecha entre marca e interfaz sin sacrificar cifras tabulares (§4.1). |
| 4 | Extracción a paquete `@jdh/ui` | **Diferida** hasta que un segundo módulo lo requiera. |
| 5 | Densidad configurable (cómoda / compacta) | **Diferida.** Primero medir si los usuarios lo piden. |

---

## 14. Cómo iterar este documento

1. Un componente a la vez. Referenciar su token directamente.
2. Todo par de color nuevo se verifica con herramienta **antes** de entrar al documento, y se
   registra con su ratio medido en §3.5.
3. Documentar estado por defecto y estado activo/presionado. El hover no se documenta: no
   existe en táctil.
4. Si un componente necesita un token que no existe, se discute el token — no se parchea el componente.
5. Este documento describe lo que **está construido**. Lo que aún no existe va a §13, no al
   cuerpo del documento redactado como si ya funcionara.
