export interface PqrsfRequestType {
  id: string;
  code: string;
  name: string;
  allows_reason: boolean;
  allows_attachments: boolean;
}

export interface PqrsfSite {
  id: string;
  code: string;
  name: string;
}

export interface PqrsfCatalog {
  request_types: PqrsfRequestType[];
  sites: PqrsfSite[];
}

export interface PqrsfFormValues {
  request_type_id: string;
  site_id: string;
  full_name: string;
  business_name: string;
  nit: string;
  address: string;
  department: string;
  city: string;
  email: string;
  description: string;
  reason: string;
}

export interface PqrsfSubmission extends Omit<PqrsfFormValues, "reason"> {
  reason?: string;
  images?: File[];
}

export interface PqrsfReceipt {
  id: string;
  reference: string;
  created_at: string;
}

export type PqrsfTextField = keyof PqrsfFormValues;
export type PqrsfErrorField = PqrsfTextField | "images";
