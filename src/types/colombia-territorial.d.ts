declare module "colombia-territorial" {
  export interface ColombiaMunicipio {
    nombre: string;
    codigo_dane: string;
  }

  export interface ColombiaDepartamento {
    nombre: string;
    codigo_dane: string;
    capital: string;
    municipios: ColombiaMunicipio[];
  }

  export function getDepartamentos(): ColombiaDepartamento[];
  export function getMunicipios(departamento: string): ColombiaMunicipio[];
}
