import type { Cargo, DocumentoOrganigrama } from "./types"

/**
 * Organigrama oficial de JDH (SIG M.02.F.01), transcrito del Excel oficial.
 *
 * Es una lista plana en orden de lectura (padre antes que hijos): colapsar,
 * buscar y contar descendientes es más simple sobre `parentId` que sobre un
 * árbol anidado. Son cargos, no personas — el Excel no trae titulares.
 *
 * Solo se corrigieron typos y tildes del original ("SUPLAY", "LOGISTTICO",
 * "AUXILIARE", "CORDINADOR", "MANAGMENT"…); la jerarquía es la del dibujo.
 * Si el backend llega a exponer el organigrama, esto pasa a
 * `server/queries.ts` con el mismo shape.
 */

export const documentoOrganigrama: DocumentoOrganigrama = {
  codigo: "M.02.F.01",
  version: "02",
  fecha: "2026-10-19",
}

export const cargos: Cargo[] = [
  { id: "ceo", nombre: "CEO", parentId: null },
  {
    id: "junta-directiva",
    nombre: "Junta directiva",
    parentId: "ceo",
    tipo: "lateral",
  },
  { id: "gerente-general", nombre: "Gerente general", parentId: "ceo" },
  {
    id: "director-administrativo",
    nombre: "Director administrativo",
    parentId: "gerente-general",
  },
  {
    id: "coordinador-de-talento-humano",
    nombre: "Coordinador de talento humano",
    parentId: "director-administrativo",
  },
  {
    id: "auxiliar-de-talento-humano",
    nombre: "Auxiliar de talento humano",
    parentId: "coordinador-de-talento-humano",
  },
  {
    id: "practicantes",
    nombre: "Practicantes",
    parentId: "auxiliar-de-talento-humano",
  },
  {
    id: "coordinador-sg-sst",
    nombre: "Coordinador SG-SST",
    parentId: "director-administrativo",
  },
  {
    id: "auxiliar-de-sg-sst",
    nombre: "Auxiliar de SG-SST",
    parentId: "coordinador-sg-sst",
  },
  {
    id: "auxiliar-administrativo",
    nombre: "Auxiliar administrativo",
    parentId: "director-administrativo",
  },
  {
    id: "auxiliar-de-ti",
    nombre: "Auxiliar de TI",
    parentId: "director-administrativo",
  },
  {
    id: "auxiliar-de-servicios-generales",
    nombre: "Auxiliar de servicios generales",
    parentId: "director-administrativo",
    tipo: "tercerizado",
    nota: "Contratación Uno A",
  },
  {
    id: "director-financiero",
    nombre: "Director financiero",
    parentId: "gerente-general",
  },
  { id: "contador", nombre: "Contador", parentId: "director-financiero" },
  {
    id: "analista-contable",
    nombre: "Analista contable",
    parentId: "contador",
  },
  {
    id: "auxiliar-contable",
    nombre: "Auxiliar contable",
    parentId: "contador",
  },
  {
    id: "coordinador-cartera",
    nombre: "Coordinador cartera",
    parentId: "director-financiero",
  },
  {
    id: "analista-cartera",
    nombre: "Analista cartera",
    parentId: "coordinador-cartera",
  },
  {
    id: "auxiliar-cartera",
    nombre: "Auxiliar cartera",
    parentId: "coordinador-cartera",
  },
  {
    id: "coordinador-tesoreria",
    nombre: "Coordinador tesorería",
    parentId: "director-financiero",
  },
  {
    id: "analista-tesoreria",
    nombre: "Analista tesorería",
    parentId: "coordinador-tesoreria",
  },
  {
    id: "auxiliar-tesoreria",
    nombre: "Auxiliar tesorería",
    parentId: "coordinador-tesoreria",
  },
  { id: "mensajero", nombre: "Mensajero", parentId: "auxiliar-tesoreria" },
  {
    id: "auxiliar-liquidacion",
    nombre: "Auxiliar liquidación",
    parentId: "coordinador-tesoreria",
  },
  {
    id: "coordinador-business-intelligence",
    nombre: "Coordinador Business Intelligence",
    parentId: "director-financiero",
  },
  {
    id: "analista-business-intelligence",
    nombre: "Analista Business Intelligence",
    parentId: "coordinador-business-intelligence",
  },
  {
    id: "director-nacional-de-marketing-y-nuevos-proyectos",
    nombre: "Director nacional de marketing y nuevos proyectos",
    parentId: "gerente-general",
  },
  {
    id: "coordinador-market",
    nombre: "Coordinador Market",
    parentId: "director-nacional-de-marketing-y-nuevos-proyectos",
  },
  {
    id: "administrador-punto-de-venta",
    nombre: "Administrador punto de venta",
    parentId: "coordinador-market",
  },
  {
    id: "auxiliar-punto-de-venta",
    nombre: "Auxiliar punto de venta",
    parentId: "administrador-punto-de-venta",
  },
  {
    id: "coordinador-mercadeo",
    nombre: "Coordinador mercadeo",
    parentId: "director-nacional-de-marketing-y-nuevos-proyectos",
  },
  {
    id: "disenador-grafico",
    nombre: "Diseñador gráfico",
    parentId: "coordinador-mercadeo",
  },
  {
    id: "analista-de-mercadeo",
    nombre: "Analista de mercadeo",
    parentId: "coordinador-mercadeo",
  },
  {
    id: "coordinador-especialistas",
    nombre: "Coordinador especialistas",
    parentId: "director-nacional-de-marketing-y-nuevos-proyectos",
  },
  {
    id: "ejecutivo-especialista",
    nombre: "Ejecutivo especialista",
    parentId: "coordinador-especialistas",
  },
  {
    id: "director-nacional-de-ventas-canal-food",
    nombre: "Director nacional de ventas Canal Food",
    parentId: "gerente-general",
  },
  {
    id: "category-management",
    nombre: "Category Management",
    parentId: "director-nacional-de-ventas-canal-food",
  },
  {
    id: "auxiliar-comercial-marca",
    nombre: "Auxiliar comercial marca",
    parentId: "category-management",
  },
  {
    id: "director-regional-centro",
    nombre: "Director regional Centro",
    parentId: "director-nacional-de-ventas-canal-food",
  },
  {
    id: "coordinador-regional-de-ventas-centro",
    nombre: "Coordinador regional de ventas",
    parentId: "director-regional-centro",
  },
  {
    id: "ejecutivo-comercial-centro",
    nombre: "Ejecutivo comercial",
    parentId: "coordinador-regional-de-ventas-centro",
  },
  {
    id: "director-regional-oriente",
    nombre: "Director regional Oriente",
    parentId: "director-nacional-de-ventas-canal-food",
  },
  {
    id: "coordinador-regional-de-ventas-oriente",
    nombre: "Coordinador regional de ventas",
    parentId: "director-regional-oriente",
  },
  {
    id: "ejecutivo-comercial-oriente",
    nombre: "Ejecutivo comercial",
    parentId: "coordinador-regional-de-ventas-oriente",
  },
  {
    id: "director-regional-costa",
    nombre: "Director regional Costa",
    parentId: "director-nacional-de-ventas-canal-food",
  },
  {
    id: "coordinador-regional-de-ventas-costa",
    nombre: "Coordinador regional de ventas",
    parentId: "director-regional-costa",
  },
  {
    id: "ejecutivo-comercial-costa",
    nombre: "Ejecutivo comercial",
    parentId: "coordinador-regional-de-ventas-costa",
  },
  {
    id: "director-regional-occidente",
    nombre: "Director regional Occidente",
    parentId: "director-nacional-de-ventas-canal-food",
  },
  {
    id: "coordinador-regional-de-ventas-occidente",
    nombre: "Coordinador regional de ventas",
    parentId: "director-regional-occidente",
  },
  {
    id: "ejecutivo-comercial-occidente",
    nombre: "Ejecutivo comercial",
    parentId: "coordinador-regional-de-ventas-occidente",
  },
  {
    id: "mercaderistas",
    nombre: "Mercaderistas",
    parentId: "ejecutivo-comercial-occidente",
  },
  {
    id: "director-regional-antioquia",
    nombre: "Director regional Antioquia",
    parentId: "gerente-general",
  },
  {
    id: "coordinador-comercial",
    nombre: "Coordinador comercial",
    parentId: "director-regional-antioquia",
  },
  {
    id: "ejecutivo-comercial-senior",
    nombre: "Ejecutivo comercial senior",
    parentId: "coordinador-comercial",
  },
  {
    id: "coordinador-comercial-2",
    nombre: "Coordinador comercial",
    parentId: "director-regional-antioquia",
  },
  {
    id: "ejecutivo-comercial-call-center-y-junior",
    nombre: "Ejecutivo comercial Call Center y junior",
    parentId: "coordinador-comercial-2",
  },
  {
    id: "coordinador-comercial-viajeros",
    nombre: "Coordinador comercial viajeros",
    parentId: "director-regional-antioquia",
  },
  {
    id: "ejecutivo-comercial-viajero",
    nombre: "Ejecutivo comercial viajero",
    parentId: "coordinador-comercial-viajeros",
  },
  { id: "director-ti", nombre: "Director TI", parentId: "gerente-general" },
  { id: "analista-ti", nombre: "Analista TI", parentId: "director-ti" },
  {
    id: "coordinador-call-center",
    nombre: "Coordinador Call Center",
    parentId: "gerente-general",
  },
  {
    id: "auxiliar-comercial",
    nombre: "Auxiliar comercial",
    parentId: "coordinador-call-center",
  },
  {
    id: "ejecutivo-cuentas-claves",
    nombre: "Ejecutivo cuentas claves",
    parentId: "gerente-general",
  },
  {
    id: "director-nacional-supply-chain",
    nombre: "Director nacional Supply Chain",
    parentId: "gerente-general",
  },
  {
    id: "coordinador-de-calidad",
    nombre: "Coordinador de calidad",
    parentId: "director-nacional-supply-chain",
  },
  {
    id: "analista-de-calidad",
    nombre: "Analista de calidad",
    parentId: "coordinador-de-calidad",
  },
  {
    id: "auxiliar-de-calidad",
    nombre: "Auxiliar de calidad",
    parentId: "analista-de-calidad",
  },
  {
    id: "director-nacional-de-abastecimiento",
    nombre: "Director nacional de abastecimiento",
    parentId: "director-nacional-supply-chain",
  },
  {
    id: "coordinador-compras",
    nombre: "Coordinador compras",
    parentId: "director-nacional-de-abastecimiento",
  },
  {
    id: "analista-de-compras",
    nombre: "Analista de compras",
    parentId: "coordinador-compras",
  },
  {
    id: "auxiliar-de-compras",
    nombre: "Auxiliar de compras",
    parentId: "analista-de-compras",
  },
  {
    id: "negociador",
    nombre: "Negociador",
    parentId: "director-nacional-de-abastecimiento",
  },
  {
    id: "planeador-de-la-demanda",
    nombre: "Planeador de la demanda",
    parentId: "director-nacional-de-abastecimiento",
  },
  {
    id: "analista-de-abastecimiento",
    nombre: "Analista de abastecimiento",
    parentId: "director-nacional-de-abastecimiento",
  },
  {
    id: "director-nacional-de-inventarios",
    nombre: "Director nacional de inventarios",
    parentId: "director-nacional-supply-chain",
  },
  {
    id: "coordinador-de-inventarios",
    nombre: "Coordinador de inventarios",
    parentId: "director-nacional-de-inventarios",
  },
  {
    id: "analista-de-inventario",
    nombre: "Analista de inventario",
    parentId: "coordinador-de-inventarios",
  },
  {
    id: "director-logistico-antioquia",
    nombre: "Director logístico Antioquia",
    parentId: "director-nacional-supply-chain",
  },
  {
    id: "coordinador-logistico-nacional",
    nombre: "Coordinador logístico nacional",
    parentId: "director-logistico-antioquia",
  },
  {
    id: "coordinador-logistico-distribucion-antioquia",
    nombre: "Coordinador logístico distribución",
    parentId: "coordinador-logistico-nacional",
  },
  {
    id: "auxiliar-administrativo-logistico-antioquia",
    nombre: "Auxiliar administrativo logístico",
    parentId: "coordinador-logistico-distribucion-antioquia",
  },
  {
    id: "conductor-antioquia",
    nombre: "Conductor",
    parentId: "coordinador-logistico-distribucion-antioquia",
  },
  {
    id: "servicios-generales",
    nombre: "Servicios generales",
    parentId: "coordinador-logistico-distribucion-antioquia",
  },
  {
    id: "supervisor-logistico-distribucion-antioquia",
    nombre: "Supervisor logístico distribución",
    parentId: "coordinador-logistico-distribucion-antioquia",
  },
  {
    id: "auxiliar-logistico-de-entrega-antioquia",
    nombre: "Auxiliar logístico de entrega",
    parentId: "supervisor-logistico-distribucion-antioquia",
  },
  {
    id: "facturador-antioquia",
    nombre: "Facturador",
    parentId: "supervisor-logistico-distribucion-antioquia",
  },
  {
    id: "coordinador-logistico-bajo-techo-antioquia",
    nombre: "Coordinador logístico bajo techo",
    parentId: "coordinador-logistico-nacional",
  },
  {
    id: "supervisor-logistico-bajo-techo-antioquia",
    nombre: "Supervisor logístico bajo techo",
    parentId: "coordinador-logistico-bajo-techo-antioquia",
  },
  {
    id: "auxiliar-logistico-bodega-antioquia",
    nombre: "Auxiliar logístico bodega",
    parentId: "supervisor-logistico-bajo-techo-antioquia",
  },
  {
    id: "director-logistico-bogota",
    nombre: "Director logístico Bogotá",
    parentId: "director-nacional-supply-chain",
  },
  {
    id: "coordinador-logistico-distribucion-bogota",
    nombre: "Coordinador logístico distribución",
    parentId: "director-logistico-bogota",
  },
  {
    id: "conductor-bogota",
    nombre: "Conductor",
    parentId: "coordinador-logistico-distribucion-bogota",
  },
  {
    id: "recepcionista",
    nombre: "Recepcionista",
    parentId: "coordinador-logistico-distribucion-bogota",
  },
  {
    id: "supervisor-logistico-distribucion-bogota",
    nombre: "Supervisor logístico distribución",
    parentId: "coordinador-logistico-distribucion-bogota",
  },
  {
    id: "auxiliar-logistico-de-entrega-bogota",
    nombre: "Auxiliar logístico de entrega",
    parentId: "supervisor-logistico-distribucion-bogota",
  },
  {
    id: "auxiliar-administrativo-logistico-bogota",
    nombre: "Auxiliar administrativo logístico",
    parentId: "supervisor-logistico-distribucion-bogota",
  },
  {
    id: "facturador-bogota",
    nombre: "Facturador",
    parentId: "supervisor-logistico-distribucion-bogota",
  },
  {
    id: "coordinador-logistico-bajo-techo-y-servicios",
    nombre: "Coordinador logístico bajo techo y servicios",
    parentId: "director-logistico-bogota",
  },
  {
    id: "supervisor-logistico-bajo-techo-bogota",
    nombre: "Supervisor logístico bajo techo",
    parentId: "coordinador-logistico-bajo-techo-y-servicios",
  },
  {
    id: "auxiliar-logistico-bodega-bogota",
    nombre: "Auxiliar logístico bodega",
    parentId: "supervisor-logistico-bajo-techo-bogota",
  },
  {
    id: "supervisor-logistico-servicios",
    nombre: "Supervisor logístico servicios",
    parentId: "coordinador-logistico-bajo-techo-y-servicios",
  },
  {
    id: "auxiliar-logistico-servicios",
    nombre: "Auxiliar logístico servicios",
    parentId: "supervisor-logistico-servicios",
  },
  {
    id: "director-logistico-costa-y-valledupar",
    nombre: "Director logístico Costa y Valledupar",
    parentId: "director-nacional-supply-chain",
  },
  {
    id: "coordinador-logistico-distribucion-costa-valledupar",
    nombre: "Coordinador logístico distribución",
    parentId: "director-logistico-costa-y-valledupar",
  },
  {
    id: "conductor-costa-valledupar",
    nombre: "Conductor",
    parentId: "coordinador-logistico-distribucion-costa-valledupar",
  },
  {
    id: "supervisor-logistico-distribucion-costa-valledupar",
    nombre: "Supervisor logístico distribución",
    parentId: "coordinador-logistico-distribucion-costa-valledupar",
  },
  {
    id: "auxiliar-logistico-de-entrega-costa-valledupar",
    nombre: "Auxiliar logístico de entrega",
    parentId: "supervisor-logistico-distribucion-costa-valledupar",
  },
  {
    id: "auxiliar-administrativo-logistico-costa-valledupar",
    nombre: "Auxiliar administrativo logístico",
    parentId: "supervisor-logistico-distribucion-costa-valledupar",
  },
  {
    id: "facturador-costa-valledupar",
    nombre: "Facturador",
    parentId: "supervisor-logistico-distribucion-costa-valledupar",
  },
  {
    id: "coordinador-logistico-bajo-techo-costa-valledupar",
    nombre: "Coordinador logístico bajo techo",
    parentId: "director-logistico-costa-y-valledupar",
  },
  {
    id: "auxiliar-administrativo-logistico-costa-valledupar-2",
    nombre: "Auxiliar administrativo logístico",
    parentId: "coordinador-logistico-bajo-techo-costa-valledupar",
  },
  {
    id: "supervisor-logistico-bajo-techo-costa-valledupar",
    nombre: "Supervisor logístico bajo techo",
    parentId: "coordinador-logistico-bajo-techo-costa-valledupar",
  },
  {
    id: "auxiliar-logistico-bodega-costa-valledupar",
    nombre: "Auxiliar logístico bodega",
    parentId: "supervisor-logistico-bajo-techo-costa-valledupar",
  },
  {
    id: "director-logistico-occidente-y-oriente",
    nombre: "Director logístico Occidente y Oriente",
    parentId: "director-nacional-supply-chain",
  },
  {
    id: "coordinador-logistico-distribucion-occidente-oriente",
    nombre: "Coordinador logístico distribución",
    parentId: "director-logistico-occidente-y-oriente",
  },
  {
    id: "conductor-occidente-oriente",
    nombre: "Conductor",
    parentId: "coordinador-logistico-distribucion-occidente-oriente",
  },
  {
    id: "supervisor-logistico-distribucion-occidente-oriente",
    nombre: "Supervisor logístico distribución",
    parentId: "coordinador-logistico-distribucion-occidente-oriente",
  },
  {
    id: "auxiliar-logistico-de-entrega-occidente-oriente",
    nombre: "Auxiliar logístico de entrega",
    parentId: "supervisor-logistico-distribucion-occidente-oriente",
  },
  {
    id: "auxiliar-administrativo-logistico-occidente-oriente",
    nombre: "Auxiliar administrativo logístico",
    parentId: "supervisor-logistico-distribucion-occidente-oriente",
  },
  {
    id: "liquidador-facturador",
    nombre: "Liquidador - facturador",
    parentId: "supervisor-logistico-distribucion-occidente-oriente",
  },
  {
    id: "coordinador-logistico-bajo-techo-occidente-oriente",
    nombre: "Coordinador logístico bajo techo",
    parentId: "director-logistico-occidente-y-oriente",
  },
  {
    id: "supervisor-logistico-bajo-techo-occidente-oriente",
    nombre: "Supervisor logístico bajo techo",
    parentId: "coordinador-logistico-bajo-techo-occidente-oriente",
  },
  {
    id: "auxiliar-logistico-bodega-occidente-oriente",
    nombre: "Auxiliar logístico bodega",
    parentId: "supervisor-logistico-bajo-techo-occidente-oriente",
  },
]
