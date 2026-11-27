import { createRegistry } from "@/intranet/lib/modules"

import { autogestionModule } from "@/intranet/modules/autogestion"
import { ayudaModule } from "@/intranet/modules/ayuda"
import { catalogoModule } from "@/intranet/modules/catalogo"
import { directorioModule } from "@/intranet/modules/directorio"
import { induccionModule } from "@/intranet/modules/induccion"
import { marcaModule } from "@/intranet/modules/marca"
import { noticiasModule } from "@/intranet/modules/noticias"
import { notificacionesModule } from "@/intranet/modules/notificaciones"
import { organigramaModule } from "@/intranet/modules/organigrama"
import { perfilModule } from "@/intranet/modules/perfil"
import { sigModule } from "@/intranet/modules/sig"

/**
 * The intranet module registry — the single place every feature module is
 * registered.
 *
 * To add a new module:
 *   1. Create `src/modules/<id>/` (see `src/modules/README.md` for the anatomy).
 *   2. Export its manifest from that module's `index.ts`.
 *   3. Add one import + one line to the array below.
 *
 * Navigation, the homepage catalog, and access checks all derive from this
 * list, so that is the entire wiring cost of a new module.
 */
export const modules = createRegistry([
  noticiasModule,
  sigModule,
  directorioModule,
  induccionModule,
  organigramaModule,
  autogestionModule,
  catalogoModule,
  marcaModule,
  ayudaModule,
  perfilModule,
  notificacionesModule,
])
