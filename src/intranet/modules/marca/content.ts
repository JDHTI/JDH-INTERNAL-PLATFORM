/**
 * Datos de marca JDH, transcritos del knowledge vault
 * (`JDH-Design-System/01 - Brand Identity`, `02 - Brand System`,
 * `03 - Communication`), que a su vez deriva del Manual de Marca 2026.
 *
 * Es **contenido**, no configuración de UI: la página de marca documenta estos
 * datos igual que documentaría un artículo. Por eso los HEX viven aquí como
 * strings — son el dato que se muestra, no tokens con los que se pinta el
 * chrome (ver la entrada de ARCHITECTURE.md del 2026-07-20).
 *
 * Convención de estado heredada del vault: 🟢 oficial · 🟡 derivado · 🔴 pendiente.
 */

export interface BrandColor {
  name: string
  hex: string
  rgb: string
  cmyk: string
  role: "principal" | "derivada"
  note?: string
}

export interface BrandTrait {
  title: string
  description: string
}

export interface BrandStat {
  value: string
  label: string
}

export interface LogoPillar {
  title: string
  meaning: string
}

export interface TypeWeight {
  name: string
  weight: number
  usage: string
}

/** Copy largo de marca. Transcrito textualmente del vault. */
export const brandCopy = {
  lema: "Tu pasión, nos mueve.",

  /** Empresa.md — Manual P3-4. */
  definicion:
    "Juan D. Hoyos Distribuciones es una empresa especializada en la distribución y comercialización de productos destinados al sector institucional. Cuenta con una amplia base de clientes y proveedores establecida a nivel nacional, mejorando constantemente su gama de productos y servicios mediante la innovación, la calidad humana, la pasión y el liderazgo.",

  promesa:
    "Acompañar a nuestros clientes en todo momento y proporcionarles un servicio que cumpla con los más altos estándares. Nos comprometemos a mejorar continuamente nuestro rendimiento para mantenernos como un referente de calidad, experiencia y servicio.",

  /** Historia.md — información oficial de la organización (2026-07-07). */
  historia: [
    "Hace más de 30 años nació Juan D. Hoyos Distribuciones (JDH) con un propósito claro: conectar a los mejores proveedores con los negocios que alimentan a Colombia. Desde entonces, JDH ha sido mucho más que un distribuidor: ha sido un aliado estratégico para restaurantes, hoteles y negocios que buscan calidad, frescura y respaldo en cada entrega.",
    "El crecimiento de la compañía ha sido posible gracias a la confianza de sus clientes, al compromiso de sus colaboradores y al trabajo conjunto con proveedores que comparten su pasión por la excelencia, sobre una red de distribución robusta basada en servicio, innovación y un profundo conocimiento del mercado.",
    "JDH no solo entrega productos: entrega soluciones. La compañía se asegura de que cada ingrediente y cada producto llegue en el momento justo y en las condiciones perfectas, reconociendo que detrás de cada compra hay un plato que se sirve y una experiencia que se crea.",
  ],

  /** Misión.md — declaración formal. */
  mision: [
    "Ser una compañía especializada en la distribución y comercialización de productos para el mercado institucional. El servicio de JDH está acompañado de una propuesta de valor para sus clientes, empleados y proveedores.",
    "JDH se conforma por un equipo de trabajo proactivo, apasionado por su labor y con alta capacidad de toma de decisiones; estos aspectos caracterizan y fomentan su ser y quehacer como organización.",
  ],

  /** Misión.md — Visión a 2030. */
  vision: [
    "Ser, al año 2030, un grupo de compañías con presencia en las principales ciudades del país. JDH logrará este desafío siguiendo con disciplina los valores de la empresa: innovación, calidad humana, pasión, liderazgo, velocidad, flexibilidad y positiva respuesta a sus clientes y esquema de distribución.",
    "JDH continuará trabajando día a día para desarrollar su desempeño en el canal institucional y convertirse en un referente de calidad, excelencia y servicio.",
  ],

  /** Storytelling.md — Manual P5. */
  storytelling:
    "En Juan D. Hoyos Distribuciones, nos apasiona ser la primera opción para los clientes del sector Food Service y Retail, ofreciéndoles soluciones logísticas confiables y simples que agilizan sus operaciones y mejoran su rentabilidad. Construimos relaciones cercanas, nos comunicamos de forma directa y ejecutamos con disciplina para cumplir nuestros compromisos, asegurando la satisfacción y el éxito de quienes confían en nosotros.",

  /** Tono de Voz.md — frase ejemplo (Highlights, P24). */
  fraseEjemplo: "Traemos la solución para tu negocio.",

  /** Logo.md — metáfora urbana del rombo. */
  metaforaUrbana:
    "El rombo también representa una «manzana» dentro del urbanismo de una ciudad: la unidad territorial donde los productos y servicios de JDH se distribuyen de manera oportuna y eficaz. Esta metáfora ancla la marca al propósito de evolución conjunta de los negocios de nuestros clientes.",

  /** Usos Incorrectos.md — Manual P18-19. */
  usosIncorrectosIntro:
    "Nuestro logo es nuestro objeto más preciado, por favor sigue los siguientes lineamientos para garantizar la buena imagen de nuestra marca.",
} as const

