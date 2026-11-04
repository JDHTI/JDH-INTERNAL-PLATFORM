/**
 * Placeholder rows for the DataTable showcase (documents + directory). These
 * mirror the columns in the Claude Design mockup. Temporary: real data comes
 * from each module's `server/queries.ts`.
 */

export interface MockDocumentRow {
  id: string
  name: string
  category: string
  area: string
  updatedAt: string
}

export const mockDocumentRows: MockDocumentRow[] = [
  {
    id: "d1",
    name: "Política de seguridad de la información",
    category: "Políticas",
    area: "TI",
    updatedAt: "2026-07-15",
  },
  {
    id: "d2",
    name: "Reglamento interno de trabajo",
    category: "Reglamentos",
    area: "Gestión Humana",
    updatedAt: "2026-06-30",
  },
  {
    id: "d3",
    name: "Formato de solicitud de vacaciones",
    category: "Formatos",
    area: "Gestión Humana",
    updatedAt: "2026-06-12",
  },
  {
    id: "d4",
    name: "Manual de marca corporativa",
    category: "Manuales",
    area: "Mercadeo",
    updatedAt: "2026-05-28",
  },
  {
    id: "d5",
    name: "Código de conducta y ética",
    category: "Políticas",
    area: "Jurídica",
    updatedAt: "2026-05-10",
  },
]

export interface MockPersonRow {
  id: string
  name: string
  role: string
  sede: string
  email: string
}

export const mockPersonRows: MockPersonRow[] = [
  {
    id: "p1",
    name: "Ana Restrepo",
    role: "Analista de TI",
    sede: "Medellín",
    email: "ana.restrepo@jdh.com.co",
  },
  {
    id: "p2",
    name: "Carlos Muñoz",
    role: "Coordinador de Logística",
    sede: "Bogotá",
    email: "carlos.munoz@jdh.com.co",
  },
  {
    id: "p3",
    name: "Diana Gómez",
    role: "Jefe de Gestión Humana",
    sede: "Medellín",
    email: "diana.gomez@jdh.com.co",
  },
  {
    id: "p4",
    name: "Esteban Ríos",
    role: "Ejecutivo Comercial",
    sede: "Cartagena",
    email: "esteban.rios@jdh.com.co",
  },
  {
    id: "p5",
    name: "Felipe Ángel",
    role: "Auxiliar Administrativo",
    sede: "Armenia",
    email: "felipe.angel@jdh.com.co",
  },
]
