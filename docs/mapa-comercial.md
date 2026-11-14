# Mapa comercial

Prospectos de clientes sobre el mapa de Colombia, zonas comerciales y rutas de visita. Módulo
`mapa-comercial` del espacio de trabajo, en `/{área}/mapa-comercial`; el código vive en
`src/features/commercial-map`. El contrato HTTP (`/territory`) y las reglas del archivo mensual
están en `docs/mapa-comercial.md` del repositorio del API. El diseño del mapa, en `docs/DESIGN.md` §15.

## Vistas

Cada vista tiene su dirección: `?vista=por-ubicar`, `importar`, `zonas` o `rutas`; sin
parámetro, el mapa.

| Vista | Qué hace | Permiso |
| --- | --- | --- |
| Mapa | Prospectos agrupados, chips con nombre desde zoom 15, tarjeta con contacto, filtros y lista | `read` |
| Por ubicar | Los prospectos que el archivo trajo sin punto; «Ubicar en el mapa» abre el pin | `read`; ubicar pide `manage` |
| Importar | Simula y aplica el Excel mensual; historial de cargas | `manage` (sin él, la pestaña no existe) |
| Zonas | Zonas comerciales: dibujar, editar, borrar, unir zonas oficiales | `read`; editar pide `manage` |
| Rutas | Rutas de visita: armar, calcular, registrar el resultado de cada parada | `read`; armar pide `manage`; registrar, `manage` o ser quien la recorre |

**Contornos de referencia.** En la barra sobre el mapa de la vista Mapa, «Comunas» o «Municipios» pinta el perímetro de
las zonas oficiales (`GET /territory/zones?layer=official&level=…`) con su nombre y cuántos
prospectos caen dentro. Un clic dentro de un contorno, o elegirlo en la lista, filtra el mapa y
la lista con `zone_id`. Una zona oficial no asigna prospectos: con `manage`, «Crear una zona
comercial con este contorno» la adopta (`POST /territory/zones/adopt`). El código está en
`components/reference-zones.tsx`.

Lo que cada persona puede hacer lo responde `GET /territory/permissions`
(`commercial-map-gate.tsx`); el API lo vuelve a comprobar en cada llamada.

## Cómo está armado

- `components/map-canvas.tsx` crea el mapa una vez y deja montadas, vacías, todas las fuentes y
  capas del módulo (`lib/map-layers.ts`). Las vistas Mapa, Zonas y Rutas comparten esa instancia:
  cada una llena sus fuentes y limpia lo suyo al salir.
- `lib/map-style.ts` arma la base con los tokens `--map-*`; `lib/map-tokens.ts` los resuelve
  para el tema en pantalla, porque MapLibre no entiende `var()` ni `color-mix()`.
- Varios prospectos pueden caer sobre la misma coordenada (el archivo geocodifica a un
  centroide). `lib/prospect-features.ts` los agrupa en una pila; el clic la abre en abanico
  (`hooks/use-fan.ts`) y la lista de la pila es su equivalente por teclado.
- Las zonas se dibujan con Terra Draw (`hooks/use-zone-draw.ts`).
- MapLibre 6 carga su worker desde un archivo aparte. Un empaquetador lo mueve, así que
  `map-canvas.tsx` le pide la dirección con `new URL(..., import.meta.url)` y se la pasa a
  `setWorkerUrl`.

## Mapa base

Dos cosas que no están en git (`public/mapas/`, ignorado): el archivo de teselas y los glifos de
la tipografía. Sin ellas el mapa muestra los prospectos sobre un fondo vacío y un aviso.

```
public/mapas/
├── colombia.pmtiles          # ~607 MB a zoom 15
└── fonts/Centrale Sans {Regular,Italic,Medium,Bold}/{0-255,…}.pbf
```

### 1. Teselas

Con el [CLI `pmtiles`](https://github.com/protomaps/go-pmtiles/releases) se recorta Colombia
del build diario de Protomaps. No se descarga el planeta: el CLI pide por rango solo las
teselas de la región.

```bash
pmtiles extract https://build.protomaps.com/AAAAMMDD.pmtiles public/mapas/colombia.pmtiles \
  --region=scripts/mapas/colombia-region.geojson --maxzoom=15
```

- Los builds disponibles están en <https://build-metadata.protomaps.dev/builds.json>. Se usó
  `20261113`.
- `scripts/mapas/colombia-region.geojson` es el contorno de Colombia (geoBoundaries, CC0)
  ensanchado unos 11 km, para que Cúcuta, Ipiales y Leticia no pierdan teselas, más San Andrés,
  Providencia, Malpelo y Gorgona.
- Tamaño medido: **607 MB** (785.452 teselas, zoom 0 a 15). `--dry-run` lo calcula sin
  descargar. Cada nivel de zoom menos lo reduce más o menos a la mitad.
- Los datos de calles cambian poco: basta rehacerlo cuando falte una vía nueva.

### 2. Glifos

```bash
pip install fonttools brotli freetype-py numpy scipy
python scripts/mapas/build_glyphs.py
```

Lee los woff2 de `public/fonts/` y escribe los cuatro pesos que usa el estilo. Pesa menos de
1 MB. Solo hay que repetirlo si cambia la tipografía.

### 3. Dónde se sirve

`NEXT_PUBLIC_MAP_ASSETS_URL` (por defecto `/mapas`) dice dónde están los dos.

- **Desarrollo:** `public/mapas/`, que Next sirve con peticiones por rango (`206`).
- **Producción:** el Caddy del stack edge sirve `/mapas/*` con `file_server` sobre un volumen
  de solo lectura, igual que `/cms/uploads/*`. Es un paso manual en el servidor: copiar la
  carpeta y agregar la ruta. La imagen de la UI no lleva el archivo: `.dockerignore` deja
  `public/mapas` fuera del contexto.
- **Docker en local:** como la imagen no lo trae, se monta la carpeta como volumen en
  `/app/public/mapas`.
- `src/proxy.ts` excluye `.pmtiles` y `.pbf` de su matcher: son estáticos y no necesitan sesión.

Comprobación tras desplegar: una petición con `Range: bytes=0-1023` a
`/mapas/colombia.pmtiles` responde `206`.

## Probar en local

La base compartida de desarrollo no tiene PostGIS. Hay que apuntar `NEXT_PUBLIC_API_URL` y
`API_INTERNAL_URL` a una API con el módulo `territory` y permitir en su CORS el origen de la UI.