/** Sectores atendidos (Empresa.md, formalizados en Storytelling.md). */
export const sectores = ["Food Service", "Retail"] as const

/** Historia.md — cifras clave 2026. */
export const brandStats: BrandStat[] = [
  { value: "7", label: "Centros de distribución a nivel nacional" },
  { value: "99%", label: "Nivel de cumplimiento en entregas" },
  { value: "+300", label: "Proveedores de todas las categorías" },
  { value: "~21.000", label: "Clientes atendidos a nivel nacional" },
  { value: "8.800", label: "Referencias en el portafolio" },
]

/**
 * Valores.md permanece 🔴 Pendiente: la organización confirmó (2026-07-07) que
 * NO existe una declaración formal de valores. Estos cuatro adjetivos vienen del
 * texto narrativo del manual (P3) y se muestran como tales, no como lista oficial.
 */
export const valoresDescriptivos = [
  "Innovación",
  "Calidad humana",
  "Pasión",
  "Liderazgo",
] as const

/** Las siete palabras que la Visión 2030 nombra como "valores de la empresa". */
export const valoresVision = [
  "Innovación",
  "Calidad humana",
  "Pasión",
  "Liderazgo",
  "Velocidad",
  "Flexibilidad",
  "Positiva respuesta",
] as const

/** Tono de Voz.md — Manual P6. Cinco rasgos. */
export const tonoDeVoz: BrandTrait[] = [
  {
    title: "Entusiasmo y pasión",
    description:
      "Se transmite una sensación de emoción y energía positiva al expresar el entusiasmo por ser la opción principal para los clientes del sector Food Service.",
  },
  {
    title: "Confiabilidad y claridad",
    description:
      "Se enfatiza la confiabilidad de las soluciones ofrecidas, así como la comunicación directa y transparente, lo que transmite confianza y seguridad a los clientes.",
  },
  {
    title: "Cercanía y humanidad",
    description:
      "Se subraya la importancia de construir relaciones cercanas con los clientes, lo que implica un enfoque humano y personalizado en la interacción con ellos.",
  },
  {
    title: "Sencillez y simplicidad",
    description:
      "Se prioriza un lenguaje claro y directo, evitando tecnicismos innecesarios. Cada comunicación transmite una sola idea a la vez, priorizando la claridad sobre la complejidad, para que cualquier audiencia entienda lo que JDH comunica sin sacrificar el profesionalismo.",
  },
  {
    title: "Compromiso y disciplina",
    description:
      "Se resalta el compromiso de cumplir con las promesas de manera disciplinada, lo que sugiere una actitud profesional y orientada a resultados.",
  },
]

/** Logo.md — tres pilares de valor + el cuarto vértice. */
export const logoPillars: LogoPillar[] = [
  { title: "Talento humano", meaning: "Pasión" },
  { title: "Gestión de la información", meaning: "Conocimiento" },
  { title: "Buenas entregas", meaning: "Servicio" },
  { title: "Cuarto vértice · la flecha", meaning: "Progreso y evolución" },
]

/** Versiones.md — Manual P9-10. */
export const logoVersiones: BrandTrait[] = [
  {
    title: "Versión positiva",
    description:
      "Logo en color completo sobre fondos oscuros, para máximo contraste.",
  },
  {
    title: "Versión negativa",
    description:
      "Logo en color completo sobre fondos claros o fotográficos, para legibilidad clara.",
  },
  {
    title: "Escala de grises",
    description:
      "Aplicación en tonos grises, para impresión sin color o documentos en blanco y negro.",
  },
  {
    title: "Sobre fotografía",
    description:
      "Aplicación específica sobre fondos fotográficos, asegurando legibilidad y contraste con la imagen.",
  },
]

/** Usos Incorrectos.md — Manual P18-19. Siete prohibiciones. */
export const usosIncorrectos: BrandTrait[] = [
  {
    title: "No rotar",
    description:
      "El ángulo de los vértices del rombo y la dirección de la flecha son fijos.",
  },
  {
    title: "No añadir degradados",
    description: "Se utiliza color sólido únicamente.",
  },
  {
    title: "No invertir los colores",
    description:
      "Se utilizan solo las versiones de color documentadas en el manual.",
  },
  {
    title: "No modificar las proporciones",
    description:
      "Nunca distorsionar, estirar o comprimir el logo: mantiene su relación de aspecto original.",
  },
  {
    title: "No separar el isologo",
    description: "El símbolo y el texto son una unidad indivisible.",
  },
  {
    title: "No rellenar el isologo",
    description:
      "La estructura interna respeta la construcción original: sin colores ni patrones distintos a los documentados.",
  },
  {
    title: "No utilizar en trazo",
    description:
      "El logo se presenta siempre en su forma completa, nunca como outline sin relleno.",
  },
]

/** Colores.md — Manual P20-21 + decisión organizacional 2026-07-07. */
export const brandColors: BrandColor[] = [
  {
    name: "Negro JDH",
    hex: "#1D1D1B",
    rgb: "29, 29, 27",
    cmyk: "0, 0, 0, 100",
    role: "principal",
    note: "Nunca negro puro. Estructura el chrome de toda la interfaz web.",
  },
  {
    name: "Blanco JDH",
    hex: "#FFFFFF",
    rgb: "255, 255, 255",
    cmyk: "0, 0, 0, 0",
    role: "principal",
    note: "El espacio en blanco es un componente activo, no un sobrante.",
  },
  {
    name: "Azul corporativo",
    hex: "#16304E",
    rgb: "22, 48, 78",
    cmyk: "99, 79, 41, 40",
    role: "derivada",
    note: "Vive únicamente en el logo. Excluido de la interfaz web (DESIGN.md §1).",
  },
]

/** Tipografía.md — Centrale Sans, cuatro pesos. */
export const tipografiaPesos: TypeWeight[] = [
  { name: "Light", weight: 300, usage: "Párrafos de bajo peso visual" },
  { name: "Regular", weight: 400, usage: "Texto corporal estándar" },
  { name: "Medium", weight: 500, usage: "Subtítulos y énfasis moderado" },
  { name: "Bold", weight: 700, usage: "Titulares y énfasis fuerte" },
]

/** Tipografía.md — aplicación recomendada por jerarquía. */
export const tipografiaJerarquia: BrandTrait[] = [
  { title: "Títulos", description: "Bold o Medium" },
  { title: "Subtítulos", description: "Medium o Regular" },
  { title: "Párrafos / body copy", description: "Regular o Light" },
]

/** 03 - Communication — Manual P27-28. */
export const comunicacionCanales: BrandTrait[] = [
  {
    title: "Comunicación externa",
    description:
      "Destinada a redes sociales, página web y toda la información que se comparte con clientes, proveedores y terceros. Canales: Instagram, LinkedIn, Facebook, web corporativa y publicidad externa.",
  },
  {
    title: "Comunicación interna",
    description:
      "Destinada a los colaboradores: información de recursos humanos (beneficios, políticas, novedades de personal) e información corporativa (logros, iniciativas, dirección estratégica) que refuerza la cultura organizacional.",
  },
]

/** Fotografía.md (🟡 derivado) — cuatro categorías observadas. */
export const fotografiaCategorias: BrandTrait[] = [
  {
    title: "Equipo y personas",
    description:
      "Retratos y planos medios de colaboradores en entornos reales (no estudio), luz natural cálida y expresión genuina. Transmite cercanía humana directa.",
  },
  {
    title: "Cliente y experiencia",
    description:
      "Comensales en el momento de consumo, plano medio o ambiental, luz cálida. El foco está en la emoción del momento más que en el producto.",
  },
  {
    title: "Producto y gastronomía",
    description:
      "Platos servidos o preparaciones, alta definición, estilizada y con fondo controlado. Más técnica y comercial que las anteriores.",
  },
  {
    title: "Corporativa e institucional",
    description:
      "Instalaciones propias (centros de distribución) con iluminación dramática y controlada, comunicando escala operativa: «Este es el corazón de JDH».",
  },
]
